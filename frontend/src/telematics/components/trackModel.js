/**
 * trackModel — the pure maths behind the app's Track & Replay screen.
 *
 * It mirrors the web Live Tracking "Track" mode (main-frontend
 * pages/LiveTracking: useTrackMode, trackPlayback, trackLayersModel):
 *   - the source is GET /fleet-view/vehicles/:reg/track
 *     ({ points:[{t,lat,lng,speedKmh,ign}], segments, stops, events, summary });
 *   - the playhead is a TIME, and 1x plays one real minute per second;
 *   - the full route is drawn under the travelled part, gaps with no signal
 *     are dashed and never drawn as road.
 *
 * No React and no map SDK in here, so the rules can be tested in node.
 */

/** One real minute of driving plays in one second, at 1x (web trackPlayback). */
export const MS_PER_TRACK_MINUTE = 60;
/** Same speed buttons as the web timeline. */
export const PLAYBACK_SPEEDS = [2, 10, 40, 120];
export const DEFAULT_SPEED = 10;
/** Over this the playhead badge says Overspeed (web TrackTimeline). */
export const OVERSPEED_KMH = 60;

/** Trail colours by leg kind — the web's --rd-leg-* tokens. */
export const SEGMENT_STYLES = {
  LADEN: { color: "#2563EB", width: 5, dash: null, label: "Loaded" },
  EMPTY: { color: "#64748B", width: 4, dash: [10, 8], label: "Empty" },
  REPOSITION: { color: "#0D9488", width: 4, dash: [2, 8], label: "Reposition" },
  UNKNOWN: { color: "#2563EB", width: 4, dash: null, label: "Route" },
  GAP: { color: "#94A3B8", width: 2, dash: [4, 10], label: "No signal" },
};

/** Replay look — the web's replayAppearance (grey route, blue travelled). */
export const REPLAY_ROUTE = { color: "#9A9AA5", width: 4, dash: [2, 8] };
export const REPLAY_TRAVELLED = { color: "#2F58EE", width: 5 };

/** Stop pins by reason — the web's STOP_MARKERS with tokens resolved. */
export const STOP_STYLES = {
  LOADING: { color: "#1F3FBF", label: "Loading", icon: "cube-outline" },
  UNLOADING: { color: "#2563EB", label: "Unloading", icon: "cube" },
  FUEL: { color: "#0EA5E9", label: "Fuel", icon: "water-outline" },
  REST: { color: "#D97706", label: "Rest", icon: "cafe-outline" },
  OVERNIGHT: { color: "#4B5563", label: "Overnight", icon: "moon-outline" },
  QUEUE: { color: "#E59A0B", label: "Queue", icon: "hourglass-outline" },
  WORKSHOP: { color: "#BE123C", label: "Workshop", icon: "construct-outline" },
  UNEXPLAINED: { color: "#8A93A3", label: "Stop", icon: "help-circle-outline" },
};

/** Event markers by kind — the web's EVENT_MARKERS with tokens resolved. */
export const EVENT_STYLES = {
  OVERSPEED: { color: "#EF4444", label: "Overspeed" },
  DETOUR: { color: "#DC2626", label: "Detour" },
  FUEL_FILL: { color: "#2563EB", label: "Fuel fill" },
  FUEL_DROP: { color: "#0D9488", label: "Fuel drop" },
  GPS_GAP: { color: "#8A93A3", label: "No GPS" },
  HARSH: { color: "#E59A0B", label: "Harsh driving" },
};

const IST_OFFSET_MS = 5.5 * 3600 * 1000;
const DAY_MS = 86400000;
/** A leg this long in time AND distance with no fix in between is a gap. */
const GAP_LEG_MS = 30 * 60000;
const GAP_LEG_KM = 2;
/** The truck only glides between fixes this close in time; otherwise it waits. */
const INTERPOLATE_MAX_MS = 15 * 60000;

const finite = (value) => value != null && value !== "" && Number.isFinite(Number(value));
const timeOf = (value) => {
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(ms) ? ms : NaN;
};

