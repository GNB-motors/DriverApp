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
const driverContracts = moduleUrl(await read("../src/telematics/services/approvedDriverContracts.js"));
const source = (await read("../src/telematics/services/telematicsApi.js"))
  .replace(/['"]axios['"]/, JSON.stringify(import.meta.resolve("axios")))
  .replace(/['"]\.\/authEndpoint['"]/, JSON.stringify(endpoint))
  .replace(/['"]\.\/alertMetadata['"]/, JSON.stringify(metadata))
  .replace(/['"]\.\/approvedDriverContracts['"]/, JSON.stringify(driverContracts));
const { createTelematicsApi } = await import(moduleUrl(source));
const { default: axios } = await import("axios");
const calls = [];
axios.defaults.adapter = async (config) => {
  calls.push(config);
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
// The approved #313 base has no owner daily/rows/trends contract; the app must say so.
const unavailableCall = /not connected/;
await assert.rejects(api.ownerDaily("2026-10-28", "branch-a"), unavailableCall);
await assert.rejects(api.ownerTrends("2026-10-28", "branch-a"), unavailableCall);
await assert.rejects(api.ownerRows({ date: "2026-10-28", metric: "diesel", page: 4 }, "branch-a"), unavailableCall);
const callsBeforeUnavailable = calls.length;
await assert.rejects(api.ownerDaily("2026-10-27"), unavailableCall);
assert.equal(calls.length, callsBeforeUnavailable, "an unavailable contract must not send a request");
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
await assert.rejects(api.conversationMessages("thread", { before: "cursor" }, "branch-b"), unavailableCall);
await assert.rejects(api.messageReceipt("thread", "message", "ACKNOWLEDGE", "branch-b"), unavailableCall);
await assert.rejects(api.driverExplain("alert-id-1", { clientRequestId: "driver-rid-1", note: "Pump fault confirmed." }, "branch-b"), unavailableCall);
assert.equal(await api.crewMe(undefined), null, "a driver without an assigned truck has no crew card");
const crewBody = {
  clientRequestId: "saved-crew-action",
  expectedVersion: 4,
  action: "ACCEPT",
  proposalId: "saved-proposal",
  safelyStopped: true,
};
await api.crewAction("truck", crewBody, "branch-b");
assert.equal(calls.at(-1).url, "/app/v2/crew/truck/actions");
assert.equal(calls.at(-1).headers["Idempotency-Key"], "saved-crew-action");
const sentCrew = JSON.parse(calls.at(-1).data);
assert.equal("expectedVersion" in sentCrew || "safelyStopped" in sentCrew, false, "local-only crew fields are rejected by the strict backend schema");
await api.crewAction("truck", crewBody, "branch-b");
assert.deepEqual(JSON.parse(calls.at(-1).data), sentCrew, "a retried crew action sends the same body");
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
const callsBeforeAttachment = calls.length;
await assert.rejects(
  api.sendMessage("thread", { clientRequestId: "stable-media-id", kind: "VOICE" }, { uri: "file:///voice.m4a", name: "voice.m4a", mimeType: "audio/mp4" }, "branch-b"),
  unavailableCall,
);
assert.equal(calls.length, callsBeforeAttachment, "an unsupported attachment must not be uploaded");
console.log(
  "Passed: unavailable owner report/messaging contracts send nothing, retry-key preservation, review decisions and approved crew action bodies.",
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
