import axios from "axios";
import { appLoginUrl } from "./authEndpoint";

export const recordId = (value) => {
  const id = value && typeof value === "object" ? value._id || value.id : value;
  return id == null ? null : String(id);
};
function rows(payload) {
  const value = payload?.data ?? payload;
  if (Array.isArray(value)) return value;
  for (const key of [
    "items",
    "results",
    "tickets",
    "documents",
    "vehicles",
    "drivers",
    "alerts",
    "logs",
  ]) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  throw new Error("The server returned an unsupported list response.");
}
const normalize = (row) => ({
  ...row,
  id: recordId(row),
  vehicleId: recordId(row.vehicleId),
  driverId: recordId(row.driverId),
  branchId: recordId(row.branchId),
});
function vehicleView(row, position = row.position, rule = row.locationRule) {
  return {
    ...normalize(row),
    plate: row.registrationNumber,
    model: row.model || row.make || "Model unavailable",
    status: position
      ? position.ageMinutes > 15
        ? "offline"
        : position.speed > 0
          ? "moving"
          : "stopped"
      : "unknown",
    source:
      rule?.source === "PHONE_GPS"
        ? "phone"
        : rule?.source === "LAST_KNOWN"
          ? "lastKnown"
          : position
            ? "truck"
            : null,
    updatedAt: position?.eventDateTime || null,
    coordinates: position
      ? { latitude: position.latitude, longitude: position.longitude }
      : null,
    location:
      rule?.label ||
      (position
        ? `${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`
        : "Location unavailable"),
    odometerKm: row.odometerReading ?? null,
  };
}
function tripView(row) {
  const drop = row.extraDrops?.[row.extraDrops.length - 1] || row.drop;
  return {
    ...normalize(row),
    from: row.pickup?.name || "Origin unavailable",
    to: drop?.name || drop?.areaName || "Destination unavailable",
    distanceKm: row.distanceKm ?? row.km?.laden ?? null,
    startedAt: row.pickup?.departedAt || row.pickup?.arrivedAt || row.createdAt,
    status: row.status || "Unknown",
  };
}
const fuelView = (row) => ({
  ...normalize(row),
  tripId: recordId(row.autoTripId),
  station: row.location || "Fuel entry",
  litres: row.litres,
  amountInr:
    row.totalAmount ??
    (row.litres != null && row.rate != null ? row.litres * row.rate : null),
  status: row.reviewStatus || row.status || "Recorded",
});
const resources = [
  "vehicles",
  "drivers",
  "trips",
  "alerts",
  "fuel",
  "documents",
  "issues",
  "bills",
  "support",
  "stops",
  "stopNotes",
  "adblue",
];
const unavailable = (name) => {
  throw new Error(`${name} is not connected yet.`);
};

