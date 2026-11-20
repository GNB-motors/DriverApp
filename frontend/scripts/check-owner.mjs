import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const moduleUrl = (source) =>
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const {
  istDay,
  shiftDay,
  validBusinessDay,
  reportSpeech,
  sectionNames,
  trendSections,
  trendPointText,
  comparisonNotes,
} = await import(
  moduleUrl(await read("../src/telematics/services/ownerReport.js"))
);
assert.equal(istDay(new Date("2026-10-28T18:29:59Z")), "2026-10-28");
assert.equal(istDay(new Date("2026-10-28T18:30:00Z")), "2026-10-29");
assert.equal(shiftDay("2026-03-01", -1), "2026-02-28");
assert.equal(validBusinessDay("2026-02-30"), false);
assert.equal(validBusinessDay("2028-02-29"), true);
const { isDefinitiveRejection } = await import(
  moduleUrl(await read("../src/telematics/services/ownerSubmission.js"))
);
assert.equal(
  isDefinitiveRejection({
    message: "Submission is still processing; retry this same submission.",
    response: { status: 409 },
  }),
  false,
  "an in-flight write must keep its idempotency key",
);
assert.equal(isDefinitiveRejection({ message: "timeout" }), false);
assert.equal(
  isDefinitiveRejection({
    message: "server failed",
    response: { status: 500 },
  }),
  false,
);
assert.equal(
  isDefinitiveRejection({
    message: "Record changed; refresh.",
    response: { status: 409 },
  }),
  true,
);
const report = {
  date: "2026-10-28",
  sections: {
    fleet: { metrics: { total: { value: 0 } }, coverage: "complete" },
    trips: { metrics: { count: { value: null } }, coverage: "unknown" },
    diesel: { metrics: { amount: { value: null } }, coverage: "partial" },
  },
};
assert.match(reportSpeech(report), /Registered vehicles: 0/);
assert.match(reportSpeech(report), /Trips marked complete: Unavailable/);
assert.match(reportSpeech(report, "hi"), /जानकारी उपलब्ध नहीं/);
assert.match(reportSpeech(report, "bn"), /তথ্য নেই/);
for (const name of trendSections)
  assert.ok(sectionNames[name], `trend section ${name} needs a label`);
