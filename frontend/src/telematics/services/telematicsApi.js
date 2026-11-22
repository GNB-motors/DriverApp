import { ALERT_TITLES, alertSeverity } from "./alertMetadata";
import axios from "axios";
import { appLoginUrl } from "./authEndpoint";
import { APP_VERSION, newIdempotencyKey } from "./appIdentity";
import { driverBillsInr } from "./ownerReport";

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
export async function collectPages(fetchPage, limit = 100) {
  const result = [];
  const seen = new Set();
  for (let page = 1; page <= 1000; page++) {
    const payload = await fetchPage(page, limit);
    const batch = rows(payload);
    const value = payload?.data ?? payload;
    const meta = payload?.meta || value?.meta || value?.pagination || {};
    const total = value?.total ?? meta.total;
    if (!batch.length) {
      if (Number.isFinite(total) && result.length < total) throw new Error('The list changed while loading. Please refresh.');
      return result;
    }
    const signature = JSON.stringify(batch.map((row) => recordId(row) || row));
    if (seen.has(signature)) throw new Error('The server repeated a page. Please refresh.');
    seen.add(signature); result.push(...batch);
    if (Number.isFinite(total) ? result.length >= total : batch.length < limit) return result;
    if (meta.totalPages && page >= meta.totalPages) return result;
  }
  throw new Error('This list is too large to load. Narrow the view.');
}
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
    position?.isStale === true || !Number.isFinite(age) || age > (position?.freshMinutes ?? 15) || age < -2;

  const fuelLitres =
    position?.primaryFuelLevel ??
    position?.fuel?.value ??
    position?.readings?.fuelLitres?.value ??
    row.primaryFuelLevel ??
    row.fuelLitres ??
    null;
  const fuelUnit =
    position?.fuelLevelUnit ||
    position?.fuel?.unit ||
    (position?.primaryFuelLevel != null ? 'L' : null);
  const fuelPercent =
    position?.fuelPercent ??
    (row.tankCapacityLitres && fuelLitres != null
      ? Math.min(100, Math.round((fuelLitres / row.tankCapacityLitres) * 100))
      : null);

  const odometerKm =
    position?.odometer ??
    position?.readings?.odometerKm?.value ??
    row.odometerReading ??
    row.odometerKm ??
    null;
  const todayKm =
    position?.todayKm ??
    position?.dailyKm ??
    row.todayKm ??
    null;

  const silentForMin =
    position?.silentForMin ??
    (position?.eventDateTime
      ? Math.max(0, Math.floor((Date.now() - new Date(position.eventDateTime).getTime()) / 60000))
      : null);

  const address =
    position?.address ||
    rule?.label ||
    row.address ||
    null;

  const isSubscriptionExpired = Boolean(
    position?.isSubscriptionExpired ||
    row.isSubscriptionExpired ||
    row.subscriptionExpired ||
    row.subscriptionStatus === 'expired' ||
    row.subscriptionStatus === 'EXPIRED' ||
    (row.subscriptionExpiresAt && new Date(row.subscriptionExpiresAt).getTime() < Date.now())
  );

  const missingDocTypes = row.missingDocTypes || [];
  const documents = row.documents || [];
  const documentsCount = documents.length;

  return {
    ...normalize(row),
    plate: row.registrationNumber || position?.registrationNumber,
    model: row.model || row.make || position?.vehicle?.model || "Model unavailable",
    manufacturer: row.manufacturer || position?.vehicle?.manufacturer || null,
    status: !position || !Number.isFinite(age) || age < -2
      ? "unknown"
      : stale || position.state === "OFFLINE"
        ? "offline"
        : !Number.isFinite(position.speed) ? 'unknown' : position.speed > 0
          ? "moving"
          : position.ignition === true
            ? "idling"
            : position.ignition === false ? 'stopped' : 'unknown',
    telemetryRegistration:
      position?.registrationNumber ||
      row.fleetEdgeRegistration ||
      row.registrationNumber,
    courseDegrees: position?.headingDeg ?? position?.courseDegrees ?? null,
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
    updatedAt: position?.eventDateTime || row.updatedAt || null,
    eventDateTime: position?.eventDateTime || null,
    coordinates: valid
      ? { latitude: position.latitude, longitude: position.longitude }
      : null,
    address,
    detailedAddress: address,
    location:
      address ||
      rule?.label ||
      (valid
        ? `${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}`
        : "Location unavailable"),
    odometerKm,
    todayKm,
    fuelLitres,
    fuelUnit,
    fuelPercent,
    silentForMin,
    driver: position?.driver || row.driver || null,
    driverId: position?.driver?.id || row.driverId || null,
    isSubscriptionExpired,
    missingDocTypes,
    documents,
    documentsCount,
    rawPosition: position || null,
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
  if (status === 426) {
    const min = error.response?.data?.data?.minAppVersion;
    return `Update DriverApp to use this screen${min ? ` (version ${min} or newer is needed)` : ""}. Nothing was saved.`;
  }
  if (status === 403)
    return "You do not have access to this data in the selected branch.";
  if (status === 404)
    return "This feature is not available on the connected server.";
  if (status === 409 || status === 422)
    return (
      error.response?.data?.message ||
      "The current location or assignment no longer qualifies. Try again."
    );
  if (status === 400)
    return error.response?.data?.message || "The request could not be processed. Refresh and try again.";
  if (status === 413) return "Choose a file smaller than 10 MB.";
  if (status === 415)
    return "Choose a JPEG, PNG, WebP, HEIC image or PDF file.";
  if (status >= 500)
    return "The server is temporarily unavailable. Please retry.";
  if (error.code === "ECONNABORTED")
    return "The request timed out. Please retry.";
  return error.message || "Could not connect to the server. Please retry.";
}

// v2 writes are refused without this header. A saved draft passes its own
// clientRequestId so a retry of the same submission replays instead of repeating.
const idempotent = (key) => ({ "Idempotency-Key": key || newIdempotencyKey() });

const CREW_ACTION_FIELDS = ["action", "targetDriverId", "proposalId", "clientRequestId", "note", "memberIds"];

// GET /app/v2/crew/:vehicleId nests the card ({ vehicle, crew, members, atWheel });
// the crew screens read one flat card, so the API shape is adapted here only.
export function crewCard(detail, now = Date.now()) {
  if (!detail?.vehicle) return null;
  const crew = detail.crew || {};
  const accepted = new Set((crew.acceptedIds || []).map(String));
  const pending = crew.pending;
  return {
    vehicle: {
      _id: detail.vehicle.vehicleId,
      registrationNumber: detail.vehicle.registrationNumber,
      branchId: detail.vehicle.branchId,
    },
    status: crew.status || "UNKNOWN",
    currentDriverId: crew.currentDriverId || null,
    version: crew.version ?? null,
    pending: pending
      ? { ...pending, expired: !!pending.expiresAt && new Date(pending.expiresAt).getTime() < now }
      : null,
    members: (detail.members || []).map((member) => ({
      _id: member.driverId,
      name: member.name,
      status: member.status,
      accepted: accepted.has(String(member.driverId)),
    })),
    intervals: (detail.atWheel?.intervals || []).map((row) => ({
      _id: `${row.driverId}:${row.start}`,
      driverId: row.driverId,
      startAt: row.start,
      endAt: row.end,
      status: row.status,
    })),
  };
}

