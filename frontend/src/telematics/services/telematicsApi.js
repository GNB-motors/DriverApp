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
    headers: { Authorization: `Bearer ${token}`, ...(orgId && { 'X-Org-Id': orgId }) },
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
    (await collectPages((page, limit) => get(path, {
        params: { ...queries[path], page, limit },
        headers: branchId ? { "X-Branch-Id": branchId } : {},
      }))).map(convert);
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
      summary: async () => (await get("/fleet/workflows/summary", { headers: headersFor(branchId) })).data,
      vehicles: () => mapList("/vehicles", normalize, branchId),
      trips: () => mapList("/auto-trips", tripView, branchId),
      fuel: () => mapList("/fuel-logs", fuelView, branchId),
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
  return {
    async defLedger() { return (await get('/def-ledger')).data; },
    async myStops() { return rows(await get('/place-intelligence/stops/mine', { params: { days: 14, limit: 50 } })); },
    async explainStop(id, purpose, note) { return (await post(`/place-intelligence/stops/${encodeURIComponent(id)}/reason`, { purpose, ...(note?.trim() && { note: note.trim() }) })).data; },
    async erpTrips(page = 1) { return get('/app/v1/trips', { params: { page, limit: 30 } }); },
    async erpTrip(id) { return (await get(`/app/v1/trips/${encodeURIComponent(id)}`)).data; },
    uploadBilty: (id, asset) => uploadErp('/erp/consignments/upload-bilty', 'bilty', id, asset),
    uploadPod: (id, asset) => uploadErp('/erp/pods/upload', 'pod', id, asset),
    async teamRoles(branchId) { return (await get('/access-control/roles', { headers: headersFor(branchId) })).data; },
    async teamEmployees(branchId) { return mapList('/employees', normalize, branchId); },
    async teamAssignments(userId) { return (await get('/access-control/assignments', { params: { userId } })).data; },
    async teamBranchRoles(branchId) { return (await get(`/access-control/branches/${encodeURIComponent(branchId)}/roles`)).data; },
    async teamWrite(path, method, body, branchId) {
      return (await client.request({ url: `/access-control/${path}`, method, data: body, headers: headersFor(branchId) })).data.data;
    },
    async createSavedLocation(body) { return (await post('/locations', body)).data; },
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
    async listTrips(page = 1) {
      const payload = (
        await get("/auto-trips", { params: { page, limit: 30 } })
      ).data;
      if (!Array.isArray(payload?.items) || !Number.isFinite(payload.total))
        throw new Error("Invalid trips response.");
      return { ...payload, items: payload.items.map(tripView) };
    },
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