export function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Degrees clockwise from north (web trackLayersModel.bearingBetween). */
export function bearingBetween(from, to) {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Index of the last point at or before `ms` (0 before the path). */
export function indexAtTime(points, ms) {
  let lo = 0;
  let hi = points.length - 1;
  if (hi < 0 || ms <= points[0].tMs) return 0;
  if (ms >= points[hi].tMs) return hi;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (points[mid].tMs <= ms) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

function normalizePoints(raw) {
  return (Array.isArray(raw) ? raw : [])
    .map((p) => ({
      tMs: timeOf(p?.t),
      lat: Number(p?.lat),
      lng: Number(p?.lng),
      speedKmh: finite(p?.speedKmh) ? Number(p.speedKmh) : null,
      ign: typeof p?.ign === "boolean" ? p.ign : null,
      gapBefore: p?.gap === true,
    }))
    .filter(
      (p) =>
        Number.isFinite(p.tMs) &&
        Number.isFinite(p.lat) &&
        Number.isFinite(p.lng) &&
        Math.abs(p.lat) <= 90 &&
        Math.abs(p.lng) <= 180 &&
        !(p.lat === 0 && p.lng === 0),
    )
    .sort((a, b) => a.tMs - b.tMs)
    .filter((p, i, all) => i === 0 || p.tMs !== all[i - 1].tMs);
}

function normalizeStops(raw, startMs, endMs) {
  return (Array.isArray(raw) ? raw : [])
    .map((stop, index) => {
      const lat = finite(stop?.lat) ? Number(stop.lat) : finite(stop?.place?.lat) ? Number(stop.place.lat) : null;
      const lng = finite(stop?.lng) ? Number(stop.lng) : finite(stop?.place?.lng) ? Number(stop.place.lng) : null;
      const s = timeOf(stop?.startAt);
      const e = timeOf(stop?.endAt);
      const reason = STOP_STYLES[stop?.reason] ? stop.reason : "UNEXPLAINED";
      return {
        id: stop?.id || `stop-${index}`,
        startMs: s,
        endMs: Number.isFinite(e) ? e : s,
        durationMin: finite(stop?.durationMin)
          ? Number(stop.durationMin)
          : Number.isFinite(e) ? Math.round((e - s) / 60000) : 0,
        reason,
        reasonWhy: stop?.reasonWhy || null,
        placeName: stop?.place?.name?.trim?.() || null,
        lat,
        lng,
      };
    })
    .filter((s) => Number.isFinite(s.startMs) && s.startMs <= endMs && s.endMs >= startMs)
    .sort((a, b) => a.startMs - b.startMs);
}

function normalizeEvents(raw) {
  return (Array.isArray(raw) ? raw : [])
    .map((event) => ({
      kind: String(event?.kind || ""),
      atMs: timeOf(event?.at),
      endMs: timeOf(event?.endAt),
      text: event?.text || EVENT_STYLES[event?.kind]?.label || "Event",
      lat: finite(event?.lat) ? Number(event.lat) : null,
      lng: finite(event?.lng) ? Number(event.lng) : null,
    }))
    .filter((e) => e.kind && Number.isFinite(e.atMs))
    .sort((a, b) => a.atMs - b.atMs);
}

function normalizeSegments(raw) {
  return (Array.isArray(raw) ? raw : [])
    .map((s) => ({
      kind: SEGMENT_STYLES[s?.kind] ? s.kind : "UNKNOWN",
      fromMs: timeOf(s?.fromT),
      toMs: timeOf(s?.toT),
    }))
    .filter((s) => Number.isFinite(s.fromMs) && Number.isFinite(s.toMs) && s.toMs > s.fromMs)
    .sort((a, b) => a.fromMs - b.fromMs);
}

/** Stationary runs (speed <= 3 km/h for 3+ min) — only used when the API sent no stops. */
function deriveStops(points) {
  const stops = [];
  let start = null;
  const close = (endIdx) => {
    if (start == null) return;
    const a = points[start];
    const b = points[endIdx];
    if (b.tMs - a.tMs >= 3 * 60000)
      stops.push({
        id: `stop-${stops.length}`,
        startMs: a.tMs,
        endMs: b.tMs,
        durationMin: Math.round((b.tMs - a.tMs) / 60000),
        reason: "UNEXPLAINED",
        reasonWhy: null,
        placeName: null,
        lat: a.lat,
        lng: a.lng,
      });
    start = null;
  };
  points.forEach((p, i) => {
    const still = p.speedKmh != null && p.speedKmh <= 3;
    if (still && start == null) start = i;
    if (!still && start != null) close(i - 1);
  });
  if (start != null && points.length) close(points.length - 1);
  return stops;
}

/** Leg i (points[i-1] → points[i]) is a gap: a GPS_GAP event starts in it, or it is long in time and distance. */
function gapLegs(points, events) {
  const gapStarts = events.filter((e) => e.kind === "GPS_GAP").map((e) => e.atMs);
  const legs = new Array(points.length).fill(false);
  let g = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    while (g < gapStarts.length && gapStarts[g] < a.tMs - 1000) g += 1;
    const eventGap = g < gapStarts.length && gapStarts[g] <= b.tMs - 1000;
    const longLeg = b.tMs - a.tMs >= GAP_LEG_MS && haversineKm(a, b) >= GAP_LEG_KM;
    legs[i] = eventGap || longLeg || b.gapBefore;
  }
  return legs;
}

/**
 * Split the path into continuous runs of one kind. Neighbouring runs share
 * their boundary point, so the drawn line has no holes.
 */
function buildRuns(points, segments, gaps) {
  const runs = [];
  let seg = 0;
  const kindAt = (ms) => {
    while (seg < segments.length && segments[seg].toMs < ms) seg += 1;
    const s = segments[seg];
    return s && s.fromMs <= ms ? s.kind : "UNKNOWN";
  };
  let current = null;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const kind = gaps[i] ? "GAP" : kindAt((a.tMs + b.tMs) / 2);
    if (!current || current.kind !== kind) {
      current = { key: `${kind}-${a.tMs}`, kind, startIdx: i - 1, endIdx: i };
      runs.push(current);
    } else current.endIdx = i;
  }
  return runs.map((run) => {
    const slice = points.slice(run.startIdx, run.endIdx + 1);
    return {
      ...run,
      fromMs: slice[0].tMs,
      toMs: slice[slice.length - 1].tMs,
      coords: slice.map((p) => ({ latitude: p.lat, longitude: p.lng })),
    };
  });
}