function adaptWebOwnerReport(webReport) {
  if (!webReport) return null;
  const sectionsList = Array.isArray(webReport.sections) ? webReport.sections : [];
  const byId = {};
  for (const s of sectionsList) {
    if (s?.id) byId[s.id] = s;
  }
  const work = byId.yesterdaysWork?.numbers || {};
  const money = byId.moneyOut?.numbers || {};
  const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const metric = (value, unit) => ({ value, unit });
  const bills = driverBillsInr(money);
  // Keys match what /owner-report really sends (ownerReport.sections.js yesterdaysWork /
  // moneyOut). "Trips marked complete" is the completed count, never the started count.
  return {
    generatedAt: webReport.generatedAt || new Date().toISOString(),
    sections: {
      trips: {
        status: work.trips != null ? 'ok' : 'empty',
        metrics: {
          count: metric(num(work.completedTrips), 'records'),
          started: metric(num(work.trips), 'records'),
          ladenKm: metric(num(work.km), 'km'),
        },
      },
      diesel: {
        status: money.dieselBillInr != null ? 'ok' : 'empty',
        metrics: {
          amount: metric(num(money.dieselBillInr), 'INR'),
          litres: metric(num(money.dieselBillLitres), 'L'),
        },
      },
      expenses: {
        status: bills != null ? 'ok' : 'empty',
        metrics: {
          amount: metric(bills, 'INR'),
          pending: metric(num(money.expensePendingCount), 'records'),
        },
      },
      ...byId,
    },
  };
}

