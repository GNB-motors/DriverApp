import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const { parse } = require("@babel/parser");
async function audit(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = new URL(entry.name, dir);
    if (entry.isDirectory()) await audit(new URL(`${entry.name}/`, dir));
    else if (entry.name.endsWith(".js")) {
      const source = await readFile(file, "utf8");
      parse(source, { sourceType: "module", plugins: ["jsx"] });
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
  .replace(/['"]\.\/authEndpoint['"]/, JSON.stringify(endpoint));
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
            eventDateTime: "2026-10-24T08:00:00Z",
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