function buildSummary(raw, points, stops, cumKm, gaps) {
  const totalKm = cumKm.length ? cumKm[cumKm.length - 1] : 0;
  let driveMs = 0;
  let maxKmh = 0;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < points.length; i += 1) {
    const s = points[i].speedKmh;
    if (s != null && s > maxKmh) maxKmh = s;
    if (s != null && s > 3) {
      sum += s;
      n += 1;
    }
    if (i > 0 && !gaps[i] && s != null && s > 3) driveMs += points[i].tMs - points[i - 1].tMs;
  }
  const computed = {
    km: Math.round(totalKm * 10) / 10,
    driveMin: Math.round(driveMs / 60000),
    stopMin: stops.reduce((m, s) => m + (s.durationMin || 0), 0),
    avgKmh: n ? Math.round(sum / n) : null,
    maxKmh: maxKmh ? Math.round(maxKmh) : null,
  };
  if (!raw || typeof raw !== "object") return computed;
  return {
    km: finite(raw.km) ? Math.round(Number(raw.km) * 10) / 10 : computed.km,
    driveMin: finite(raw.driveMin) ? Number(raw.driveMin) : computed.driveMin,
    stopMin: finite(raw.stopMin) ? Number(raw.stopMin) : computed.stopMin,
    avgKmh: finite(raw.avgKmh) ? Math.round(Number(raw.avgKmh)) : computed.avgKmh,
    maxKmh: finite(raw.maxKmh) ? Math.round(Number(raw.maxKmh)) : computed.maxKmh,
  };
}

/** Turn a /fleet-view track response into everything the screen draws. */
export function buildTrack(raw) {
  const points = normalizePoints(raw?.points);
  const startMs = points.length ? points[0].tMs : NaN;
  const endMs = points.length ? points[points.length - 1].tMs : NaN;
  const events = normalizeEvents(raw?.events);
  const segments = normalizeSegments(raw?.segments);
  const apiStops = normalizeStops(raw?.stops, startMs, endMs);
  const stops = Array.isArray(raw?.stops) ? apiStops : deriveStops(points);
  const gaps = gapLegs(points, events);
  const cumKm = new Array(points.length).fill(0);
  for (let i = 1; i < points.length; i += 1)
    cumKm[i] = cumKm[i - 1] + (gaps[i] ? 0 : haversineKm(points[i - 1], points[i]));
  const runs = points.length > 1 ? buildRuns(points, segments, gaps) : [];
  // Stops without their own coordinates sit where the truck was when they began.
  stops.forEach((stop) => {
    if (stop.lat == null || stop.lng == null) {
      const p = points[indexAtTime(points, stop.startMs)];
      if (p) {
        stop.lat = p.lat;
        stop.lng = p.lng;
      }
    }
  });
  events.forEach((event) => {
    if (event.lat == null || event.lng == null) {
      const p = points[indexAtTime(points, event.atMs)];
      if (p) {
        event.lat = p.lat;
        event.lng = p.lng;
      }
    }
  });
  const moments = [
    ...stops.map((s) => s.startMs),
    ...events.map((e) => e.atMs),
  ]
    .filter((ms) => ms >= startMs && ms <= endMs)
    .sort((a, b) => a - b);
  return {
    points,
    runs,
    stops,
    events,
    segments,
    gaps,
    cumKm,
    moments,
    startMs,
    endMs,
    kinds: [...new Set(runs.map((r) => r.kind))],
    summary: buildSummary(raw?.summary, points, stops, cumKm, gaps),
    downsampled: Boolean(raw?.downsampled),
    rawCount: finite(raw?.rawCount) ? Number(raw.rawCount) : points.length,
  };
}

