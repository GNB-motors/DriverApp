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
  .replace(/['"]\.\/alertMetadata['"]/, JSON.stringify(metadataModule));
const { default: axios } = await import(
  pathToFileURL(require.resolve("axios")).href
);
const { createTelematicsApi } = await import(toModule(source));
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
        : config.url === "/fuel-logs"
          ? [
              {
                _id: "fuel",
                autoTripId: "gps-trip",
                tripId: "erp-trip",
                litres: 10,
                rate: 100,
              },
            ]
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
