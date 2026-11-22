import {
  MS_PER_TRACK_MINUTE,
  buildTrack,
  coveredKm,
  customRangeError,
  indexAtTime,
  nextMomentAfter,
  playheadAt,
  playheadStatus,
  previousMomentBefore,
  resolveRange,
  travelledRuns,
} from "../trackModel";

const T0 = Date.parse("2026-11-20T04:00:00.000Z"); // 09:30 IST
const at = (min) => new Date(T0 + min * 60000).toISOString();

// A drive heading north-east, one fix a minute, then a 2 h silence, then more driving.
function sampleResponse() {
  const points = [];
  for (let i = 0; i <= 10; i += 1)
    points.push({ t: at(i), lat: 21 + i * 0.01, lng: 81 + i * 0.01, speedKmh: i < 5 ? 50 : 0, ign: true });
  for (let i = 0; i <= 5; i += 1)
    points.push({ t: at(130 + i), lat: 22 + i * 0.01, lng: 82 + i * 0.01, speedKmh: 40, ign: true });
  return {
    points,
    segments: [
      { fromT: at(0), toT: at(5), kind: "LADEN" },
      { fromT: at(5), toT: at(135), kind: "EMPTY" },
    ],
    stops: [
      { id: "s1", startAt: at(5), endAt: at(10), durationMin: 5, reason: "FUEL", place: { name: "HP Pump", lat: 21.05, lng: 81.05 } },
    ],
    events: [
      { at: at(10), endAt: at(130), kind: "GPS_GAP", text: "No GPS for 120 min" },
      { at: at(2), kind: "OVERSPEED", text: "72 km/h", lat: 21.02, lng: 81.02 },
    ],
    summary: { km: 40.2, driveMin: 10, stopMin: 5, avgKmh: 45, maxKmh: 72 },
  };
}