/**
 * Where the truck is at `ms`: interpolated between the two fixes around it
 * when they are close in time, otherwise held at the last fix (the truck was
 * dark — it is never slid across ground nobody saw).
 */
export function playheadAt(track, ms) {
  const { points } = track || {};
  if (!points?.length) return null;
  const t = Math.max(track.startMs, Math.min(track.endMs, ms));
  const lo = indexAtTime(points, t);
  const a = points[lo];
  const b = points[Math.min(lo + 1, points.length - 1)];
  const dt = b.tMs - a.tMs;
  const glide = b !== a && dt > 0 && dt <= INTERPOLATE_MAX_MS && !track.gaps[lo + 1];
  const f = glide ? (t - a.tMs) / dt : 0;
  const lat = a.lat + (b.lat - a.lat) * f;
  const lng = a.lng + (b.lng - a.lng) * f;
  let heading = null;
  for (let i = lo; i < points.length - 1 && heading == null; i += 1)
    if (points[i + 1].lat !== points[i].lat || points[i + 1].lng !== points[i].lng)
      heading = bearingBetween(points[i], points[i + 1]);
  for (let i = lo; i > 0 && heading == null; i -= 1)
    if (points[i - 1].lat !== points[i].lat || points[i - 1].lng !== points[i].lng)
      heading = bearingBetween(points[i - 1], points[i]);
  const near = f > 0.5 ? b : a;
  const km = track.cumKm[lo] + (glide ? (track.cumKm[lo + 1] - track.cumKm[lo]) * f : 0);
  return {
    atMs: t,
    index: lo,
    latitude: lat,
    longitude: lng,
    heading: heading ?? 0,
    speedKmh: near.speedKmh,
    ign: near.ign ?? a.ign,
    km,
  };
}

/** The travelled part of the route up to the playhead, run by run. */
export function travelledRuns(track, playhead) {
  if (!track?.runs?.length || !playhead) return [];
  const out = [];
  for (const run of track.runs) {
    if (run.fromMs > playhead.atMs) break;
    if (run.toMs <= playhead.atMs) {
      out.push({ key: run.key, gap: run.kind === "GAP", coords: run.coords });
      continue;
    }
    const upto = Math.max(0, playhead.index - run.startIdx);
    const coords = run.coords.slice(0, upto + 1);
    coords.push({ latitude: playhead.latitude, longitude: playhead.longitude });
    if (coords.length > 1) out.push({ key: run.key, gap: run.kind === "GAP", coords });
  }
  return out;
}

/** Distance along the route at the playhead, scaled to the summary total. */
export function coveredKm(track, playhead) {
  if (!track || !playhead) return 0;
  const measured = track.cumKm[track.cumKm.length - 1] || 0;
  if (!measured) return 0;
  return (playhead.km / measured) * (track.summary.km || measured);
}

export function nextMomentAfter(track, ms) {
  return track?.moments?.find((m) => m > ms + 1000) ?? null;
}

export function previousMomentBefore(track, ms) {
  const list = track?.moments || [];
  for (let i = list.length - 1; i >= 0; i -= 1) if (list[i] < ms - 1000) return list[i];
  return null;
}

/** How the truck is doing at the playhead — the web's status badge. */
export function playheadStatus(playhead) {
  const speed = Math.round(playhead?.speedKmh || 0);
  if (speed > OVERSPEED_KMH)
    return { key: "overspeed", label: `Overspeed · ${speed} km/h`, color: "#DC2626", bg: "#FEE2E2", icon: "flash" };
  if (speed > 3)
    return { key: "moving", label: `Moving · ${speed} km/h`, color: "#15803D", bg: "#DCFCE7", icon: "speedometer" };
  if (playhead?.ign === true)
    return { key: "idling", label: "Idling · Engine ON", color: "#B45309", bg: "#FEF3C7", icon: "pulse" };
  return { key: "stopped", label: "Stopped · 0 km/h", color: "#7E22CE", bg: "#F3E8FF", icon: "radio-button-on" };
}