export function createTelematicsApi({ baseURL, token, user, audience }) {
  if (!baseURL || !token || !user?._id)
    throw new Error("Sign in again to connect to the server.");
  // Preserve a reverse-proxy prefix such as /v1, matching the existing login helper.
  const apiRoot = appLoginUrl(baseURL).replace(/\/app\/v1\/auth\/login$/, "");
  const client = axios.create({
    baseURL: apiRoot,
    timeout: 20000,
    headers: { Authorization: `Bearer ${token}` },
  });
  const get = async (path, config) => (await client.get(path, config)).data;
  const post = async (path, body) => (await client.post(path, body)).data;
  const mapList = async (path, convert = normalize, branchId) =>
    rows(
      await get(path, {
        params: { limit: 100 },
        headers: branchId ? { "X-Branch-Id": branchId } : {},
      }),
    ).map(convert);
  async function loadDriver() {
    const linked = (await get("/driver/me/vehicle")).data;
    if (!linked || !Object.prototype.hasOwnProperty.call(linked, "vehicle"))
      throw new Error("Invalid driver vehicle response.");
    const vehicle = linked.vehicle
      ? vehicleView(linked.vehicle, linked.position, linked.locationRule)
      : null;
    const data = Object.fromEntries(resources.map((key) => [key, []]));
    const errors = {};
    const jobs = {
      trips: () => mapList("/auto-trips", tripView),
      fuel: () => mapList("/fuel-logs", fuelView),
      issues: () =>
        mapList("/driver/incidents", (row) => ({
          ...normalize(row),
          title: row.note || row.type,
        })),
      support: () =>
        mapList("/support-tickets", (row) => ({
          ...normalize(row),
          title: row.subject,
        })),
      documents: () =>
        vehicle
          ? mapList(`/vehicles/${vehicle.id}/documents`, (row) => ({
              ...normalize(row),
              vehicleId: vehicle.id,
              title: row.documentType || row.type || row.name || "Document",
              expiresAt: row.expiryDate,
            }))
          : Promise.resolve([]),
    };
    await Promise.all(
      Object.entries(jobs).map(async ([key, request]) => {
        try {
          data[key] = await request();
        } catch (error) {
          errors[key] = error.response?.data?.message || error.message;
        }
      }),
    );
    let duty = null;
    try {
      duty = (await get("/driver/duty-status")).data;
    } catch (error) {
      errors.duty = error.response?.data?.message || error.message;
    }
    data.driver = {
      ...normalize(user),
      name:
        user.name || [user.firstName, user.lastName].filter(Boolean).join(" "),
      vehicleId: vehicle?.id,
      drivingMinutes: duty?.drivingMinutesToday ?? null,
      limitMinutes: duty?.dailyLimitMinutes ?? null,
      state: duty?.state || "Unavailable",
    };
    data.vehicle = vehicle;
    data.vehicles = vehicle ? [vehicle] : [];
    data.drivers = [data.driver];
    data.duty = duty;
    data.errors = errors;
    data.unavailable = [
      "Driver alerts",
      "Personal documents",
      "Workshop bills",
      "Stop notes",
      "Phone tracking",
      "Change truck",
    ];
    return data;
  }
  async function loadFleet(branchId) {
    const data = Object.fromEntries(resources.map((key) => [key, []]));
    const errors = {};
    const jobs = {
      vehicles: () => mapList("/vehicles", (row) => vehicleView(row), branchId),
      trips: () => mapList("/auto-trips", tripView, branchId),
      fuel: () => mapList("/fuel-logs", fuelView, branchId),
      alerts: () =>
        mapList(
          "/alert-inbox?status=ALL",
          (row) => ({
            ...normalize(row),
            title: row.title || row.type,
            description: row.message || row.description,
            acknowledged: !!row.acknowledgedAt,
            severity: row.severity?.toLowerCase(),
          }),
          branchId,
        ),
    };
    await Promise.all(
      Object.entries(jobs).map(async ([key, request]) => {
        try {
          data[key] = await request();
        } catch (error) {
          errors[key] = error.response?.data?.message || error.message;
        }
      }),
    );
    data.errors = errors;
    data.unavailable = [
      "Driver roster",
      "Assignments",
      "Documents",
      "Workshop bills",
      "Reviews",
      "AdBlue",
      "Live positions",
    ];
    return data;
  }
  return {
    loadDriver,
    loadFleet,
    async branches() {
      return mapList("/branches");
    },
    async acknowledgeAlert(id) {
      if (audience === "driver")
        return unavailable("Driver alert acknowledgement");
      return (await client.put(`/alert-inbox/${encodeURIComponent(id)}/ack`))
        .data;
    },
    assignTruck() {
      return unavailable("Location-verified truck pairing");
    },
    handoverTruck() {
      return unavailable("Truck handover");
    },
    review() {
      return unavailable("Review submission");
    },
    async submit(resource, values) {
      if (resource === "fuel")
        return post("/driver/me/fuel-logs", {
          vehicleId: values.vehicleId,
          autoTripId: values.tripId || undefined,
          station: values.station,
          litres: values.litres,
          amountInr: values.amountInr,
        });
      if (resource === "support")
        return post("/support-tickets", {
          subject: values.title.slice(0, 150),
          description: values.title,
          category: "OTHER",
          priority: "MEDIUM",
          vehicleId: values.vehicleId || undefined,
        });
      if (resource === "issues")
        return post("/driver/incidents", {
          type: "BREAKDOWN",
          note: values.title,
          reportedAt: new Date().toISOString(),
        });
      return unavailable(
        resource === "fuel"
          ? "Fuel submission (assignment and trip validation pending)"
          : "This submission",
      );
    },
  };
}
