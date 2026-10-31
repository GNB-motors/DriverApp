// Display helpers for the navigation screen. No imports: tests load this file directly.
// Number(null) is 0, so a missing value must not pass as a measured zero.
const measured = value => (value === null || value === undefined || value === '' ? NaN : Number(value));
export function formatDistance(metres) {
  const m = measured(metres);
  if (!Number.isFinite(m) || m < 0) return '';
  if (m < 100) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  if (m < 1000) return `${Math.round(m / 50) * 50} m`;
  if (m < 10000) return `${(Math.round(m / 100) / 10).toFixed(1)} km`;
  return `${Math.round(m / 1000)} km`;
}

export function formatDuration(seconds) {
  const s = measured(seconds);
  if (!Number.isFinite(s) || s < 0) return '';
  const minutes = Math.max(1, Math.round(s / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

// 12-hour clock without Intl: Hermes builds differ in locale support.
export function formatClock(ms) {
  const date = new Date(ms);
  if (!Number.isFinite(date.getTime())) return '';
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours % 12 || 12}:${minutes} ${hours < 12 ? 'am' : 'pm'}`;
}

const MODIFIER_ICONS = {
  Straight: 'arrow-up',
  SlightLeft: 'arrow-top-left',
  SlightRight: 'arrow-top-right',
  Left: 'arrow-left-top',
  Right: 'arrow-right-top',
  SharpLeft: 'arrow-left-bottom',
  SharpRight: 'arrow-right-bottom',
};
const ROUNDABOUTS = new Set(['Roundabout', 'Rotary', 'RoundaboutTurn', 'ExitRoundabout', 'ExitRotary']);

// India drives on the left: roundabouts run clockwise and U-turns go right.
export function maneuverIcon({ type, modifier, drivingSide = 'left' } = {}) {
  const left = drivingSide !== 'right';
  if (type === 'Arrive') return 'flag-checkered';
  if (type === 'Depart') return 'navigation';
  if (ROUNDABOUTS.has(type)) return left ? 'rotate-right' : 'rotate-left';
  if (modifier === 'UTurn') return left ? 'arrow-u-right-top' : 'arrow-u-left-top';
  if (MODIFIER_ICONS[modifier]) return MODIFIER_ICONS[modifier];
  if (type === 'Merge') return 'call-merge';
  if (type === 'Fork') return 'call-split';
  return 'arrow-up';
}

export function decodePolyline6(encoded) {
  if (typeof encoded !== 'string' || !encoded) return [];
  const points = [];
  let index = 0; let lat = 0; let lng = 0;
  const next = () => {
    let result = 0; let shift = 0; let byte;
    do {
      if (index >= encoded.length) throw new Error('Truncated route geometry');
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (index < encoded.length) {
    lat += next(); lng += next();
    points.push([lng / 1e6, lat / 1e6]);
  }
  return points;
}

export function boundsOf(coordinates) {
  const points = (coordinates || []).filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  if (!points.length) return null;
  let [west, south] = points[0]; let [east, north] = points[0];
  for (const [lng, lat] of points) {
    west = Math.min(west, lng); east = Math.max(east, lng);
    south = Math.min(south, lat); north = Math.max(north, lat);
  }
  return [west, south, east, north];
}

// One line per route option: what the server measured, nothing estimated here.
export function routeOptionFacts(option, now = Date.now()) {
  const eta = option?.eta || {};
  const [p20, p50, p80] = [eta.p20, eta.p50, eta.p80].map(measured);
  const range = Number.isFinite(p20) && Number.isFinite(p80) && p80 - p20 >= 600 ? `${formatDuration(p20)}–${formatDuration(p80)}` : '';
  const tolls = Array.isArray(option?.tollPlazas) ? option.tollPlazas.length : null;
  return {
    duration: Number.isFinite(p50) ? formatDuration(p50) : '',
    arrival: Number.isFinite(p50) ? formatClock(now + p50 * 1000) : '',
    range,
    distance: formatDistance(option?.lengthM),
    tolls: tolls === null ? '' : tolls === 0 ? 'No tolls' : `${tolls} toll${tolls === 1 ? '' : 's'}`,
  };
}
