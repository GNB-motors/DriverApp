import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/telematics/guidance/navigationFormat.js', import.meta.url), 'utf8');
const { formatDistance, formatDuration, formatClock, maneuverIcon, decodePolyline6, boundsOf, routeOptionFacts } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('distances round the way a driver reads them', () => {
  assert.equal(formatDistance(4), '10 m');
  assert.equal(formatDistance(84), '80 m');
  assert.equal(formatDistance(337), '350 m');
  assert.equal(formatDistance(4249), '4.2 km');
  assert.equal(formatDistance(128400), '128 km');
  assert.equal(formatDistance(undefined), '');
  assert.equal(formatDistance(-1), '');
});

test('durations never show zero minutes', () => {
  assert.equal(formatDuration(20), '1 min');
  assert.equal(formatDuration(42 * 60), '42 min');
  assert.equal(formatDuration(3600), '1 h');
  assert.equal(formatDuration(3600 + 25 * 60), '1 h 25 min');
  assert.equal(formatDuration(null), '');
});

test('clock is 12-hour local time', () => {
  assert.equal(formatClock(new Date(2026, 9, 31, 0, 5).getTime()), '12:05 am');
  assert.equal(formatClock(new Date(2026, 9, 31, 15, 42).getTime()), '3:42 pm');
  assert.equal(formatClock(NaN), '');
});

test('maneuver icons follow left-hand traffic', () => {
  assert.equal(maneuverIcon({ type: 'Turn', modifier: 'Left' }), 'arrow-left-top');
  assert.equal(maneuverIcon({ type: 'Turn', modifier: 'SlightRight' }), 'arrow-top-right');
  assert.equal(maneuverIcon({ type: 'Turn', modifier: 'UTurn' }), 'arrow-u-right-top');
  assert.equal(maneuverIcon({ type: 'Turn', modifier: 'UTurn', drivingSide: 'right' }), 'arrow-u-left-top');
  assert.equal(maneuverIcon({ type: 'Roundabout', modifier: 'Right' }), 'rotate-right');
  assert.equal(maneuverIcon({ type: 'Arrive', modifier: 'Left' }), 'flag-checkered');
  assert.equal(maneuverIcon({ type: 'Fork' }), 'call-split');
  assert.equal(maneuverIcon({}), 'arrow-up');
});

test('polyline6 decodes to [lng, lat] and frames bounds', () => {
  // Two points: (38.5, -120.2) and (40.7, -120.95), precision 6.
  const points = decodePolyline6('_izlhA~rlgdF_{geC~ywl@');
  assert.deepEqual(points, [[-120.2, 38.5], [-120.95, 40.7]]);
  assert.deepEqual(boundsOf(points), [-120.95, 38.5, -120.2, 40.7]);
  assert.deepEqual(decodePolyline6(''), []);
  assert.throws(() => decodePolyline6('_izlhA~rlgdF_'), /Truncated/);
  assert.equal(boundsOf([]), null);
});

test('route facts show only what the server sent', () => {
  const now = new Date(2026, 9, 31, 10, 0).getTime();
  assert.deepEqual(routeOptionFacts({ lengthM: 42300, eta: { p20: 3000, p50: 3600, p80: 4800 }, tollPlazas: [{}, {}] }, now),
    { duration: '1 h', arrival: '11:00 am', range: '50 min–1 h 20 min', distance: '42 km', tolls: '2 tolls' });
  assert.deepEqual(routeOptionFacts({ lengthM: 900, eta: { p20: 100, p50: 120, p80: 130 }, tollPlazas: [] }, now),
    { duration: '2 min', arrival: '10:02 am', range: '', distance: '900 m', tolls: 'No tolls' });
  assert.deepEqual(routeOptionFacts({}, now), { duration: '', arrival: '', range: '', distance: '', tolls: '' });
});