/** Fraction (0..1) of the drive's time span. */
export function fractionOf(track, ms) {
  if (!track?.points?.length) return 0;
  const span = Math.max(1, track.endMs - track.startMs);
  return Math.max(0, Math.min(1, (ms - track.startMs) / span));
}

export function timeAtFraction(track, fraction) {
  if (!track?.points?.length) return 0;
  return track.startMs + (track.endMs - track.startMs) * Math.max(0, Math.min(1, fraction));
}

// ── Ranges ───────────────────────────────────────────────────────────────

/** YYYY-MM-DD of a moment on the IST calendar. */
export function istDate(ms) {
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
}

const istDayStart = (date) => Date.parse(`${date}T00:00:00+05:30`);

export const RANGE_PRESETS = [
  { key: "last24", label: "Last 24 hours", short: "24h" },
  { key: "today", label: "Today", short: "Today" },
  { key: "yesterday", label: "Yesterday", short: "Yest" },
  { key: "last7", label: "Last 7 days", short: "7d" },
  { key: "custom", label: "Choose dates…", short: "Dates" },
];

/**
 * { from, to, label } in ISO for a preset. Custom ranges are whole IST days,
 * at most 8 of them (the web's trailDateWindow rule), never past now.
 */
export function resolveRange(preset, custom, now = Date.now()) {
  if (preset === "today") {
    const from = istDayStart(istDate(now));
    return { from: new Date(from).toISOString(), to: new Date(now).toISOString(), label: "Today" };
  }
  if (preset === "yesterday") {
    const from = istDayStart(istDate(now - DAY_MS));
    return {
      from: new Date(from).toISOString(),
      to: new Date(from + DAY_MS - 1).toISOString(),
      label: "Yesterday",
    };
  }
  if (preset === "last7")
    return {
      from: new Date(now - 7 * DAY_MS).toISOString(),
      to: new Date(now).toISOString(),
      label: "Last 7 days",
    };
  if (preset === "custom" && custom?.fromDate && custom?.toDate) {
    const from = istDayStart(custom.fromDate);
    const to = Math.min(now, istDayStart(custom.toDate) + DAY_MS - 1);
    return {
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
      label:
        custom.fromDate === custom.toDate
          ? formatIstDay(from)
          : `${formatIstDay(from)} – ${formatIstDay(to)}`,
    };
  }
  return {
    from: new Date(now - DAY_MS).toISOString(),
    to: new Date(now).toISOString(),
    label: "Last 24 hours",
  };
}

/** Error text for a custom range, or null when it is fine. */
export function customRangeError(fromDate, toDate, now = Date.now()) {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(fromDate || "") || !re.test(toDate || "")) return "Choose a start and an end date.";
  if (!Number.isFinite(istDayStart(fromDate)) || !Number.isFinite(istDayStart(toDate)))
    return "Choose valid dates.";
  if (toDate < fromDate) return "End date must be on or after the start date.";
  if (toDate > istDate(now)) return "Choose today or an earlier date.";
  if (istDayStart(toDate) - istDayStart(fromDate) >= 8 * DAY_MS)
    return "Choose a range of up to 8 days.";
  return null;
}

// ── Formatting (IST, like the web) ──────────────────────────────────────

export function formatIstDay(ms) {
  return new Date(ms).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
  });
}

export function formatIstTime(ms) {
  if (!Number.isFinite(ms)) return "--:--";
  return new Date(ms).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatIstDateTime(ms) {
  if (!Number.isFinite(ms)) return "--";
  return new Date(ms).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function formatDuration(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h}h ${rest}m` : `${h}h`;
}

/** Up to `max` coordinates spread along the path, for fitting the camera. */
export function fitCoordinates(track, max = 300) {
  const pts = track?.points || [];
  if (!pts.length) return [];
  const step = Math.max(1, Math.ceil(pts.length / max));
  const out = [];
  for (let i = 0; i < pts.length; i += step) out.push({ latitude: pts[i].lat, longitude: pts[i].lng });
  const last = pts[pts.length - 1];
  out.push({ latitude: last.lat, longitude: last.lng });
  return out;
}
