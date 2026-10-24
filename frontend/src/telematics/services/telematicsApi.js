import { ALERT_TITLES, alertSeverity } from "./alertMetadata";
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
    "records",
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
  const age = position?.eventDateTime
    ? (Date.now() - new Date(position.eventDateTime).getTime()) / 60000
    : Infinity;
  const valid =
    Number.isFinite(position?.latitude) &&
    Number.isFinite(position?.longitude) &&
    Math.abs(position.latitude) <= 90 &&
    Math.abs(position.longitude) <= 180;
  const stale =
    !!position?.isStale || !Number.isFinite(age) || age > 15 || age < -2;
  return {
    ...normalize(row),
    plate: row.registrationNumber,
    model: row.model || row.make || "Model unavailable",
    status: !position
      ? "unknown"
      : stale || position.state === "OFFLINE"
        ? "offline"
        : position.speed > 0
          ? "moving"
          : position.ignition === true
            ? "idling"
            : "stopped",
    telemetryRegistration:
      position?.registrationNumber ||
      row.fleetEdgeRegistration ||
      row.registrationNumber,
    courseDegrees: position?.courseDegrees ?? null,
    speed: position?.speed ?? null,
    isStale: stale,
    source:
      rule?.source === "PHONE_GPS"
        ? "phone"
        : rule?.source === "LAST_KNOWN"
          ? "lastKnown"
          : position
            ? "truck"
            : null,
    updatedAt: position?.eventDateTime || null,
    coordinates: valid
      ? { latitude: position.latitude, longitude: position.longitude }
      : null,
    location:
      rule?.label ||
      (valid
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

export function describeApiError(error) {
  const status = error.response?.status;
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403)
    return "You do not have access to this data in the selected branch.";
  if (status === 404)
    return "This feature is not available on the connected server.";
  if (status === 400)
    return "The request could not be processed. Refresh and try again.";
  if (status >= 500)
    return "The server is temporarily unavailable. Please retry.";
  if (error.code === "ECONNABORTED")
    return "The request timed out. Please retry.";
  return error.message || "Could not connect to the server. Please retry.";
}

export function createTelematicsApi({
  baseURL,
  token,
  user,
  audience,
  onUnauthorized,
}) {
  if (!baseURL || !token || !user?._id)
    throw new Error("Sign in again to connect to the server.");
  // Preserve a reverse-proxy prefix such as /v1, matching the existing login helper.
  const apiRoot = appLoginUrl(baseURL).replace(/\/app\/v1\/auth\/login$/, "");
  const client = axios.create({
    baseURL: apiRoot,
    timeout: 20000,
    headers: { Authorization: `Bearer ${token}` },
  });
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401)
        Promise.resolve(onUnauthorized?.()).catch(() => {});
      if (error.response) {
        console.warn("API request failed", {
          path: error.config?.url,
          status: error.response.status,
          message: error.response.data?.message,
        });
        error.message = describeApiError(error);
      }
      return Promise.reject(error);
    },
  );
  const queries = {
    "/vehicles": { limit: 100 },
    "/auto-trips": { limit: 100 },
    "/fuel-logs": { limit: 100 },
    "/driver/incidents": { limit: 100 },
    "/support-tickets": { limit: 100 },
    "/branches": { limit: 100 },
    "/alert-inbox": { status: "ALL" },
  };
  const get = async (path, config) => (await client.get(path, config)).data;
  const post = async (path, body) => (await client.post(path, body)).data;
  const mapList = async (path, convert = normalize, branchId) =>
    rows(
      await get(path, {
        params: queries[path],
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
          if (error.response?.status === 401) throw error;
          errors[key] = describeApiError(error);
        }
      }),
    );
    let duty = null;
    try {
      duty = (await get("/driver/duty-status")).data;
    } catch (error) {
      errors.duty = describeApiError(error);
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
  const headersFor = (branchId) =>
    branchId ? { "X-Branch-Id": branchId } : {};
  async function listOwnerAlerts({
    branchId,
    page = 1,
    acknowledged,
    vehicle,
    type,
    from,
    to,
  } = {}) {
    const payload = (
      await get("/owner-alerts", {
        params: { page, limit: 30, acknowledged, vehicle, type, from, to },
        headers: headersFor(branchId),
      })
    ).data;
    if (!Array.isArray(payload?.records) || !Number.isFinite(payload.total))
      throw new Error("Invalid owner alerts response.");
    return {
      ...payload,
      records: payload.records.map((row) => ({
        ...normalize(row),
        title:
          ALERT_TITLES[row.type] ||
          row.type?.replace(/_/g, " ") ||
          "Fleet alert",
        description: row.message,
        vehicleNumber: row.vehicleNumber,
        acknowledged: !!row.acknowledged,
        severity: alertSeverity(row.type),
        createdAt: row.at,
      })),
    };
  }
  async function listPositions(branchId) {
    const payload = (
      await get("/livetracking/positions", { headers: headersFor(branchId) })
    ).data;
    if (!Array.isArray(payload?.records))
      throw new Error("Invalid live position response.");
    return payload.records;
  }
  const plateKey = (plate) =>
    String(plate || "")
      .replace(/[^a-z0-9]/gi, "")
      .toUpperCase();
  function mergePositions(vehicles, positions) {
    const used = new Set();
    const merged = vehicles.map((vehicle) => {
      const candidates = positions.filter(
        (point) =>
          vehicle.chassisNumber &&
          point.vin &&
          plateKey(vehicle.chassisNumber) === plateKey(point.vin),
      );
      const matches = candidates.length
        ? candidates
        : positions.filter((point) =>
            [vehicle.registrationNumber, vehicle.fleetEdgeRegistration].some(
              (plate) =>
                plate && plateKey(plate) === plateKey(point.registrationNumber),
            ),
          );
      const point = matches.sort(
        (a, b) =>
          new Date(b.eventDateTime || 0) - new Date(a.eventDateTime || 0),
      )[0];
      if (point) used.add(point);
      return vehicleView(vehicle, point || null);
    });
    // The positions API already limits rows to registered/authorized trucks.
    // Keep real positions even when a master-list page does not contain the truck.
    for (const point of positions)
      if (!used.has(point))
        merged.push(
          vehicleView(
            {
              id: `position:${point.registrationNumber}`,
              registrationNumber: point.registrationNumber,
              chassisNumber: point.vin,
            },
            point,
          ),
        );
    return merged;
  }
  async function loadFleet(branchId) {
    const data = Object.fromEntries(resources.map((key) => [key, []]));
    const errors = {};
    const jobs = {
      vehicles: () => mapList("/vehicles", normalize, branchId),
      trips: () => mapList("/auto-trips", tripView, branchId),
      fuel: () => mapList("/fuel-logs", fuelView, branchId),
      positions: () => listPositions(branchId),
      alertFeed: () => listOwnerAlerts({ branchId }),
    };
    await Promise.all(
      Object.entries(jobs).map(async ([key, request]) => {
        try {
          data[key] = await request();
        } catch (error) {
          if (error.response?.status === 401) throw error;
          errors[key] = describeApiError(error);
        }
      }),
    );
    data.vehicles = mergePositions(data.vehicles, data.positions || []);
    data.alerts = data.alertFeed?.records || [];
    if (errors.alertFeed) errors.alerts = errors.alertFeed;
    delete errors.alertFeed;
    data.errors = errors;
    data.unavailable = [
      "Driver roster",
      "Assignments",
      "Documents",
      "Workshop bills",
      "Reviews",
      "AdBlue",
    ];
    return data;
  }
  return {
    loadDriver,
    loadFleet,
    listOwnerAlerts,
    listPositions,
    mergePositions,
    async getTrail(registration, { branchId, from, to } = {}) {
      const payload = (
        await get(
          `/livetracking/positions/${encodeURIComponent(registration)}/trail`,
          { params: { from, to, limit: 2000 }, headers: headersFor(branchId) },
        )
      ).data;
      if (!Array.isArray(payload?.points))
        throw new Error("Invalid trail response.");
      return payload;
    },
    async branches() {
      return mapList("/branches");
    },
    async acknowledgeAlert(id, { branchId } = {}) {
      if (audience === "driver")
        return unavailable("Driver alert acknowledgement");
      return (
        await client.put(
          `/owner-alerts/${encodeURIComponent(id)}/ack`,
          {},
          { headers: headersFor(branchId) },
        )
      ).data;
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