describe("trackModel", () => {
  test("buildTrack normalises points, keeps the summary and splits runs by leg and gap", () => {
    const track = buildTrack(sampleResponse());
    expect(track.points).toHaveLength(17);
    expect(track.summary.km).toBe(40.2);
    expect(track.runs.map((r) => r.kind)).toEqual(["LADEN", "EMPTY", "GAP", "EMPTY"]);
    // Neighbouring runs share their boundary point: no hole in the drawn line.
    for (let i = 1; i < track.runs.length; i += 1)
      expect(track.runs[i].coords[0]).toEqual(track.runs[i - 1].coords[track.runs[i - 1].coords.length - 1]);
    expect(track.stops[0]).toMatchObject({ reason: "FUEL", placeName: "HP Pump", lat: 21.05 });
    expect(track.moments).toEqual([T0 + 2 * 60000, T0 + 5 * 60000, T0 + 10 * 60000]);
  });

  test("drops bad fixes and duplicate timestamps, sorts by time", () => {
    const track = buildTrack({
      points: [
        { t: at(2), lat: 21.2, lng: 81.2 },
        { t: at(1), lat: 21.1, lng: 81.1 },
        { t: at(1), lat: 21.1, lng: 81.1 },
        { t: "garbage", lat: 21, lng: 81 },
        { t: at(3), lat: 0, lng: 0 },
        { t: at(4), lat: 120, lng: 81 },
      ],
    });
    expect(track.points.map((p) => p.lat)).toEqual([21.1, 21.2]);
    expect(track.runs).toHaveLength(1);
    expect(track.runs[0].kind).toBe("UNKNOWN");
  });

  test("playhead glides between close fixes but waits through a signal gap", () => {
    const track = buildTrack(sampleResponse());
    const mid = playheadAt(track, T0 + 30000); // halfway between fix 0 and 1
    expect(mid.latitude).toBeCloseTo(21.005, 6);
    expect(mid.heading).toBeGreaterThan(0);
    expect(mid.heading).toBeLessThan(90);
    const dark = playheadAt(track, T0 + 60 * 60000); // inside the 2 h silence
    expect(dark.latitude).toBeCloseTo(21.1, 6); // held at the last fix before it
    expect(playheadAt(track, T0 - 1e9).atMs).toBe(track.startMs);
    expect(playheadAt(track, T0 + 1e9).atMs).toBe(track.endMs);
  });

  test("travelled runs end exactly at the truck", () => {
    const track = buildTrack(sampleResponse());
    const p = playheadAt(track, T0 + 2.5 * 60000);
    const done = travelledRuns(track, p);
    expect(done).toHaveLength(1);
    const last = done[0].coords[done[0].coords.length - 1];
    expect(last).toEqual({ latitude: p.latitude, longitude: p.longitude });
    expect(travelledRuns(track, playheadAt(track, track.endMs))).toHaveLength(track.runs.length);
  });

  test("covered km scales to the summary total", () => {
    const track = buildTrack(sampleResponse());
    expect(coveredKm(track, playheadAt(track, track.startMs))).toBe(0);
    expect(coveredKm(track, playheadAt(track, track.endMs))).toBeCloseTo(40.2, 6);
  });

  test("next / previous moments step through stops and events", () => {
    const track = buildTrack(sampleResponse());
    expect(nextMomentAfter(track, T0)).toBe(T0 + 2 * 60000);
    expect(nextMomentAfter(track, T0 + 2 * 60000)).toBe(T0 + 5 * 60000);
    expect(previousMomentBefore(track, T0 + 5 * 60000)).toBe(T0 + 2 * 60000);
    expect(nextMomentAfter(track, T0 + 10 * 60000)).toBeNull();
  });

  test("indexAtTime finds the last fix at or before a time", () => {
    const pts = [{ tMs: 10 }, { tMs: 20 }, { tMs: 30 }];
    expect(indexAtTime(pts, 5)).toBe(0);
    expect(indexAtTime(pts, 20)).toBe(1);
    expect(indexAtTime(pts, 29)).toBe(1);
    expect(indexAtTime(pts, 99)).toBe(2);
  });

  test("playback rule: 1x plays one real minute per second", () => {
    expect(1000 * 1 * MS_PER_TRACK_MINUTE).toBe(60000);
  });

  test("status badge follows the web thresholds", () => {
    expect(playheadStatus({ speedKmh: 72 }).key).toBe("overspeed");
    expect(playheadStatus({ speedKmh: 30 }).key).toBe("moving");
    expect(playheadStatus({ speedKmh: 0, ign: true }).key).toBe("idling");
    expect(playheadStatus({ speedKmh: 0, ign: false }).key).toBe("stopped");
  });

  test("ranges are IST days and custom ranges are validated", () => {
    const now = Date.parse("2026-11-22T10:00:00+05:30");
    const y = resolveRange("yesterday", null, now);
    expect(y.from).toBe(new Date("2026-11-21T00:00:00+05:30").toISOString());
    expect(y.to).toBe(new Date(Date.parse("2026-11-22T00:00:00+05:30") - 1).toISOString());
    const today = resolveRange("today", null, now);
    expect(today.from).toBe(new Date("2026-11-22T00:00:00+05:30").toISOString());
    const c = resolveRange("custom", { fromDate: "2026-11-20", toDate: "2026-11-22" }, now);
    expect(c.to).toBe(new Date(now).toISOString()); // never past now
    expect(customRangeError("2026-11-20", "2026-11-22", now)).toBeNull();
    expect(customRangeError("2026-11-22", "2026-11-20", now)).toMatch(/on or after/);
    expect(customRangeError("2026-11-01", "2026-11-20", now)).toMatch(/8 days/);
    expect(customRangeError("2026-11-20", "2026-11-23", now)).toMatch(/today or an earlier/);
  });

  test("live-trail fallback: no stops from the API are derived from stationary runs", () => {
    const points = [];
    for (let i = 0; i <= 10; i += 1)
      points.push({ t: at(i), lat: 21, lng: 81 + (i < 2 ? i * 0.01 : 0.01), speedKmh: i < 2 ? 40 : 0 });
    const track = buildTrack({ points, source: "livetracking" });
    expect(track.stops).toHaveLength(1);
    expect(track.stops[0].durationMin).toBe(8);
  });
});
