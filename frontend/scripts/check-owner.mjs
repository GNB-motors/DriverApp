import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const moduleUrl = (source) =>
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const { istDay, shiftDay, validBusinessDay, reportSpeech } = await import(
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
const endpoint = moduleUrl(
  await read("../src/telematics/services/authEndpoint.js"),
);
const metadata = moduleUrl(
  await read("../src/telematics/services/alertMetadata.js"),
);
const source = (await read("../src/telematics/services/telematicsApi.js"))
  .replace(/['"]axios['"]/, JSON.stringify(import.meta.resolve("axios")))
  .replace(/['"]\.\/authEndpoint['"]/, JSON.stringify(endpoint))
  .replace(/['"]\.\/alertMetadata['"]/, JSON.stringify(metadata));
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
await api.ownerDaily("2026-10-28", "branch-a");
assert.equal(calls.at(-1).url, "/app/v2/reports/daily");
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
await api.conversationMessages("thread", { before: "cursor" }, "branch-b");
assert.equal(calls.at(-1).params.before, "cursor");
await api.messageReceipt("thread", "message", "ACKNOWLEDGE", "branch-b");
assert.deepEqual(JSON.parse(calls.at(-1).data), { action: "ACKNOWLEDGE" });
assert.equal(calls.at(-1).headers.Authorization, "Bearer owner-session");
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
  "Passed: IST day boundaries, unknown versus zero narration in three languages, retry-key preservation, branch/date/page propagation, review decisions, message receipts and native voice multipart.",
);