assert.equal(
  trendPointText({ status: "empty", value: null }, "minutes"),
  "No records",
);
assert.equal(
  trendPointText({ status: "partial", value: null, rows: 2 }, "INR"),
  "Unavailable",
  "a day with missing amounts is unknown, not empty",
);
assert.equal(trendPointText({ status: "empty", value: 0 }, "INR"), "₹0");
const comparison = (reasons, missingDays = []) => ({
  reasons,
  previousSevenDays: { missingDays },
});
assert.deepEqual(comparisonNotes(comparison([])), []);
assert.match(
  comparisonNotes(comparison(["SELECTED_PARTIAL_DAY"]))[0],
  /still in progress/,
);
assert.match(
  comparisonNotes(comparison(["MISSING_INPUTS"], ["2026-10-24"]))[0],
  /2026-10-24; no average/,
);
const { captureKindLabel, captureWarnings } = await import(
  moduleUrl(await read("../src/telematics/services/documentCapture.js"))
);
assert.equal(captureKindLabel("REPAIR_INVOICE"), "Repair invoice");
assert.match(
  captureWarnings({ reasons: ["EXACT_DUPLICATE"] })[0],
  /Both copies are retained/,
);
assert.match(
  captureWarnings({ reasons: ["OCR_UNAVAILABLE"] })[0],
  /Review the original/,
);
assert.equal(captureWarnings({ reasons: ["BLURRY", "BLURRY"] }).length, 1);
const endpoint = moduleUrl(
  await read("../src/telematics/services/authEndpoint.js"),
);
const metadata = moduleUrl(
  await read("../src/telematics/services/alertMetadata.js"),
);
const appIdentity = moduleUrl(
  'export const APP_VERSION = "2.0.0"; let next = 0; export const newIdempotencyKey = () => `generated-key-${++next}`;',
);
const source = (await read("../src/telematics/services/telematicsApi.js"))
  .replace(/['"]axios['"]/, JSON.stringify(import.meta.resolve("axios")))
  .replace(/['"]\.\/authEndpoint['"]/, JSON.stringify(endpoint))
  .replace(/['"]\.\/alertMetadata['"]/, JSON.stringify(metadata))
  .replace(/['"]\.\/appIdentity['"]/, JSON.stringify(appIdentity));
const { createTelematicsApi, describeApiError } = await import(moduleUrl(source));
const { default: axios } = await import("axios");
const calls = [];
// GET /app/v2/crew/:vehicleId as the backend's crew contract returns it.
const crewDetail = {
  vehicle: { vehicleId: "truck", registrationNumber: "AUD20NOV01", branchId: "branch-b" },
  crew: {
    memberIds: ["driver-1", "driver-2"],
    acceptedIds: ["driver-1"],
    currentDriverId: "driver-1",
    pending: {
      id: "proposal",
      fromDriverId: "driver-1",
      targetDriverId: "driver-2",
      proposedAt: "2026-11-20T05:00:00.000Z",
      expiresAt: "2000-01-01T00:00:00.000Z",
    },
    status: "PENDING",
    version: 4,
  },
  members: [
    { driverId: "driver-1", name: "Asha Driver", role: "DRIVER", status: "ACTIVE" },
    { driverId: "driver-2", name: "Bala Driver", role: "DRIVER", status: "INACTIVE" },
  ],
  atWheel: {
    window: { from: null, to: null },
    current: [],
    intervals: [
      { driverId: "driver-1", start: "2026-11-20T04:00:00.000Z", end: null, status: "AGREED", evidence: [] },
    ],
    confidence: {},
  },
};
let linkedTruck = "my-truck";
axios.defaults.adapter = async (config) => {
  calls.push(config);
  if (config.url === "/driver/me/vehicle")
    return { status: 200, config, data: { data: { vehicle: { _id: linkedTruck } } } };
  if (config.url === "/app/v2/crew/not-on-crew") {
    const error = new Error("You are not on this truck.");
    error.config = config;
    error.response = { status: 403, data: { message: "You are not on this truck." } };
    throw error;
  }
  if (config.url === "/app/v2/crew/my-truck" || config.url === "/app/v2/crew/truck")
    return { status: 200, config, data: { success: true, data: crewDetail } };
  if (
    config.url === "/livetracking/positions" ||
    config.url === "/owner-alerts"
  )
    return { status: 200, config, data: { data: { records: [], total: 0 } } };
  return { status: 200, config, data: { data: { items: [], total: 0 } } };
};
const api = createTelematicsApi({
  baseURL: "https://owner-api.invalid/v1/api",
  token: "owner-session",
  user: { _id: "owner", orgId: "org", role: "OWNER" },
  audience: "owner",
});
await api.ownerDaily("2026-10-28", "branch-a");
assert.equal(calls.at(-1).url, "/app/v2/reports/daily");
assert.equal(calls.at(-1).params.date, "2026-10-28");
assert.equal(calls.at(-1).headers["X-Branch-Id"], "branch-a");
await api.ownerTrends("2026-10-28", "branch-a");
assert.equal(calls.at(-1).url, "/app/v2/reports/trends");
assert.equal(calls.at(-1).params.date, "2026-10-28");
assert.equal(calls.at(-1).headers["X-Branch-Id"], "branch-a");
await api.ownerRows(
  { date: "2026-10-28", metric: "diesel", page: 4 },
  "branch-a",
);
assert.equal(calls.at(-1).params.page, 4);
assert.equal(calls.at(-1).params.metric, "diesel");
await api.ownerDaily("2026-10-27");
assert.equal(
  calls.at(-1).headers["X-Branch-Id"],
  undefined,
  "all branches cannot retain a previous selected branch",
);
const payload = {
  clientRequestId: "same-submission",
  expectedUpdatedAt: "2026-10-28T00:00:00Z",
  action: "REJECT",
  note: "Receipt is unreadable",
};
await api.ownerDecision("fuel", "receipt", payload, "branch-b");
assert.deepEqual(JSON.parse(calls.at(-1).data), payload);
assert.equal(calls.at(-1).headers["X-Branch-Id"], "branch-b");
await api.ownerRecord("document", "document-id", "branch-b");
assert.equal(calls.at(-1).url, "/app/v2/records/document/document-id");
assert.equal(calls.at(-1).headers["X-Branch-Id"], "branch-b");
for (const action of ["VERIFY", "REJECT"]) {
  const documentPayload = { ...payload, action };
  await api.ownerDecision(
    "document",
    "document-id",
    documentPayload,
    "branch-b",
  );
  assert.equal(
    calls.at(-1).url,
    "/app/v2/records/document/document-id/actions",
  );
  assert.deepEqual(JSON.parse(calls.at(-1).data), documentPayload);
  assert.equal(calls.at(-1).headers["X-Branch-Id"], "branch-b");
  await api.ownerDecision(
    "document",
    "document-id",
    documentPayload,
    "branch-b",
  );
  assert.deepEqual(JSON.parse(calls.at(-1).data), documentPayload);
}
await api.conversationMessages("thread", { before: "cursor" }, "branch-b");
assert.equal(calls.at(-1).params.before, "cursor");
await api.messageReceipt("thread", "message", "ACKNOWLEDGE", "branch-b");
assert.deepEqual(JSON.parse(calls.at(-1).data), { action: "ACKNOWLEDGE" });
assert.equal(calls.at(-1).headers.Authorization, "Bearer owner-session");
const explainBody = {
  clientRequestId: "driver-rid-1",
  note: "Pump fault confirmed.",
};
await api.driverExplain("alert-id-1", explainBody, "branch-b");
assert.equal(calls.at(-1).url, "/app/v2/escalations/alert-id-1/explain");
assert.deepEqual(JSON.parse(calls.at(-1).data), explainBody);
assert.equal(calls.at(-1).headers["X-Branch-Id"], "branch-b");
// Audit I01: every v2 call names the app build the version gate compares.
assert.equal(calls.at(-1).headers["X-App-Version"], "2.0.0");
assert.match(
  describeApiError({ response: { status: 426, data: { data: { minAppVersion: "2.0.0" } } } }),
  /^Update DriverApp to use this screen \(version 2\.0\.0 or newer is needed\)/,
);
// Audit I03: the driver's crew is GET /crew/:vehicleId of the linked truck,
// and the nested contract is adapted to the one flat card the screens read.
const mine = await api.crewMine();
assert.equal(calls.at(-2).url, "/driver/me/vehicle");
assert.equal(calls.at(-1).url, "/app/v2/crew/my-truck");
assert.equal(mine.vehicle._id, "truck");
assert.equal(mine.vehicle.registrationNumber, "AUD20NOV01");
assert.equal(mine.status, "PENDING");
assert.equal(mine.currentDriverId, "driver-1");
assert.equal(mine.version, 4);
assert.deepEqual(
  mine.members.map((member) => [member._id, member.name, member.accepted, member.status]),
  [
    ["driver-1", "Asha Driver", true, "ACTIVE"],
    ["driver-2", "Bala Driver", false, "INACTIVE"],
  ],
);
assert.equal(mine.pending.targetDriverId, "driver-2");
assert.equal(mine.pending.expired, true);
assert.deepEqual(mine.intervals, [
  {
    _id: "driver-1:2026-11-20T04:00:00.000Z",
    driverId: "driver-1",
    startAt: "2026-11-20T04:00:00.000Z",
    endAt: null,
    status: "AGREED",
  },
]);
// Not on the linked truck's crew (403) is "no crew yet", not an error.
linkedTruck = "not-on-crew";
assert.equal(await api.crewMine(), null);
linkedTruck = "my-truck";
const fleetCrew = await api.crewVehicle("truck", "branch-b");
assert.equal(calls.at(-1).url, "/app/v2/crew/truck");
assert.equal(calls.at(-1).headers["X-Branch-Id"], "branch-b");
assert.equal(fleetCrew.vehicle._id, "truck");
// A draft saved before this fix still carries fields the strict action schema
// rejects; only the contract's fields are sent.
const crewBody = {
  clientRequestId: "saved-crew-action",
  expectedVersion: 4,
  action: "ACCEPT",
  proposalId: "saved-proposal",
  safelyStopped: true,
};
await api.crewAction("truck", crewBody, "branch-b");
assert.equal(calls.at(-1).url, "/app/v2/crew/truck/actions");
assert.deepEqual(JSON.parse(calls.at(-1).data), {
  action: "ACCEPT",
  proposalId: "saved-proposal",
  clientRequestId: "saved-crew-action",
});
// Audit I20: the saved draft's id is the Idempotency-Key, so a retry replays.
assert.equal(calls.at(-1).headers["Idempotency-Key"], "saved-crew-action");
assert.equal(calls.at(-1).headers["X-Branch-Id"], "branch-b");
await api.crewAction("truck", crewBody, "branch-b");
assert.equal(calls.at(-1).headers["Idempotency-Key"], "saved-crew-action");
await api.grantConsent({ noticeVersion: "v1", language: "en" });
assert.equal(calls.at(-1).url, "/app/v2/consent");
assert.match(calls.at(-1).headers["Idempotency-Key"], /^generated-key-\d+$/);
await api.withdrawConsent("withdraw-key");
assert.equal(calls.at(-1).url, "/app/v2/consent/withdraw");
assert.equal(calls.at(-1).headers["Idempotency-Key"], "withdraw-key");
await api.answerPrompt("prompt", { answer: "YES" }, "prompt-key");
assert.equal(calls.at(-1).headers["Idempotency-Key"], "prompt-key");
const startup = calls.length;
await api.loadFleet("branch-b");
assert.equal(
  calls
    .slice(startup)
    .some((call) =>
      ["/fuel-logs", "/fleet/workflows/summary"].includes(call.url),
    ),
  false,
  "owner startup must not download financial history or a duplicate 30-day summary",
);
assert.equal(
  calls.slice(startup).filter((call) => call.url === "/auto-trips").length,
  1,
);
assert.equal(
  calls.slice(startup).find((call) => call.url === "/auto-trips").params.limit,
  30,
);
const vehicle = { _id: "vehicle", registrationNumber: "TEST" };
const point = {
  registrationNumber: "TEST",
  eventDateTime: new Date().toISOString(),
  speed: null,
  ignition: true,
};
assert.equal(
  api.mergePositions([vehicle], [point])[0].status,
  "unknown",
  "missing speed is not verified idling",
);
assert.equal(
  api.mergePositions([vehicle], [{ ...point, speed: 0, ignition: null }])[0]
    .status,
  "unknown",
);
assert.equal(
  api.mergePositions([vehicle], [{ ...point, speed: 0, ignition: false }])[0]
    .status,
  "stopped",
);
assert.equal(
  api.mergePositions(
    [vehicle],
    [
      {
        ...point,
        speed: 0,
        eventDateTime: new Date(Date.now() - 120000).toISOString(),
        freshMinutes: 1,
      },
    ],
  )[0].status,
  "offline",
  "the Live view must use the server freshness policy",
);
const originalFormData = globalThis.FormData;
globalThis.FormData = class FormData {
  constructor() {
    this.parts = [];
  }
  append(...part) {
    this.parts.push(part);
  }
  getParts() {
    return this.parts;
  }
  toString() {
    return "[object FormData]";
  }
};
try {
  await api.sendMessage(
    "thread",
    { clientRequestId: "stable-media-id", kind: "VOICE" },
    { uri: "file:///voice.m4a", name: "voice.m4a", mimeType: "audio/mp4" },
    "branch-b",
  );
  assert.deepEqual(calls.at(-1).data.getParts(), [
    ["clientRequestId", "stable-media-id"],
    ["kind", "VOICE"],
    [
      "file",
      { uri: "file:///voice.m4a", name: "voice.m4a", type: "audio/mp4" },
    ],
  ]);
} finally {
  globalThis.FormData = originalFormData;
}
console.log(
  "Passed: IST day boundaries, unknown versus zero narration in three languages, trend labels and comparison caveats, retry-key preservation, branch/date/page propagation, review decisions, message receipts, native voice multipart and driver-submitted explanations.",
);

const presentation = await import(
  moduleUrl(await read("../src/telematics/services/ownerPresentation.js"))
);
const zero = {
  availability: "available",
  status: "empty",
  coverage: "complete",
  metrics: { count: { value: 0 } },
};
assert.equal(
  presentation.metricValue(zero, "count"),
  0,
  "a recorded zero must stay zero",
);
assert.equal(
  presentation.metricValue({ ...zero, availability: "unavailable" }, "count"),
  null,
  "disabled sections must not expose a zero",
);
assert.equal(
  presentation.metricValue({ ...zero, status: "error" }, "count"),
  null,
  "failed sections must not expose a zero",
);
assert.equal(
  presentation.metricValue(zero, "missing"),
  null,
  "missing fields must not become zero",
);
assert.equal(presentation.shortNumber(null, true), "—");
assert.equal(presentation.shortNumber(0, true), "₹0");
assert.deepEqual(
  presentation.groupSections(
    { diesel: zero, crew: zero, futureSource: zero },
    "Work",
  ),
  ["futureSource"],
  "new source sections must remain reachable",
);
assert.deepEqual(
  presentation.groupSections({ diesel: zero, crew: zero }, "People"),
  ["crew"],
);
console.log(
  "Passed: dashboard zero/unknown/error separation, money formatting and complete report-section navigation.",
);
