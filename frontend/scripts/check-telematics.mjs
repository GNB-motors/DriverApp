import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;
async function audit(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = new URL(entry.name, dir);
    if (entry.isDirectory()) await audit(new URL(`${entry.name}/`, dir));
    else if (entry.name.endsWith(".js")) {
      const source = await readFile(file, "utf8");
      const ast = parse(source, { sourceType: "module", plugins: ["jsx"] });
      traverse(ast, {
        JSXOpeningElement(path) {
          let name = path.node.name;
          while (name.type === "JSXMemberExpression") name = name.object;
          if (name.type === "JSXIdentifier" && /^[A-Z]/.test(name.name)) {
            assert.ok(
              path.scope.hasBinding(name.name),
              `${file}: undefined JSX component ${name.name}`,
            );
          }
        },
      });
      assert.ok(
        !/createMockTelematicsService|createFixtures|DEMO_DRIVER_ID|DEMO_BRANCHES|setScenario|sample-image-only/.test(
          source,
        ),
        `${file}: runtime mock dependency remains`,
      );
    }
  }
}
await audit(new URL("../src/telematics/", import.meta.url));
const toModule = (text) =>
  `data:text/javascript;base64,${Buffer.from(text).toString("base64")}`;
const endpoint = toModule(
  await readFile(
    new URL("../src/telematics/services/authEndpoint.js", import.meta.url),
    "utf8",
  ),
);
const metadataModule = toModule(
  await readFile(
    new URL("../src/telematics/services/alertMetadata.js", import.meta.url),
    "utf8",
  ),
);
const driverContractsModule = toModule(
  await readFile(
    new URL("../src/telematics/services/approvedDriverContracts.js", import.meta.url),
    "utf8",
  ),
);
const source = (
  await readFile(
    new URL("../src/telematics/services/telematicsApi.js", import.meta.url),
    "utf8",
  )
)
  .replace(
    /['"]axios['"]/,
    JSON.stringify(pathToFileURL(require.resolve("axios")).href),
  )
  .replace(/['"]\.\/authEndpoint['"]/, JSON.stringify(endpoint))
  .replace(/['"]\.\/alertMetadata['"]/, JSON.stringify(metadataModule))
  .replace(/['"]\.\/approvedDriverContracts['"]/, JSON.stringify(driverContractsModule));
const { default: axios } = await import(
  pathToFileURL(require.resolve("axios")).href
);
const { createTelematicsApi, describeApiError } = await import(toModule(source));
assert.equal(describeApiError({ response: { status: 400, data: { message: 'Select a document file.' } } }), 'Select a document file.');
assert.equal(describeApiError({ response: { status: 400, data: {} } }), 'The request could not be processed. Refresh and try again.');
const requests = [];
axios.defaults.adapter = async (config) => {
  requests.push(config);
  if (config.url === "/driver/me/vehicle")
    return {
      data: { data: { assignment: null, vehicle: null, position: null } },
      status: 200,
      config,
    };
  if (config.url === "/driver/duty-status")
    return {
      data: {
        data: {
          state: "OFF_DUTY",
          drivingMinutesToday: 0,
          dailyLimitMinutes: 600,
        },
      },
      status: 200,
      config,
    };
  if (config.url === "/owner-alerts")
    return {
      data: {
        data: {
          records: [
            {
              id: "owner-alert",
              type: "FUEL_SIPHON_SUSPECTED",
              message: "Review fuel",
              acknowledged: false,
              vehicleNumber: "REG",
            },
          ],
          total: 71,
          unacknowledgedCount: 51,
          page: config.params.page,
          totalPages: 3,
        },
      },
      status: 200,
      config,
    };
  if (config.url === "/livetracking/positions")
    return {
      data: {
        data: {
          records: [
            {
              registrationNumber: "REG",
              latitude: 19,
              longitude: 72,
              speed: 12,
              eventDateTime: new Date().toISOString(),
            },
          ],
        },
      },
      status: 200,
      config,
    };
  if (config.url === "/auto-trips") throw new Error("Trip service is down");
  if (config.method === "post")
    return { data: { data: { id: "saved-entry" } }, status: 201, config };
  return { data: { data: [] }, status: 200, config };
};
const service = createTelematicsApi({
  baseURL: "https://example.invalid/v1",
  token: "test-token",
  user: { _id: "signed-in-user", firstName: "Test" },
  audience: "driver",
});
const data = await service.loadDriver();
assert.equal(data.driver.id, "signed-in-user");
assert.equal(data.vehicle, null);
assert.equal(data.errors.trips, "Trip service is down");
assert.deepEqual(data.trips, []);
assert.ok(
  requests.every(
    (request) => request.baseURL === "https://example.invalid/v1/api",
  ),
);
assert.ok(
  requests.every(
    (request) => request.headers.Authorization === "Bearer test-token",
  ),
);
assert.ok(!requests.some((request) => request.url === "/vehicles"));
assert.throws(() => service.assignTruck(), /not connected/);
await service.submit("fuel", {
  vehicleId: "truck",
  tripId: "gps-trip",
  station: "Station",
  litres: 10,
  amountInr: 1000,
});
const submitted = JSON.parse(requests.at(-1).data);
assert.equal(submitted.autoTripId, "gps-trip");
assert.equal(submitted.driverId, undefined);
assert.equal(submitted.tripId, undefined);
const fleetService = createTelematicsApi({
  baseURL: "https://example.invalid/v1",
  token: "test-token",
  user: { _id: "owner" },
  audience: "owner",
});
const fleet = await fleetService.loadFleet("branch-1");
assert.equal(fleet.vehicles[0].coordinates.latitude, 19);
assert.equal(fleet.alerts[0].severity, "critical");
assert.equal(fleet.alertFeed.unacknowledgedCount, 51);
assert.equal(fleet.alertFeed.totalPages, 3);
const alertRequest = requests.find(
  (request) => request.url === "/owner-alerts",
);
assert.equal(alertRequest.params.page, 1);
assert.equal(alertRequest.params.limit, 30);
assert.equal(alertRequest.headers["X-Branch-Id"], "branch-1");
const positionRequest = requests.find(
  (request) => request.url === "/livetracking/positions",
);
assert.equal(positionRequest.params, undefined);
assert.equal(positionRequest.headers["X-Branch-Id"], "branch-1");
assert.ok(!requests.some((request) => request.url === "/alert-inbox"));
await fleetService.listOwnerAlerts({
  branchId: "branch-1",
  page: 2,
  acknowledged: false,
  type: "FUEL_SIPHON_SUSPECTED",
});
assert.equal(requests.at(-1).params.page, 2);
assert.equal(requests.at(-1).params.acknowledged, false);
await fleetService.acknowledgeAlert("owner-alert", { branchId: "branch-1" });
assert.equal(requests.at(-1).url, "/owner-alerts/owner-alert/ack");
assert.equal(requests.at(-1).headers["X-Branch-Id"], "branch-1");

axios.defaults.adapter = async (config) => {
  requests.push(config);
  if (config.url === "/app/v2/crew/truck-1") return { data: { success: true, data: { vehicle: { vehicleId: "truck-1", registrationNumber: "REG", branchId: "b" }, crew: { memberIds: [], acceptedIds: [], currentDriverId: null, pending: null, status: "UNKNOWN", version: 3 }, members: [], atWheel: { window: { from: null, to: null }, current: [], intervals: [], confidence: {} } } }, status: 200, config };
  if (config.url === "/app/v2/crew/truck-1/actions") return { data: { success: true, data: { crew: {}, applied: { action: "JOIN" } } }, status: 200, config };
  if (config.url.endsWith("/messages")) return { data: { success: true, data: { message: { id: "m", kind: "LOCATION", body: '{"lat":22,"lng":88}', delivery: [] } } }, status: 201, config };
  if (config.url === "/app/v2/manager/cards") return { data: { success: true, data: { day: "2026-10-30", scope: {}, cards: [] } }, status: 200, config };
  if (config.url === "/app/v2/nav/voice-resources") return { data: { schemaVersion: 1, language: config.params.language, platform: config.params.platform, resources: [], expiresAt: new Date(Date.now() + 3600000).toISOString(), fallbackLanguage: "en" }, status: 200, config };
  return { data: { success: true, data: {} }, status: 200, config };
};
const approvedService = createTelematicsApi({ baseURL: "https://example.invalid/v1", token: "test-token", user: { _id: "driver" } });
await assert.rejects(approvedService.ownerDaily("2026-10-30"), /not connected|unavailable/i);
await assert.rejects(approvedService.ownerRows({ metric: "fuel" }), /not connected|unavailable/i);
await assert.rejects(approvedService.ownerTrends("2026-10-30"), /not connected|unavailable/i);
await assert.rejects(approvedService.ownerCaptures(1), /not connected|unavailable/i);
assert.deepEqual((await approvedService.managerCards()).cards, []);
await approvedService.ownerPreferences({ reportTimeIst: "08:00" });
assert.equal(requests.at(-1).url, "/owner-report/preferences");
await assert.rejects(approvedService.ownerPreferences(), /not connected|unavailable/i);
assert.equal((await approvedService.crewMe("truck-1")).vehicle._id, "truck-1");
assert.equal(requests.at(-1).url, "/app/v2/crew/truck-1");
await approvedService.crewAction("truck-1", { action: "JOIN", clientRequestId: "crew-key", expectedVersion: 7, safelyStopped: true });
assert.deepEqual(JSON.parse(requests.at(-1).data), { action: "JOIN", clientRequestId: "crew-key" });
assert.equal(requests.at(-1).headers["Idempotency-Key"], "crew-key");
const sent = await approvedService.sendMessage("conversation-1", { kind: "LOCATION", location: { lat: 22, lng: 88 }, clientRequestId: "message-key" });
assert.deepEqual(sent.location, { lat: 22, lng: 88 });
assert.deepEqual(JSON.parse(requests.at(-1).data), { kind: "LOCATION", clientId: "message-key", body: '{"lat":22,"lng":88}' });
assert.equal(requests.at(-1).headers["Idempotency-Key"], "message-key");
const voicePolicy = await approvedService.navVoiceResources("hi", "android");
assert.equal(voicePolicy.language, "hi");
assert.equal(requests.at(-1).url, "/app/v2/nav/voice-resources");
assert.deepEqual(requests.at(-1).params, { language: "hi", platform: "android" });
axios.defaults.adapter = async (config) => {
  const payload =
    config.url === "/driver/me/vehicle"
      ? {
          vehicle: { id: "assigned-truck", registrationNumber: "REAL-REG" },
          position: {
            latitude: 19,
            longitude: 72,
            ageMinutes: 3,
            speed: 20,
            eventDateTime: new Date().toISOString(),
          },
          locationRule: { source: "TRUCK_GPS" },
        }
      : config.url === "/auto-trips"
        ? {
            items: [
              {
                _id: "gps-trip",
                vehicleId: "assigned-truck",
                pickup: { name: "Origin" },
                drop: { name: "Destination" },
                km: { laden: 25 },
              },
            ],
          }
        : config.url === "/driver/workflows/fuel"
          ? {
              items: [
                {
                  _id: "fuel",
                  autoTripId: "gps-trip",
                  tripId: "erp-trip",
                  litres: 10,
                  rate: 100,
                },
              ],
              total: 1,
            }
          : config.url === "/driver/duty-status"
            ? { state: "DRIVING" }
            : [];
  return { data: { data: payload }, status: 200, config };
};
const connected = createTelematicsApi({
  baseURL: "https://example.invalid/v1",
  token: "test-token",
  user: { _id: "signed-in-user" },
  audience: "driver",
});
const connectedData = await connected.loadDriver();
assert.equal(connectedData.vehicle.id, "assigned-truck");
assert.equal(connectedData.vehicle.status, "moving");
assert.equal(connectedData.trips[0].to, "Destination");
assert.equal(connectedData.trips[0].distanceKm, 25);
assert.equal(connectedData.fuel[0].tripId, "gps-trip");
assert.equal(connectedData.fuel[0].amountInr, 1000);
const merged = connected.mergePositions(
  [
    {
      _id: "master-truck",
      registrationNumber: "MASTER",
      fleetEdgeRegistration: "ALIAS",
      chassisNumber: "VIN",
    },
  ],
  [
    {
      registrationNumber: "ALIAS",
      vin: "VIN",
      latitude: 19,
      longitude: 72,
      speed: 0,
      ignition: true,
      eventDateTime: new Date().toISOString(),
    },
    {
      registrationNumber: "NOT-IN-PAGE",
      latitude: 20,
      longitude: 73,
      speed: 20,
      eventDateTime: "2000-01-01T00:00:00Z",
      isStale: true,
    },
  ],
);
assert.equal(merged.length, 2);
assert.equal(merged[0].id, "master-truck");
assert.equal(merged[0].status, "idling");
assert.equal(merged[0].telemetryRegistration, "ALIAS");
assert.equal(merged[1].status, "offline");
assert.deepEqual(merged[1].coordinates, { latitude: 20, longitude: 73 });
const geometry = await import(
  toModule(
    await readFile(
      new URL("../src/telematics/components/mapGeometry.js", import.meta.url),
      "utf8",
    ),
  )
);
assert.equal(
  geometry.mapPoints([{ coordinates: { latitude: null, longitude: 72 } }])
    .length,
  0,
);
assert.deepEqual(
  geometry
    .trailSegments([
      { latitude: 1, longitude: 1 },
      { latitude: 2, longitude: 2 },
      { latitude: 3, longitude: 3, break: true },
      { latitude: 4, longitude: 4 },
    ])
    .map((segment) => segment.length),
  [2, 2],
);
// Phase 3 request contracts use the same authenticated API root.
axios.defaults.adapter = async (config) => {
  requests.push(config);
  const payload = ["/ocr/scan/receipt", "/ocr/scan"].includes(config.url)
    ? { location: "Test pump", volume: 12.5, rate: 100 }
    : config.url === "/documents" ? { _id: "uploaded-document" }
    : config.url === "/mileage/fuel-log" ? { fuelLog: { _id: "saved-fuel" } }
    : config.url.startsWith("/mileage/last-odometer/") ? { odometerReading: 1000 }
    : config.url.startsWith("/driver/workflows/")
    ? config.method === "post"
      ? { record: { _id: "stored-document" }, replayed: false }
      : { items: [], total: 0 }
    : config.url === "/driver/me/change-truck"
      ? { candidates: [], requireConfirm: true }
      : config.url === "/auto-trips"
        ? { items: [], total: 0 }
        : config.url.endsWith("/track")
          ? { points: [{ lat: 22, lng: 88 }] }
          : config.url === "/driver/location/batch"
            ? { requested: 1, written: 1 }
            : { assignmentId: "assignment", vehicleId: "truck" };
  return { data: { data: payload }, status: 200, config };
};
const phase3 = createTelematicsApi({
  baseURL: "https://example.invalid/v1",
  token: "test-token",
  user: { _id: "signed-in-user" },
  audience: "driver",
});
const pairingFix = {
  latitude: 22,
  longitude: 88,
  accuracy: 10,
  recordedAt: new Date().toISOString(),
  mocked: false,
};
assert.deepEqual((await phase3.pairingCandidates(pairingFix)).candidates, []);
await phase3.confirmPairing("truck", pairingFix);
assert.equal(requests.at(-1).url, "/driver/me/change-truck/confirm");
assert.deepEqual(JSON.parse(requests.at(-1).data), {
  ...pairingFix,
  vehicleId: "truck",
});
assert.equal(
  (
    await phase3.sendLocationBatch([
      {
        latitude: 22,
        longitude: 88,
        recordedAt: pairingFix.recordedAt,
        source: "FOREGROUND",
      },
    ])
  ).written,
  1,
);
assert.equal(requests.at(-1).url, "/driver/location/batch");
assert.equal((await phase3.listTrips(2)).total, 0);
assert.equal(requests.at(-1).params.page, 2);
assert.equal((await phase3.getTripTrack("trip")).points[0].longitude, 88);

// Operational uploads retain real file bytes, the persisted request ID and bearer authentication.
const { receiptFields, receiptRefuelTime } = await import(toModule(await readFile(new URL('../src/telematics/services/fuelReceipt.js', import.meta.url), 'utf8')));
const { fuelPayload, saveFuelEntry } = await import(toModule(await readFile(new URL('../src/telematics/services/fuelEntry.js', import.meta.url), 'utf8')));
const baseFuel = { litres: '12.5', rate: '99.82', odometerReading: '', fillingType: 'FULL_TANK', location: 'Pump', refuelTime: '2026-10-27T18:00:00.000Z' };
const optionalOdo = fuelPayload(baseFuel, 'truck', 'driver', { odometerReading: 1000 });
assert.equal(Object.hasOwn(optionalOdo, 'odometerReading'), false, 'full tank permits backend odometer fallback');
assert.equal(optionalOdo.rate, 99.82);
assert.throws(() => fuelPayload({ ...baseFuel, odometerReading: '1000' }, 'truck', 'driver', { odometerReading: 1000 }), /greater/);
assert.throws(() => fuelPayload({ ...baseFuel, rate: '' }, 'truck', 'driver'), /positive/);
assert.throws(() => fuelPayload(baseFuel, '', 'driver'), /vehicle/);
let durableDraft = { payload: optionalOdo, fuel: { asset: { uri: 'file:///receipt.jpg' }, ocr: { volume: 12.5 } }, odometer: { asset: { uri: 'file:///odo.jpg' }, ocr: { reading: 1100 } } };
let uploadedDocs = 0;
let saveAttempts = 0;
const retryApi = {
  fuelUploadDocument: async (_vehicle, _asset, type, ocr) => { uploadedDocs++; assert.ok(ocr); return { _id: type === 'FUEL_SLIP' ? 'receipt-id' : 'odo-id' }; },
  fuelSave: async (payload) => { assert.equal(payload.documentId, 'receipt-id'); assert.equal(payload.odometerDocId, 'odo-id'); if (++saveAttempts === 1) throw new Error('connection lost after save'); return { id: 'existing-fuel' }; },
};
const persistFuel = async (next) => { durableDraft = JSON.parse(JSON.stringify(next)); };
await assert.rejects(() => saveFuelEntry(retryApi, durableDraft, persistFuel), /connection lost/);
assert.equal(durableDraft.documentId, 'receipt-id');
assert.equal(durableDraft.odometerDocId, 'odo-id');
assert.equal((await saveFuelEntry(retryApi, durableDraft, persistFuel)).id, 'existing-fuel');
assert.equal(uploadedDocs, 2, 'retry must reuse both uploaded document IDs');
const uploadedAt = '2026-10-28T04:00:00.000Z';
assert.equal(receiptRefuelTime('2026-10-27 23:45:10', uploadedAt), '2026-10-27T18:15:10.000Z');
assert.equal(receiptRefuelTime('2026-10-28 01:00:00', uploadedAt), '2026-10-27T19:30:00.000Z');
assert.equal(receiptRefuelTime('2026-10-27T18:15:10Z', uploadedAt), '2026-10-27T18:15:10.000Z');
assert.equal(receiptRefuelTime('2026-10-27T23:45:10+05:30', uploadedAt), '2026-10-27T18:15:10.000Z');
assert.equal(receiptRefuelTime('2024-02-29 12:30', uploadedAt), '2024-02-29T07:00:00.000Z');
for (const invalid of [null, undefined, '', 'not a date', '2026-10-27', '2026-02-29 12:00:00', '2026-04-31 12:00:00', '2026-10-27 24:00:00'])
  assert.equal(receiptRefuelTime(invalid, uploadedAt), uploadedAt);
assert.deepEqual(receiptFields({ station: '', litres: '', amountInr: '' }, { location: 'Pump', volume: 12.5, rate: 100 }), { station: 'Pump', litres: '12.5', amountInr: '1250.00' });
assert.deepEqual(receiptFields({ station: 'Manual', litres: '8', amountInr: '800' }, { location: 'OCR', volume: 12.5, rate: 100 }), { station: 'Manual', litres: '8', amountInr: '800' });
assert.deepEqual(receiptFields({ litres: '', amountInr: '' }, { volume: null, rate: 'invalid' }), { litres: '', amountInr: '' });
// Expo iOS uses URI parts, not browser Blobs.
const BrowserFormData = globalThis.FormData;
globalThis.FormData = class FormData {
  constructor() { this.parts = []; }
  append(...part) { this.parts.push(part); }
  getParts() { return this.parts; }
  toString() { return '[object FormData]'; }
};
try {
  const receipt = await phase3.scanFuelReceipt({ uri: 'file:///receipt.heic', fileName: 'receipt.heic', mimeType: 'image/heic' });
  const scan = requests.at(-1);
  assert.equal(scan.url, '/ocr/scan/receipt');
  assert.equal(scan.headers.Authorization, 'Bearer test-token');
  assert.deepEqual(scan.data.getParts(), [['file', { uri: 'file:///receipt.heic', name: 'receipt.heic', type: 'image/heic' }]]);
  assert.equal(receipt.volume, 12.5);
  await phase3.fuelScan({ uri: 'file:///odo.jpg', name: 'odo.jpg', mimeType: 'image/jpeg' }, 'ODOMETER');
  assert.equal(requests.at(-1).url, '/ocr/scan');
  assert.deepEqual(requests.at(-1).data.getParts()[0], ['docType', 'ODOMETER']);
  const uploaded = await phase3.fuelUploadDocument('truck', { uri: 'file:///receipt.jpg', name: 'receipt.jpg' }, 'FUEL_SLIP', { datetime: '2026-10-27 23:45:00' });
  assert.equal(uploaded._id, 'uploaded-document');
  const uploadParts = Object.fromEntries(requests.at(-1).data.getParts());
  assert.equal(requests.at(-1).url, '/documents');
  assert.equal(uploadParts.entityId, 'truck');
  assert.equal(uploadParts.docType, 'FUEL_SLIP');
  assert.equal(JSON.parse(uploadParts.ocrData).datetime, '2026-10-27 23:45:00');
  assert.equal(uploadParts.file.uri, 'file:///receipt.jpg');
  assert.equal((await phase3.fuelLastOdometer('truck')).odometerReading, 1000);
  assert.equal(requests.at(-1).url, '/mileage/last-odometer/truck');
  await phase3.fuelSave({ vehicleId: 'truck', documentId: 'receipt' });
  assert.equal(requests.at(-1).url, '/mileage/fuel-log');
  assert.equal(JSON.parse(requests.at(-1).data).documentId, 'receipt');
  await phase3.uploadWorkflow('fuel', { clientRequestId: 'native-upload', litres: 12.5 }, { uri: 'file:///receipt.heic', name: 'receipt.heic', mimeType: 'image/heic' });
  assert.equal(requests.at(-1).url, '/driver/workflows/fuel');
  assert.equal(requests.at(-1).data.getParts().at(-1)[1].uri, 'file:///receipt.heic');
} finally {
  globalThis.FormData = BrowserFormData;
}
globalThis.document = {};
try {
  const result = await phase3.uploadWorkflow(
    "documents",
    {
      clientRequestId: "123e4567-e89b-42d3-a456-426614174000",
      scope: "personal",
      docType: "PAN",
    },
    {
      file: new Blob(["actual test evidence"], { type: "application/pdf" }),
      name: "document.pdf",
      mimeType: "application/pdf",
      uri: "unused",
    },
  );
  assert.equal(result.record._id, "stored-document");
  const upload = requests.at(-1);
  assert.equal(upload.url, "/driver/workflows/documents");
  assert.equal(upload.headers.Authorization, "Bearer test-token");
  assert.equal(upload.data.get("scope"), "personal");
  assert.equal(
    upload.data.get("clientRequestId"),
    "123e4567-e89b-42d3-a456-426614174000",
  );
  assert.equal(await upload.data.get("file").text(), "actual test evidence");
  assert.equal(upload.data.has("driverId"), false);
  await phase3.workflowList("documents", 2, "personal");
  assert.deepEqual(requests.at(-1).params, {
    page: 2,
    limit: 30,
    scope: "personal",
  });
} finally {
  delete globalThis.document;
}
let expired = 0;
axios.defaults.adapter = async () => {
  const error = new Error("Unauthorized");
  error.response = { status: 401 };
  throw error;
};
const expiredSession = createTelematicsApi({
  baseURL: "https://example.invalid/v1",
  token: "expired",
  user: { _id: "signed-in-user" },
  audience: "driver",
  onUnauthorized: () => {
    expired += 1;
  },
});
await assert.rejects(expiredSession.loadDriver(), /session has expired/);
assert.equal(expired, 1);
axios.defaults.adapter = async () => {
  throw new Error("Server unavailable");
};
const offline = createTelematicsApi({
  baseURL: "https://example.invalid/v1",
  token: "test-token",
  user: { _id: "signed-in-user" },
  audience: "driver",
});
await assert.rejects(offline.loadDriver(), /Server unavailable/);
console.log(
  "Passed: authenticated API requests, no fleet guess, explicit request failures, GPS fuel trip contract, and no runtime mock dependencies.",
);

{
  const { createLocationQueue, locationFix, queueKey, recordAndFlush } =
    await import(
      toModule(
        await readFile(
          new URL(
            "../src/telematics/tracking/locationQueue.js",
            import.meta.url,
          ),
          "utf8",
        ),
      )
    );
  const disk = new Map();
  const storage = {
    getItem: async (key) => disk.get(key) || null,
    setItem: async (key, value) => disk.set(key, value),
    removeItem: async (key) => disk.delete(key),
  };
  const fixes = Array.from({ length: 120 }, (_, index) => ({
    latitude: 20,
    longitude: 73,
    recordedAt: new Date(1700000000000 + index * 1000).toISOString(),
    source: "FOREGROUND",
  }));
  let connected = false;
  let active = true;
  const sent = [];
  const key = queueKey({ orgId: "one", _id: "driver" });
  const queue = createLocationQueue({
    storage,
    key,
    isActive: () => active,
    send: async (batch) => {
      if (!connected) throw new Error("offline");
      sent.push(batch.length);
      return { requested: batch.length, written: batch.length };
    },
  });
  await assert.rejects(recordAndFlush(queue, fixes), /offline/);
  assert.equal(await queue.count(), 120);
  await queue.enqueue([fixes[0]]);
  assert.equal(await queue.count(), 120);
  connected = true;
  assert.equal(await queue.flush(), 0);
  assert.deepEqual(sent, [100, 20]);
  await queue.enqueue([fixes[0]]);
  active = false;
  await queue.flush();
  assert.equal(await queue.count(), 1);
  const second = createLocationQueue({
    storage,
    key: queueKey({ orgId: "two", _id: "driver" }),
    send: async () => {
      throw new Error("unexpected");
    },
  });
  assert.equal(await second.count(), 0);
  const partial = createLocationQueue({
    storage,
    key,
    send: async (batch) => ({ requested: batch.length, written: 0 }),
  });
  await assert.rejects(partial.flush(), /not confirm/);
  assert.equal(await partial.count(), 1);
  assert.throws(
    () =>
      locationFix(
        {
          mocked: true,
          coords: { latitude: 20, longitude: 73 },
          timestamp: Date.now(),
        },
        "FOREGROUND",
      ),
    /valid device/,
  );
  const full = Array.from({ length: 5000 }, (_, index) => ({
    ...fixes[0],
    recordedAt: new Date(1700000000000 + index).toISOString(),
  }));
  await storage.setItem("full", JSON.stringify(full));
  const capped = createLocationQueue({
    storage,
    key: "full",
    send: async (batch) => ({ requested: batch.length, written: batch.length }),
  });
  await recordAndFlush(capped, [
    { ...fixes[0], recordedAt: "2026-10-24T00:00:00Z" },
  ]);
  assert.equal(await capped.count(), 4401);
  console.log(
    "Passed: offline queue persistence, acknowledgement, account isolation, cancellation, deduplication and full queue recovery.",
  );
}