export function createTelematicsApi({
  baseURL,
  token,
  user,
  audience,
  onUnauthorized,
  orgId,
}) {
  if (!baseURL || !token || !user?._id)
    throw new Error("Sign in again to connect to the server.");
  // Preserve a reverse-proxy prefix such as /v1, matching the existing login helper.
  const apiRoot = appLoginUrl(baseURL).replace(/\/app\/v1\/auth\/login$/, "");
  const client = axios.create({
    baseURL: apiRoot,
    timeout: 20000,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(orgId && { 'X-Org-Id': orgId }),
      ...(APP_VERSION && { 'X-App-Version': APP_VERSION }),
    },
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
  const cleanBranchId = (id) => (!id || id === 'all' || id === 'ALL' ? undefined : id);
  const get = async (path, config) => (await client.get(path, config)).data;
  const post = async (path, body) => (await client.post(path, body)).data;
  const mapList = async (path, convert = normalize, branchId) => {
    const clean = cleanBranchId(branchId);
    return (await collectPages((page, limit) => get(path, {
        params: { ...queries[path], page, limit },
        headers: clean ? { "X-Branch-Id": clean } : {},
      }))).map(convert);
  };
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
      fuel: async () => (await workflowList("fuel")).items.map(fuelView),
      issues: () =>
        mapList("/driver/incidents", (row) => ({
          ...normalize(row),
          title: row.report?.note || row.type,
        })),
      support: async () =>
        (await workflowList("support")).items.map((row) => ({
          ...normalize(row),
          title: row.subject,
        })),
      bills: async () =>
        (await workflowList("bills")).items.map((row) => ({
          ...normalize(row),
          title: "Workshop bill",
          status: row.scanStatus,
        })),
      documents: async () =>
        (await workflowList("documents", 1, "personal")).items.map(normalize),
      alerts: async () => {
        const payload = await listDriverAlerts();
        data.unreadCount = payload.unreadCount;
        return payload.items;
      },
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
    data.unavailable = ["Stop notes"];
    return data;
  }
  async function listDriverAlerts({ page = 1, unread = false } = {}) {
    const payload = (await get('/driver/alerts', { params: { page, limit: 30, ...(unread && { unread: true }) } })).data;
    if (!Array.isArray(payload?.items) || !Number.isFinite(payload.total) || !Number.isFinite(payload.unreadCount)) throw new Error('Invalid driver inbox response.');
    return { ...payload, items: payload.items.map((row) => ({ ...normalize(row), description: row.message, acknowledged: !!row.acknowledgedAt })) };
  }
  const headersFor = (branchId) => {
    const clean = cleanBranchId(branchId);
    return clean ? { "X-Branch-Id": clean } : {};
  };
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
      ...(audience !== 'owner' && { summary: async () => (await get("/fleet/workflows/summary", { headers: headersFor(branchId) })).data }),
      vehicles: () => mapList("/vehicles", normalize, branchId),
      trips: async () => audience === 'owner' ? rows(await get('/auto-trips', { params: { page: 1, limit: 30 }, headers: headersFor(branchId) })).map(tripView) : mapList('/auto-trips', tripView, branchId),
      fuel: () => audience === 'owner' ? Promise.resolve([]) : mapList('/fuel-logs', fuelView, branchId),
      drivers: async () =>
        (await collectPages((page, limit) => get("/fleet/workflows/drivers", {
            params: { page, limit },
            headers: headersFor(branchId),
          }))).map((row) => ({
          ...normalize(row),
          name: [row.firstName, row.lastName].filter(Boolean).join(" "),
          vehicleId: recordId(row.assignment?.vehicleId),
          state: "Unavailable",
          drivingMinutes: null,
        })),
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

    // 1. Compute today's km from trips for each vehicle if todayKm not directly on telemetry
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTime = todayStart.getTime();
    for (const v of data.vehicles) {
      if (v.todayKm == null && Array.isArray(data.trips)) {
        const vehicleTripsToday = data.trips.filter((t) => {
          const tripVehicleId = t.vehicleId || t.vehicle?._id || t.vehicle;
          const tripPlate = t.registrationNumber || t.plate;
          const matches =
            tripVehicleId === v.id ||
            (tripPlate && plateKey(tripPlate) === plateKey(v.plate));
          const tTime = t.startedAt ? new Date(t.startedAt).getTime() : 0;
          return matches && tTime >= todayStartTime;
        });
        if (vehicleTripsToday.length > 0) {
          v.todayKm = vehicleTripsToday.reduce(
            (sum, t) => sum + (Number(t.distanceKm) || 0),
            0,
          );
        }
      }
    }

    // 2. Batch-resolve place names for all vehicles with coordinates
    const pointsToResolve = data.vehicles
      .filter((v) => v.coordinates && !v.address)
      .map((v) => ({
        key: `${v.coordinates.latitude.toFixed(4)},${v.coordinates.longitude.toFixed(4)}`,
        lat: v.coordinates.latitude,
        lng: v.coordinates.longitude,
      }));
    if (pointsToResolve.length > 0) {
      try {
        const res = await post("/places/resolve", {
          points: pointsToResolve.slice(0, 100),
        });
        const places = res.data?.places || res.data?.data?.places || {};
        for (const v of data.vehicles) {
          if (v.coordinates && !v.address) {
            const k = `${v.coordinates.latitude.toFixed(4)},${v.coordinates.longitude.toFixed(4)}`;
            const p = places[k];
            if (p) {
              const addr = [p.label, p.sub].filter(Boolean).join(", ");
              if (addr) {
                v.address = addr;
                v.location = addr;
                v.detailedAddress = addr;
              }
            }
          }
        }
      } catch {
        // network or server error graceful fallback
      }
    }
    if (data.summary?.analyticsError) errors.analytics = data.summary.analyticsError;
    data.adblue = data.fuel.filter((row) => row.fuelType === "ADBLUE");
    data.fuel = data.fuel.filter((row) => row.fuelType !== "ADBLUE");
    data.alerts = data.alertFeed?.records || [];
    if (errors.alertFeed) errors.alerts = errors.alertFeed;
    delete errors.alertFeed;
    data.errors = errors;
    data.unavailable = ["Document and review overview", "AdBlue entry list"];
    return data;
  }
  async function workflowList(kind, page = 1, scope) {
    const payload = (
      await get(`/driver/workflows/${kind}`, {
        params: { page, limit: 30, ...(scope && { scope }) },
      })
    ).data;
    if (!Array.isArray(payload?.items) || !Number.isFinite(payload.total))
      throw new Error("Invalid workflow list response.");
    return { ...payload, items: payload.items.map(normalize) };
  }
  async function uploadWorkflow(kind, payload, asset, onUploadProgress) {
    const body = new FormData();
    for (const [key, value] of Object.entries(payload))
      if (value !== undefined && value !== null && value !== "")
        body.append(key, String(value));
    if (asset) {
      const field = kind === "incident" ? "files" : "file";
      if (typeof document !== "undefined") {
        const blob = asset.file || (await (await fetch(asset.uri)).blob());
        body.append(
          field,
          blob,
          asset.name || asset.fileName || "attachment.jpg",
        );
      } else
        body.append(field, {
          uri: asset.uri,
          name: asset.name || asset.fileName || "attachment.jpg",
          type: asset.mimeType || "image/jpeg",
        });
    }
    return (
      await client.post(
        kind === "incident" ? "/driver/incidents" : `/driver/workflows/${kind}`,
        body,
        { timeout: 120000, onUploadProgress },
      )
    ).data.data;
  }
  async function uploadErp(path, field, tripId, asset) {
    if (!tripId || !asset) throw new Error('Select a trip and image.');
    const body = new FormData(); body.append('tripId', tripId);
    if (typeof document !== 'undefined') body.append(field, asset.file || await (await fetch(asset.uri)).blob(), asset.name || 'photo.jpg');
    else body.append(field, { uri: asset.uri, name: asset.name || 'photo.jpg', type: asset.mimeType || asset.type || 'image/jpeg' });
    return (await client.post(path, body, { timeout: 120000 })).data.data;
  }
  // Once /app/v2/reports/daily answers 403 for this signed-in role, every later poll
  // goes straight to the /owner-report fallback instead of repeating a refused call.
  // The service is rebuilt per sign-in, so a role or backend change is picked up then.
  let dailyRefused = false;
  // GET /owner-report — the report the web Daily Digest page reads. OWNER and MANAGER
  // (pinned to their branch by the server). Returns { sections: [{ id, state, numbers }] }.
  async function dailyDigest(day, branchId) {
    const res = await get('/owner-report', { params: { day }, headers: headersFor(branchId) });
    const report = res?.data || res;
    if (!Array.isArray(report?.sections)) throw new Error('Invalid daily report response.');
    return report;
  }
  return {
    dailyDigest,
    async ownerDaily(date, branchId) {
      try {
        if (dailyRefused) throw Object.assign(new Error('Daily report not permitted for this role.'), { refused: true });
        return (await get('/app/v2/reports/daily', { params: { date }, headers: headersFor(branchId) })).data;
      } catch (err) {
        if (err?.response?.status === 403) dailyRefused = true;
        try {
          return adaptWebOwnerReport(await dailyDigest(date, branchId));
        } catch {
          // Ignore fallback error
        }
        throw err;
      }
    },
    async ownerRows(params, branchId) { return (await get('/app/v2/reports/rows', { params, headers: headersFor(branchId) })).data; },
    async ownerTrends(date, branchId) { return (await get('/app/v2/reports/trends', { params: { date }, headers: headersFor(branchId) })).data; },
    async ownerRecord(kind, id, branchId) { return (await get(`/app/v2/records/${kind}/${encodeURIComponent(id)}`, { headers: headersFor(branchId) })).data; },
    async ownerDecision(kind, id, body, branchId) { return (await client.post(`/app/v2/records/${kind}/${encodeURIComponent(id)}/actions`, body, { headers: headersFor(branchId) })).data.data; },
    async ownerEscalations(branchId, all = false, page = 1) { return (await get('/app/v2/escalations', { params: { all, page }, headers: headersFor(branchId) })).data; },
    async ownerEscalation(id, branchId, historyPage = 1) { return (await get(`/app/v2/escalations/${encodeURIComponent(id)}`, { params: { historyPage }, headers: headersFor(branchId) })).data; },
    async ownerCalls(branchId, page = 1) { return (await get('/app/v2/calls', { params: { page }, headers: headersFor(branchId) })).data; },
    async ownerStartCall(body, branchId) { return (await client.post('/app/v2/calls', body, { headers: headersFor(branchId) })).data.data; },
    async ownerCallOutcome(id, body, branchId) { return (await client.patch(`/app/v2/calls/${encodeURIComponent(id)}`, body, { headers: headersFor(branchId) })).data.data; },
    async ownerPreferences(body) { return body ? (await client.put('/app/v2/reports/preferences', body)).data.data : (await get('/app/v2/reports/preferences')).data; },
    async ownerAudience(params, branchId) { return (await get('/app/v2/communication/audience', { params, headers: headersFor(branchId) })).data; },
    async conversations(branchId, page = 1) { return (await get('/app/v2/communication/conversations', { params: { page }, headers: headersFor(branchId) })).data; },
    async createConversation(body, branchId) { return (await client.post('/app/v2/communication/conversations', body, { headers: headersFor(branchId) })).data.data; },
    async cancelBroadcast(id, branchId) { return (await client.post(`/app/v2/communication/conversations/${encodeURIComponent(id)}/cancel`, {}, { headers: headersFor(branchId) })).data.data; },
    async updateConversationMembers(id, body, branchId) { return (await client.patch(`/app/v2/communication/conversations/${encodeURIComponent(id)}/members`, body, { headers: headersFor(branchId) })).data.data; },
    async conversationMessages(id, params, branchId) { return (await get(`/app/v2/communication/conversations/${encodeURIComponent(id)}/messages`, { params, headers: headersFor(branchId) })).data; },
    async sendMessage(id, payload, asset, branchId) {
      let body = payload;
      if (asset) {
        body = new FormData();
        for (const [key, value] of Object.entries(payload)) body.append(key, value);
        if (typeof document !== 'undefined') body.append('file', asset.file || await (await fetch(asset.uri)).blob(), asset.name || 'message.jpg');
        else body.append('file', { uri: asset.uri, name: asset.name || 'message.jpg', type: asset.mimeType || 'image/jpeg' });
      }
      return (await client.post(`/app/v2/communication/conversations/${encodeURIComponent(id)}/messages`, body, { timeout: 120000, headers: headersFor(branchId) })).data.data;
    },
    async messageReceipt(id, messageId, action, branchId) { return (await client.post(`/app/v2/communication/conversations/${encodeURIComponent(id)}/messages/${encodeURIComponent(messageId)}/receipt`, { action }, { headers: headersFor(branchId) })).data.data; },
    async driverExplain(alertId, body, branchId) { return (await client.post(`/app/v2/escalations/${encodeURIComponent(alertId)}/explain`, body, { headers: headersFor(branchId) })).data.data; },
    // Realtime SSE stream (N1.13): mint a single-use ticket, then open the
    // event stream at streamBaseUrl?ticket=... (ticket auth, no header needed).
    async streamTicket() {
      if (audience !== 'driver' && user?.role !== 'DRIVER') {
        throw new Error('Stream ticket is only supported for driver sessions.');
      }
      const payload = (await client.post('/app/v2/stream/ticket', {})).data;
      if (!payload?.ticket) throw new Error('Invalid stream ticket response.');
      return payload.ticket;
    },
    streamBaseUrl: `${apiRoot}/app/v2/stream`,
    async defLedger(branchId) {
      try {
        const res = await get('/def-ledger', { headers: headersFor(branchId) });
        return res?.data || res || { vehicles: [], totals: {} };
      } catch {
        return { vehicles: [], totals: {} };
      }
    },
    async myStops() { return rows(await get('/place-intelligence/stops/mine', { params: { days: 14, limit: 50 } })); },
    async explainStop(id, purpose, note) { return (await post(`/place-intelligence/stops/${encodeURIComponent(id)}/reason`, { purpose, ...(note?.trim() && { note: note.trim() }) })).data; },
    async erpTrips(page = 1) { return get('/app/v1/trips', { params: { page, limit: 30 } }); },
    async erpTrip(id) { return (await get(`/app/v1/trips/${encodeURIComponent(id)}`)).data; },
    uploadBilty: (id, asset) => uploadErp('/erp/consignments/upload-bilty', 'bilty', id, asset),
    uploadPod: (id, asset) => uploadErp('/erp/pods/upload', 'pod', id, asset),
    async crewMine() {
      // A driver reads the card of the truck they are linked to. Not being on
      // that truck's crew (403) means there is no crew card yet, not a failure.
      const vehicleId = recordId((await get('/driver/me/vehicle')).data?.vehicle);
      if (!vehicleId) return null;
      try {
        return crewCard((await get(`/app/v2/crew/${encodeURIComponent(vehicleId)}`)).data);
      } catch (error) {
        if (error.response?.status === 403) return null;
        throw error;
      }
    },
    async crewVehicle(vehicleId, branchId) { return crewCard((await get(`/app/v2/crew/${encodeURIComponent(vehicleId)}`, { headers: headersFor(branchId) })).data); },
    async crewAction(vehicleId, body, branchId) {
      const payload = Object.fromEntries(CREW_ACTION_FIELDS.filter((field) => body[field] !== undefined).map((field) => [field, body[field]]));
      return (await client.post(`/app/v2/crew/${encodeURIComponent(vehicleId)}/actions`, payload, { headers: { ...headersFor(branchId), ...idempotent(body.clientRequestId) } })).data.data;
    },
    async crewConfidence() { return (await get('/app/v2/crew/confidence')).data; },
    async crewAsk(vehicleId, body) { return (await client.post(`/app/v2/crew/${encodeURIComponent(vehicleId)}/ask`, body)).data.data; },
    async ownerCaptures(page, branchId) { return (await get('/app/v2/captures/review', { params: { page }, headers: headersFor(branchId) })).data; },
    async captureDetail(id) { return (await get(`/app/v2/captures/${encodeURIComponent(id)}`)).data; },
    async driverCaptures() { return (await get('/app/v2/captures')).data; },
    async captureCreate(formData, idempotencyKey) {
      return (await client.post('/app/v2/captures', formData, { headers: { 'Content-Type': 'multipart/form-data', ...idempotent(idempotencyKey) }, timeout: 60000 })).data.data;
    },
    async captureRetake(id, formData, idempotencyKey) {
      return (await client.post(`/app/v2/captures/${encodeURIComponent(id)}/retake`, formData, { headers: { 'Content-Type': 'multipart/form-data', ...idempotent(idempotencyKey) }, timeout: 60000 })).data.data;
    },
    async consent() { return (await get('/app/v2/consent')).data; },
    async grantConsent(body, idempotencyKey) { return (await client.post('/app/v2/consent', body, { headers: idempotent(idempotencyKey) })).data.data; },
    async withdrawConsent(idempotencyKey) { return (await client.post('/app/v2/consent/withdraw', {}, { headers: idempotent(idempotencyKey) })).data.data; },
    async destinationSearch(q) { return (await get('/app/v2/destinations/search', { params: { q } })).data; },
    async destinationSuggestions() { return (await get('/app/v2/destinations/suggestions')).data; },
    async destinationClick(id, idempotencyKey) { return (await client.post(`/app/v2/destinations/suggestions/${encodeURIComponent(id)}/click`, {}, { headers: idempotent(idempotencyKey) })).data.data; },
    async dutyToday() { return (await get('/app/v2/duty/today')).data; },
    async dutyBreakPlan() { return (await get('/app/v2/duty/break-plan')).data; },
    async managerCards(branchId) { return (await get('/app/v2/manager/cards', { headers: headersFor(branchId) })).data; },
    async dismissManagerCard(id, branchId) { return (await client.post(`/app/v2/manager/cards/${encodeURIComponent(id)}/dismiss`, {}, { headers: headersFor(branchId) })).data.data; },
    async managerCardOutcome(id, body, branchId) { return (await client.post(`/app/v2/manager/cards/${encodeURIComponent(id)}/outcome`, body, { headers: headersFor(branchId) })).data.data; },
    async snoozeManagerCard(id, body, branchId) { return (await client.post(`/app/v2/manager/cards/${encodeURIComponent(id)}/snooze`, body, { headers: headersFor(branchId) })).data.data; },
    async managerCardsActRate(branchId) { return (await get('/app/v2/manager/cards/act-rate', { headers: headersFor(branchId) })).data; },
    async prompts() { return (await get('/app/v2/prompts')).data; },
    async answerPrompt(id, body, idempotencyKey) { return (await client.post(`/app/v2/prompts/${encodeURIComponent(id)}/answer`, body, { headers: idempotent(idempotencyKey) })).data.data; },
    async routeOptions(branchId) { return (await get('/app/v2/routes', { headers: headersFor(branchId) })).data; },
    async ourRoutes(branchId) { return (await get('/app/v2/routes/our', { headers: headersFor(branchId) })).data; },
    async navSessionStart(body, idempotencyKey) { return (await client.post('/app/v2/nav/sessions', body, { headers: idempotent(idempotencyKey) })).data.data; },
    async navSessionPatch(id, body, idempotencyKey) { return (await client.patch(`/app/v2/nav/sessions/${encodeURIComponent(id)}`, body, { headers: idempotent(idempotencyKey) })).data.data; },
    async navSessionActive() { return (await get('/app/v2/nav/sessions/active')).data; },
    async navMetrics() { return (await get('/app/v2/nav/metrics')).data; },
    async stopQuestions(vehicleId, body = {}, idempotencyKey) { return (await client.post(`/app/v2/stops/${encodeURIComponent(vehicleId)}/questions`, { topic: 'STOP', ...body }, { headers: idempotent(idempotencyKey) })).data.data; },
    async visitsActive() { return (await get('/app/v2/visits/active')).data; },
    async siteCard(siteId) { return (await get(`/app/v2/sites/${encodeURIComponent(siteId)}/card`)).data; },
    async helpMenu() { return (await get('/app/v2/help')).data; },
    async replyToHelpfulCard(id, body) { return (await client.post(`/app/v1/helpful-cards/${encodeURIComponent(id)}/reply`, body)).data.data; },
    async helpBreakdown(body) { return (await client.post('/app/v2/help/breakdown', body || {})).data.data; },
    async createRoadReport(body, idempotencyKey) { return (await client.post('/app/v2/reports', body, { headers: idempotent(idempotencyKey) })).data.data; },
    async nearbyRoadReports() { return (await get('/app/v2/reports')).data; },
    async roadReportStillThere(id, body) { return (await client.post(`/app/v2/reports/${encodeURIComponent(id)}/still-there`, body)).data.data; },
    async voicePhrases() { return (await get('/app/v2/voice/phrases')).data; },
    async teamCreateEmployee(body, branchId) { return (await client.post('/employees', body, { headers: headersFor(branchId) })).data.data; },
    async teamUpdateEmployee(id, body, branchId) { return (await client.patch(`/employees/${encodeURIComponent(id)}`, body, { headers: headersFor(branchId) })).data.data; },
    async teamDeleteEmployee(id, branchId) { return (await client.delete(`/employees/${encodeURIComponent(id)}`, { headers: headersFor(branchId) })).data; },
    async teamDeactivateEmployee(id, branchId) { return (await client.post(`/employees/${encodeURIComponent(id)}/deactivate`, {}, { headers: headersFor(branchId) })).data; },
    async teamActivateEmployee(id, branchId) { return (await client.post(`/employees/${encodeURIComponent(id)}/import`, {}, { headers: headersFor(branchId) })).data; },
    async employeeDocuments(id, branchId) {
      const res = (await get('/documents', { params: { entityType: 'USER', entityId: id }, headers: headersFor(branchId) }));
      return res?.data || res || [];
    },
    async uploadEmployeeDocument(employeeId, asset, docType, expiryDate, branchId) {
      const body = new FormData();
      body.append('entityType', 'USER');
      body.append('entityId', employeeId);
      body.append('docType', docType);
      if (expiryDate) body.append('expiryDate', expiryDate);
      if (typeof document !== 'undefined') {
        body.append('file', asset.file || await (await fetch(asset.uri)).blob(), asset.name || asset.fileName || 'document.jpg');
      } else {
        body.append('file', {
          uri: asset.uri,
          name: asset.name || asset.fileName || 'document.jpg',
          type: asset.mimeType || asset.type || 'image/jpeg',
        });
      }
      return (await client.post('/documents', body, { headers: { 'Content-Type': 'multipart/form-data', ...headersFor(branchId) }, timeout: 120000 })).data;
    },
    async deleteEmployeeDocument(docId, branchId) {
      return (await client.delete(`/documents/${encodeURIComponent(docId)}`, { headers: headersFor(branchId) })).data;
    },
    async teamRoles(branchId) {
      try {
        return (await get('/access-control/roles', { headers: headersFor(branchId) })).data;
      } catch {
        try {
          return (await get('/access-control/roles')).data;
        } catch {
          return { roles: [], catalog: [] };
        }
      }
    },
    async teamEmployees(branchId) {
      try {
        return await mapList('/employees', normalize, branchId);
      } catch {
        try {
          const res = await get('/employees', { params: { limit: 100 }, headers: headersFor(branchId) });
          const items = res?.data || res?.items || (Array.isArray(res) ? res : []);
          return Array.isArray(items) ? items.map(normalize) : [];
        } catch {
          return [];
        }
      }
    },
    async teamAssignments(userId) {
      try {
        return (await get('/access-control/assignments', { params: { userId } })).data;
      } catch {
        return [];
      }
    },
    async teamBranchRoles(branchId) {
      if (!branchId || branchId === 'all') return [];
      try {
        return (await get(`/access-control/branches/${encodeURIComponent(branchId)}/roles`)).data;
      } catch {
        return [];
      }
    },
    async teamWrite(path, method, body, branchId) {
      return (await client.request({ url: `/access-control/${path}`, method, data: body, headers: headersFor(branchId) })).data.data;
    },
    async createSavedLocation(body) { return (await post('/locations', body)).data; },
    // Approvals: WhatsApp
    async whatsappDrafts(params = {}, branchId) {
      return (await get('/whatsapp/admin/drafts', { params: { status: 'READY', limit: 50, ...params }, headers: headersFor(branchId) })).data;
    },
    async whatsappDraft(id, branchId) {
      return (await get(`/whatsapp/admin/drafts/${encodeURIComponent(id)}`, { headers: headersFor(branchId) })).data;
    },
    async whatsappDraftCounts(branchId) {
      return (await get('/whatsapp/admin/drafts/counts', { headers: headersFor(branchId) })).data;
    },
    async whatsappPublishDraft(id, payload = {}, branchId) {
      return (await client.post(`/whatsapp/admin/drafts/${encodeURIComponent(id)}/publish`, payload, { headers: headersFor(branchId) })).data.data;
    },
    async whatsappRejectDraft(id, reason, branchId) {
      return (await client.post(`/whatsapp/admin/drafts/${encodeURIComponent(id)}/reject`, { reason }, { headers: headersFor(branchId) })).data.data;
    },
    async whatsappBulkPublish(ids, branchId) {
      return (await client.post('/whatsapp/admin/drafts/bulk-publish', { ids }, { headers: headersFor(branchId) })).data.data;
    },
    // Documents & Compliance
    async listDocuments(params = {}, branchId) {
      return (await get('/documents', { params, headers: headersFor(branchId) }));
    },
    async uploadVehicleDocument(vehicleId, asset, docType, expiryDate, branchId) {
      const body = new FormData();
      body.append('entityType', 'VEHICLE');
      body.append('entityId', vehicleId);
      body.append('docType', docType);
      if (expiryDate) body.append('expiryDate', expiryDate);
      if (typeof document !== 'undefined') {
        body.append('file', asset.file || await (await fetch(asset.uri)).blob(), asset.name || asset.fileName || 'document.jpg');
      } else {
        body.append('file', {
          uri: asset.uri,
          name: asset.name || asset.fileName || 'document.jpg',
          type: asset.mimeType || asset.type || 'image/jpeg',
        });
      }
      return (await client.post('/documents', body, { headers: { 'Content-Type': 'multipart/form-data', ...headersFor(branchId) }, timeout: 120000 })).data;
    },
    async documentDetail(id, branchId) {
      return (await get(`/documents/${encodeURIComponent(id)}`, { headers: headersFor(branchId) })).data;
    },
    async getVehicleDocuments(vehicleId, branchId) {
      const id = typeof vehicleId === 'object' ? vehicleId?.id || vehicleId?._id : vehicleId;
      try {
        const res = await client.get(`/vehicles/${encodeURIComponent(id)}/documents`, {
          headers: headersFor(branchId),
        });
        return res.data?.data || res.data || [];
      } catch {
        try {
          const res2 = await client.get(`/api/vehicles/${encodeURIComponent(id)}/documents`, {
            headers: headersFor(branchId),
          });
          return res2.data?.data || res2.data || [];
        } catch {
          return [];
        }
      }
    },

    // Fuel Logs & Mileage
    async unifiedFuelLogs(params = {}, branchId) {
      return (await get('/fuel-logs/unified', { params: { limit: 50, ...params }, headers: headersFor(branchId) }));
    },
    async fuelLogs(params = {}, branchId) {
      return (await get('/fuel-logs', { params: { limit: 50, ...params }, headers: headersFor(branchId) }));
    },

    // Auto Trips & Fleet Trips
    async autoTrips(params = {}, branchId) {
      const res = await get('/auto-trips', {
        params: { limit: 50, withCounts: '1', ...params },
        headers: headersFor(branchId),
      });
      const data = res?.data || res;
      const rawItems = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
          ? data
          : Array.isArray(res?.items)
            ? res.items
            : [];
      const items = rawItems.map(tripView);
      const tabCounts = res?.tabCounts || data?.tabCounts || null;
      const total = Number.isFinite(data?.total) ? data.total : items.length;
      return {
        items,
        total,
        tabCounts,
        page: data?.page || 1,
        limit: data?.limit || 50,
      };
    },
    async createTripPlan(body, branchId) {
      return (await client.post('/trip-plans', body, { headers: headersFor(branchId) })).data;
    },
    async addManualTrip(body, branchId) {
      return (await client.post('/auto-trips/manual', body, { headers: headersFor(branchId) })).data;
    },
    async backfillVehicleTrips(vehicleId, branchId) {
      return (await client.post(`/auto-trips/vehicles/${encodeURIComponent(vehicleId)}/backfill`, {}, { headers: headersFor(branchId) })).data;
    },

    // Approvals: Owner & Manager (Office bills)
    async officeBillCaptures(params = {}, branchId) {
      return (await get('/fleet-view/bills', { params: { status: 'pending', uploaderRole: 'OWNER,MANAGER', source: 'office', limit: 50, ...params }, headers: headersFor(branchId) })).data;
    },
    async officeBillConfirm(links, branchId) {
      return (await client.post('/fleet-view/bills/confirmations', { links }, { headers: headersFor(branchId) })).data.data;
    },
    async officeBillSuggestion(captureId, branchId) {
      return (await get(`/fleet-view/bills/${encodeURIComponent(captureId)}/suggestion`, { headers: headersFor(branchId) })).data;
    },

    // Approvals: Field Agent
    async fieldAgentApprovals(params = {}, branchId) {
      return (await get('/field-agent/fuel-logs/approvals', { params: { status: 'PENDING', limit: 50, ...params }, headers: headersFor(branchId) }));
    },
    async fieldAgentApprovalCounts(branchId) {
      return (await get('/field-agent/fuel-logs/approvals/counts', { headers: headersFor(branchId) })).data;
    },
    async fieldAgentApprove(ids, branchId) {
      return (await client.post('/field-agent/fuel-logs/approvals/approve', { ids }, { headers: headersFor(branchId) })).data.data;
    },
    async fieldAgentReject(ids, reason, branchId) {
      return (await client.post('/field-agent/fuel-logs/approvals/reject', { ids, ...(reason && { reason }) }, { headers: headersFor(branchId) })).data.data;
    },

    // Approvals: Trip Approvals
    async tripApprovals(params = {}, branchId) {
      return (await get('/movement-approvals', { params: { limit: 50, ...params }, headers: headersFor(branchId) })).data;
    },
    async tripApprovalRevoke(id, branchId) {
      return (await client.delete(`/movement-approvals/${encodeURIComponent(id)}`, { headers: headersFor(branchId) })).data.data;
    },

    // Upload: Fuel Bill from photo (single confirmed)
    async uploadBillPhoto(asset, { vehicleId, fuelType = 'DIESEL', fillingType = 'FULL_TANK' } = {}, branchId) {
      const body = new FormData();
      if (typeof document !== 'undefined') {
        body.append('fuelPhoto', asset.file || await (await fetch(asset.uri)).blob(), asset.name || 'fuel-bill.jpg');
      } else {
        body.append('fuelPhoto', { uri: asset.uri, name: asset.name || asset.fileName || 'fuel-bill.jpg', type: asset.mimeType || asset.type || 'image/jpeg' });
      }
      body.append('vehicleId', vehicleId);
      body.append('fuelType', fuelType);
      body.append('fillingType', fillingType);
      return (await client.post('/mileage/fuel-log/from-photo', body, { headers: { 'Content-Type': 'multipart/form-data', ...headersFor(branchId) }, timeout: 120000 })).data.data;
    },

    // Upload: Fuel Bill capture (queue / multiple)
    async uploadBillCapture(asset, clientId, { truck, kind = 'DIESEL' } = {}, branchId) {
      const body = new FormData();
      if (typeof document !== 'undefined') {
        body.append('file', asset.file || await (await fetch(asset.uri)).blob(), asset.name || 'bill.jpg');
      } else {
        body.append('file', { uri: asset.uri, name: asset.name || asset.fileName || 'bill.jpg', type: asset.mimeType || asset.type || 'image/jpeg' });
      }
      body.append('source', 'office');
      if (kind) body.append('kind', kind);
      if (truck) body.append('truck', truck);
      return (await client.post('/fleet-view/bills/captures', body, { headers: { 'Content-Type': 'multipart/form-data', ...idempotent(clientId), ...headersFor(branchId) }, timeout: 120000 })).data.data;
    },

    // Upload: WhatsApp chat export (.zip)
    async uploadWhatsappExport(asset, onUploadProgress) {
      const body = new FormData();
      if (typeof document !== 'undefined') {
        body.append('file', asset.file || await (await fetch(asset.uri)).blob(), asset.name || 'chat-export.zip');
      } else {
        body.append('file', { uri: asset.uri, name: asset.name || asset.fileName || 'chat-export.zip', type: asset.mimeType || 'application/zip' });
      }
      return (await client.post('/photo-imports/whatsapp-export', body, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 300000, onUploadProgress })).data.data;
    },
    async getChatExportJob(jobId) {
      return (await get(`/photo-imports/chat-export/jobs/${encodeURIComponent(jobId)}`)).data;
    },
    async getActiveChatExportJob() {
      return (await get('/photo-imports/chat-export/jobs/active')).data;
    },
    async fuelVehicles() {
      if (user.role === "DRIVER") {
        const linked = (await get("/driver/me/vehicle")).data;
        return linked?.vehicle ? [normalize(linked.vehicle)] : [];
      }
      return mapList('/vehicles');
    },
    async fuelDrivers() {
      if (user.role === "FIELD_AGENT") {
        const activeOn = new Date().toISOString();
        const assignments = await collectPages((page, limit) => get("/driver-vehicle-assignments", { params: { activeOn, page, limit } }));
        return [...new Map(assignments.filter((row) => row.driverId && typeof row.driverId === "object").map((row) => [recordId(row.driverId), row.driverId])).values()];
      }
      return collectPages((page, limit) => get("/employees", { params: { role: "DRIVER", page, limit } }));
    },
    async fuelAssignment(vehicleId) {
      const result = rows(await get("/driver-vehicle-assignments", { params: { vehicleId, activeOn: new Date().toISOString() } }));
      return result[0] || null;
    },
    async fuelLocations(search) {
      return rows(await get("/locations", { params: { search, limit: 10 } }));
    },
    async fuelLastOdometer(vehicleId) {
      return (await get(`/mileage/last-odometer/${encodeURIComponent(vehicleId)}`)).data;
    },
    async fuelScan(asset, docType) {
      const body = new FormData();
      body.append("docType", docType);
      if (typeof document !== "undefined") {
        body.append("file", asset.file || await (await fetch(asset.uri)).blob(), asset.name || "photo.jpg");
      } else body.append("file", { uri: asset.uri, name: asset.name || "photo.jpg", type: asset.mimeType || asset.type || "image/jpeg" });
      return (await client.post("/ocr/scan", body, { timeout: 120000 })).data.data;
    },
    async fuelUploadDocument(vehicleId, asset, docType, ocrData, onUploadProgress) {
      const body = new FormData();
      body.append("entityType", "VEHICLE");
      body.append("entityId", vehicleId);
      body.append("docType", docType);
      if (ocrData) body.append("ocrData", JSON.stringify(ocrData));
      if (typeof document !== "undefined") {
        body.append("file", asset.file || await (await fetch(asset.uri)).blob(), asset.name || "photo.jpg");
      } else body.append("file", { uri: asset.uri, name: asset.name || "photo.jpg", type: asset.mimeType || asset.type || "image/jpeg" });
      const result = (await client.post("/documents", body, { timeout: 120000, onUploadProgress })).data;
      return result.data || result;
    },
    async fuelSave(payload) {
      return (await client.post("/mileage/fuel-log", payload, { timeout: 60000 })).data.data;
    },
    async scanFuelReceipt(asset) {
      if (!asset?.uri && !asset?.file) throw new Error("Select a fuel receipt first.");
      const body = new FormData();
      if (typeof document !== "undefined") {
        const blob = asset.file || await (await fetch(asset.uri)).blob();
        body.append("file", blob, asset.name || asset.fileName || "receipt.jpg");
      } else {
        body.append("file", {
          uri: asset.uri,
          name: asset.name || asset.fileName || "receipt.jpg",
          type: asset.mimeType || asset.type || "image/jpeg",
        });
      }
      return (await client.post("/ocr/scan/receipt", body, { timeout: 120000 })).data.data;
    },
    loadDriver,
    workflowList,
    uploadWorkflow,
    async workflowDetail(kind, id) {
      return (await get(`/driver/workflows/${kind}/${encodeURIComponent(id)}`))
        .data;
    },
    async ownIssue(id) {
      return (await get(`/driver/incidents/${encodeURIComponent(id)}`)).data;
    },
    async ownIssues(page = 1) {
      const payload = (
        await get("/driver/incidents", { params: { page, limit: 30 } })
      ).data;
      return {
        ...payload,
        total: payload.pagination?.total,
        items: payload.items?.map(normalize),
      };
    },
    async fleetWorkflow(kind, page = 1, branchId, filters = {}) {
      const value = (
        await get(`/fleet/workflows/${kind}`, {
          params: { page, limit: 30, ...filters },
          headers: headersFor(branchId),
        })
      ).data;
      if (!Array.isArray(value?.items) || !Number.isFinite(value.total))
        throw new Error("Invalid fleet workflow response.");
      return value;
    },
    async createMaintenance(payload, branchId) {
      return (
        await client.post("/fleet/workflows/maintenance", payload, {
          headers: headersFor(branchId),
        })
      ).data.data;
    },
    async maintenanceRecords(params = {}, branchId) {
      try {
        const res = await get('/maintenance', { params, headers: headersFor(branchId) });
        const data = res?.data || res?.items || (Array.isArray(res) ? res : []);
        const meta = res?.meta || { total: Array.isArray(data) ? data.length : 0 };
        return { data: Array.isArray(data) ? data : [], meta };
      } catch {
        return { data: [], meta: { total: 0 } };
      }
    },
    async maintenanceSummary(params = {}, branchId) {
      try {
        const res = await get('/maintenance/summary', { params, headers: headersFor(branchId) });
        return res?.data || res || { total: 0, totalAmount: 0, last30: 0 };
      } catch {
        return { total: 0, totalAmount: 0, last30: 0 };
      }
    },
    async maintenancePredictions(params = {}, branchId) {
      try {
        const res = await get('/maintenance-predictions', { params, headers: headersFor(branchId) });
        const records = res?.records || res?.data?.records || (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
        return { records: Array.isArray(records) ? records : [] };
      } catch {
        return { records: [] };
      }
    },
    async createMaintenanceRecord(payload, asset, branchId) {
      const fd = new FormData();
      Object.entries(payload || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') fd.append(k, String(v));
      });
      if (asset) {
        if (typeof document !== 'undefined') {
          fd.append('files', asset.file || await (await fetch(asset.uri)).blob(), asset.name || asset.fileName || 'bill.jpg');
        } else {
          fd.append('files', {
            uri: asset.uri,
            name: asset.name || asset.fileName || 'bill.jpg',
            type: asset.mimeType || asset.type || 'image/jpeg',
          });
        }
      }
      return (await client.post('/maintenance', fd, { headers: { 'Content-Type': 'multipart/form-data', ...headersFor(branchId) }, timeout: 120000 })).data;
    },
    async updateMaintenanceRecord(id, payload, branchId) {
      return (await client.patch(`/maintenance/${encodeURIComponent(id)}`, payload, { headers: headersFor(branchId) })).data;
    },
    async deleteMaintenanceRecord(id, branchId) {
      return (await client.delete(`/maintenance/${encodeURIComponent(id)}`, { headers: headersFor(branchId) })).data;
    },
    async createAdBlueLog(payload, asset, branchId) {
      let documentId;
      if (asset) {
        try {
          const fd = new FormData();
          fd.append('docType', 'FUEL_SLIP');
          fd.append('entityType', 'VEHICLE');
          if (payload.vehicleId) fd.append('entityId', String(payload.vehicleId));
          if (typeof document !== 'undefined') {
            fd.append('file', asset.file || await (await fetch(asset.uri)).blob(), asset.name || asset.fileName || 'slip.jpg');
          } else {
            fd.append('file', {
              uri: asset.uri,
              name: asset.name || asset.fileName || 'slip.jpg',
              type: asset.mimeType || asset.type || 'image/jpeg',
            });
          }
          const docRes = await client.post('/documents', fd, {
            headers: { 'Content-Type': 'multipart/form-data', ...headersFor(branchId) },
            timeout: 120000,
          });
          documentId = docRes.data?._id || docRes.data?.data?._id || docRes.data?.id;
        } catch (uploadErr) {
          console.warn('[createAdBlueLog] Document upload skipped', uploadErr);
        }
      }

      const body = {
        vehicleId: payload.vehicleId,
        driverId: payload.driverId,
        litres: Number(payload.litres),
        amount: Number(payload.amount),
        ...(payload.place && { place: String(payload.place).trim() }),
        ...(payload.filledAt && { filledAt: payload.filledAt }),
        ...(documentId && { documentId }),
      };

      const res = await client.post('/adblue-logs', body, {
        headers: headersFor(branchId),
        timeout: 60000,
      });
      return res.data;
    },
    async fleetRecord(kind, id, branchId) {
      return (
        await get(`/fleet/workflows/${kind}/${encodeURIComponent(id)}`, {
          headers: headersFor(branchId),
        })
      ).data;
    },
    async issueAction(id, action, body, branchId) {
      return (
        await client.post(
          `/fleet/workflows/issues/${encodeURIComponent(id)}/${action}`,
          body || {},
          { headers: headersFor(branchId) },
        )
      ).data.data;
    },
    async vehicleOptions(page = 1, branchId) {
      const result = await get("/vehicles", {
        params: { page, limit: 30 },
        headers: headersFor(branchId),
      });
      return { items: rows(result).map(normalize), total: result.meta?.total };
    },
    async fleetBill(id, branchId) {
      return (
        await get(`/fleet/workflows/bills/${encodeURIComponent(id)}`, {
          headers: headersFor(branchId),
        })
      ).data;
    },
    async reviewBill(id, payload, branchId) {
      return (
        await client.post(
          `/fleet/workflows/bills/${encodeURIComponent(id)}/review`,
          payload,
          { headers: headersFor(branchId) },
        )
      ).data.data;
    },
    async confirmHandover(payload, branchId) {
      return (
        await client.post("/fleet/workflows/handover", payload, {
          headers: headersFor(branchId),
        })
      ).data.data;
    },
    loadFleet,
    listOwnerAlerts,
    listPositions,
    mergePositions,
    async pairingCandidates(fix) {
      const result = (await post("/driver/me/change-truck", fix)).data;
      if (!Array.isArray(result?.candidates))
        throw new Error("Invalid truck candidates response.");
      return result;
    },
    async confirmPairing(vehicleId, fix) {
      return (
        await post("/driver/me/change-truck/confirm", { ...fix, vehicleId })
      ).data;
    },
    async sendLocationBatch(fixes) {
      return (await post("/driver/location/batch", { fixes })).data;
    },
    async getMyTrail(before) {
      return (await get("/driver/me/trail", { params: { before, limit: 100 } }))
        .data;
    },
    async getTrip(id, branchId) {
      return tripView(
        (await get(`/auto-trips/${encodeURIComponent(id)}`, { headers: headersFor(branchId) })).data,
      );
    },
    async getTripTrack(id, branchId) {
      const track = (
        await get(`/auto-trips/${encodeURIComponent(id)}/track`, {
          params: { limit: 2000 },
          headers: headersFor(branchId),
        })
      ).data;
      if (!Array.isArray(track?.points))
        throw new Error("Invalid trip track response.");
      return {
        ...track,
        points: track.points.map((point) => ({
          ...point,
          latitude: point.latitude ?? point.lat,
          longitude: point.longitude ?? point.lng,
        })),
      };
    },
    async listTrips(page = 1, branchId, vehicleId) {
      const res = await get("/auto-trips", { params: { page, limit: 30, ...(vehicleId && { vehicleId }) }, headers: headersFor(branchId) });
      const payload = res?.data || res;
      const rawItems = Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload)
          ? payload
          : Array.isArray(res?.items)
            ? res.items
            : [];
      const total = Number.isFinite(payload?.total) ? payload.total : rawItems.length;
      return { ...payload, total, items: rawItems.map(tripView) };
    },
    async getTrail(registration, { branchId, from, to, limit = 10000 } = {}) {
      const cleanReg = String(registration || "")
        .replace(/^position:/i, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase();
      try {
        const res = await get(
          `/livetracking/positions/${encodeURIComponent(cleanReg || registration)}/trail`,
          { params: { from, to, limit }, headers: headersFor(branchId) },
        );
        const payload = res?.data?.points
          ? res.data
          : res?.points
            ? res
            : res?.data || {};
        const points = Array.isArray(payload?.points) ? payload.points : [];
        return { ...payload, points };
      } catch (err) {
        if (branchId && err?.response?.status === 404) {
          try {
            const retryRes = await get(
              `/livetracking/positions/${encodeURIComponent(cleanReg || registration)}/trail`,
              { params: { from, to, limit } },
            );
            const payload = retryRes?.data?.points
              ? retryRes.data
              : retryRes?.points
                ? retryRes
                : retryRes?.data || {};
            const points = Array.isArray(payload?.points) ? payload.points : [];
            return { ...payload, points };
          } catch {
            // Re-throw initial error
          }
        }
        throw err;
      }
    },
    /**
     * One truck's Track & Replay over a range — the same endpoint the web
     * Live Tracking "Track" mode uses: { points:[{t,lat,lng,speedKmh,ign}],
     * segments, stops, events, summary }. A backend that has not deployed it
     * (404) falls back to the live breadcrumb trail, mapped to the same shape.
     */
    async getVehicleTrack(registration, { branchId, from, to } = {}) {
      const reg = String(registration || "").replace(/^position:/i, "").trim().toUpperCase();
      if (!reg) throw new Error("Vehicle registration number could not be determined.");
      try {
        const body = await get(`/fleet-view/vehicles/${encodeURIComponent(reg)}/track`, {
          params: { from, to },
          headers: headersFor(branchId),
          timeout: 60000,
        });
        const data = body?.data ?? body;
        if (data?.held === true) return { held: true, why: data.why ?? null, points: [] };
        if (!Array.isArray(data?.points)) throw new Error("Invalid track response.");
        return data;
      } catch (err) {
        if (err?.response?.status !== 404) throw err;
        const cleanReg = reg.replace(/[^A-Z0-9]/g, "");
        const res = await get(
          `/livetracking/positions/${encodeURIComponent(cleanReg)}/trail`,
          { params: { from, to, limit: 10000 }, headers: headersFor(branchId), timeout: 60000 },
        );
        const payload = res?.data?.points ? res.data : res?.points ? res : res?.data || {};
        const points = (Array.isArray(payload.points) ? payload.points : []).map((p) => ({
          t: p.eventDateTime || p.timestamp || p.at,
          lat: p.latitude ?? p.lat,
          lng: p.longitude ?? p.lng,
          speedKmh: p.speed ?? p.speedKmh ?? null,
          ign: typeof p.ignition === "boolean" ? p.ignition : null,
          gap: Boolean(p.gap || p.break || p.gapType),
        }));
        return { from, to, points, source: "livetracking", truncated: Boolean(payload.truncated) };
      }
    },
    async branches() {
      return mapList("/branches");
    },
    async resolvePlaces(points) {
      return (await post("/places/resolve", { points })).data;
    },
    async acknowledgeAlert(id, { branchId } = {}) {
      if (audience === "driver") {
        return (await client.put(`/driver/alerts/${encodeURIComponent(id)}/acknowledgement`, {})).data;
      }
      return (
        await client.put(
          `/owner-alerts/${encodeURIComponent(id)}/ack`,
          {},
          { headers: headersFor(branchId) },
        )
      ).data;
    },
    listDriverAlerts,
    async driverAlert(id) {
      const row = (await get(`/driver/alerts/${encodeURIComponent(id)}`)).data;
      return { ...normalize(row), description: row.message, acknowledged: !!row.acknowledgedAt };
    },
    async sosStatus(id) { return (await get(`/driver/incidents/${encodeURIComponent(id)}/push-status`)).data; },
    async reportSos({ clientIncidentId, type, note, reportedAt, latitude, longitude, accuracy }) {
      const body = { clientIncidentId, type, reportedAt };
      if (note) body.note = note;
      if (latitude != null && longitude != null) {
        body.latitude = latitude;
        body.longitude = longitude;
        if (accuracy != null) body.accuracy = accuracy;
        body.locationCapturedAt = reportedAt;
      }
      const result = (await post("/driver/incidents", body)).data;
      return result;
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
