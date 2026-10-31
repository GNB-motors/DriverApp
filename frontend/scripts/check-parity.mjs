import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const dataModule = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const endpoint = dataModule(await read('../src/telematics/services/authEndpoint.js'));
const metadata = dataModule(await read('../src/telematics/services/alertMetadata.js'));
const driverContracts = dataModule(await read('../src/telematics/services/approvedDriverContracts.js'));
const source = (await read('../src/telematics/services/telematicsApi.js'))
  .replace(/['"]axios['"]/, JSON.stringify(import.meta.resolve('axios')))
  .replace(/['"]\.\/authEndpoint['"]/, JSON.stringify(endpoint))
  .replace(/['"]\.\/alertMetadata['"]/, JSON.stringify(metadata))
  .replace(/['"]\.\/approvedDriverContracts['"]/, JSON.stringify(driverContracts));
const { createTelematicsApi, collectPages } = await import(dataModule(source));
const { default: axios } = await import('axios');
const seenPages = [];
const all = await collectPages(async (page, limit) => {
  seenPages.push(page);
  return { data: { items: Array.from({ length: Math.min(limit, 205 - (page - 1) * limit) }, (_, index) => ({ _id: String((page - 1) * limit + index) })), total: 205 } };
});
assert.equal(all.length, 205); assert.deepEqual(seenPages, [1, 2, 3]);
await assert.rejects(() => collectPages(async () => ({ data: { items: [{ _id: 'repeated' }], total: 2 } })), /repeated/);
await assert.rejects(() => collectPages(async () => ({ data: { items: [], total: 2 } })), /changed/);
const { resolveAgentSession } = await import(dataModule(await read('../src/services/agentSession.js')));
const memberships = [{ orgId: 'first', companyName: 'First' }, { orgId: 'second', companyName: 'Second' }];
const verified = [];
const verify = async (token, id) => { verified.push([token, id]); };
const session = await resolveAgentSession({ token: 'agent', user: { role: 'FIELD_AGENT', orgId: null } }, 'second', async () => memberships, verify);
assert.equal(session.activeOrgId, 'second'); assert.equal(session.organization._id, 'second');
const suspended = await resolveAgentSession({ token: 'agent', user: { role: 'FIELD_AGENT', orgId: null } }, 'removed-org', async () => memberships, verify);
assert.equal(suspended.activeOrgId, 'first');
const bound = await resolveAgentSession({ token: 'agent', user: { role: 'FIELD_AGENT', orgId: 'first' } }, 'second', async () => memberships, verify);
assert.equal(bound.activeOrgId, 'first', 'a bound field agent cannot impersonate another org via headers');
assert.deepEqual(verified, [['agent', 'second'], ['agent', 'first'], ['agent', 'first']]);
const { savedLocationFromGoogle } = await import(dataModule(await read('../src/services/googlePlaceLocation.js')));
const details = { name: 'A place', formatted_address: 'An address', geometry: { location: { lat: 0, lng: 88 } }, address_components: [{ long_name: 'Kolkata', types: ['locality'] }] };
assert.deepEqual(savedLocationFromGoogle(details), { name: 'A place', address: 'An address', city: 'Kolkata', state: '', pincode: '', lat: 0, lng: 88 });
assert.equal(savedLocationFromGoogle({ ...details, geometry: { location: { lat: () => 22, lng: () => 88 } } }).lat, 22);
process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY = 'test-key';
const places = await import(dataModule(await read('../src/services/googlePlaces.js')));
const originalFetch = globalThis.fetch;
const googleRequests = [];
globalThis.fetch = async (url) => { googleRequests.push(new URL(url)); return { ok: true, json: async () => ({ status: 'OK', predictions: [{ place_id: 'place' }], result: details }) }; };
assert.equal((await places.searchGooglePlaces('Kolkata', 'session-token'))[0].place_id, 'place');
assert.equal((await places.getGooglePlace('place', 'session-token')).name, 'A place');
assert.equal(googleRequests[0].searchParams.get('sessiontoken'), 'session-token');
assert.equal(googleRequests[1].searchParams.get('fields'), 'name,formatted_address,geometry,address_components');
globalThis.fetch = originalFetch;
const requests = [];
axios.defaults.adapter = async (config) => {
  requests.push(config);
  let data;
  if (config.url === '/vehicles') {
    const page = config.params.page;
    data = Array.from({ length: Math.min(100, 205 - (page - 1) * 100) }, (_, index) => ({ _id: `vehicle-${(page - 1) * 100 + index}`, registrationNumber: `TRUCK-${(page - 1) * 100 + index}` }));
    return { data: { data, meta: { total: 205 } }, status: 200, config };
  }
  if (config.url === '/auto-trips') data = { items: [], total: 0 };
  else if (config.url === '/fuel-logs') data = [];
  else if (config.url === '/fleet/workflows/drivers') data = { items: [], total: 0 };
  else if (config.url === '/livetracking/positions') data = { records: [] };
  else if (config.url === '/owner-alerts') data = { records: [], total: 0 };
  else if (config.url === '/def-ledger') data = { claimsTracked: true, vehicles: [{ registrationNumber: 'TEST', telemetryDefL: 12 }], totals: { telemetryDefL: 12 } };
  else if (config.url.endsWith('/track')) data = { points: [{ lat: 22, lng: 88 }, { lat: 23, lng: 89, gap: true }] };
  else if (config.url === '/auto-trips/trip') data = { _id: 'trip', pickup: { name: 'Origin' }, drop: { name: 'Destination' }, stops: [{ _id: 'stop' }] };
  else if (config.url === '/place-intelligence/stops/mine') data = { records: [{ _id: 'stop', registrationNumber: 'TEST' }] };
  else if (config.url === '/app/v1/trips') return { data: { data: [{ _id: 'erp-trip', state: 'TRIP_CLOSED' }], meta: { total: 31 } }, status: 200, config };
  else if (config.url === '/app/v1/trips/erp-trip') data = { _id: 'erp-trip', state: 'TRIP_CLOSED' };
  else data = {};
  return { data: { data }, status: 200, config };
};
const api = createTelematicsApi({ baseURL: 'https://example.invalid/v1/api', token: 'test-token', user: { _id: 'driver', role: 'DRIVER' }, audience: 'driver' });
assert.equal((await api.myStops())[0]._id, 'stop');
await api.explainStop('stop', 'REST', ' Driver rest ');
assert.equal(requests.at(-1).url, '/place-intelligence/stops/stop/reason');
assert.deepEqual(JSON.parse(requests.at(-1).data), { purpose: 'REST', note: 'Driver rest' });
assert.equal((await api.erpTrips(2)).meta.total, 31); assert.equal(requests.at(-1).params.page, 2);
assert.equal((await api.erpTrip('erp-trip')).state, 'TRIP_CLOSED');
const originalFormData = globalThis.FormData;
globalThis.FormData = class FormData { constructor() { this.parts = []; } append(...part) { this.parts.push(part); } getParts() { return this.parts; } toString() { return '[object FormData]'; } };
try {
  for (const [method, field, path] of [['uploadBilty', 'bilty', '/erp/consignments/upload-bilty'], ['uploadPod', 'pod', '/erp/pods/upload']]) {
    await api[method]('erp-trip', { uri: 'file:///image.jpg', name: 'image.jpg', type: 'image/jpeg' });
    const sent = requests.at(-1);
    assert.equal(sent.url, path); assert.equal(sent.headers.Authorization, 'Bearer test-token');
    assert.deepEqual(sent.data.getParts(), [['tripId', 'erp-trip'], [field, { uri: 'file:///image.jpg', name: 'image.jpg', type: 'image/jpeg' }]]);
  }
} finally { globalThis.FormData = originalFormData; }
const manager = createTelematicsApi({ baseURL: 'https://example.invalid/v1/api', token: 'manager-token', user: { _id: 'manager', role: 'MANAGER' }, audience: 'manager' });
const start = requests.length;
assert.equal((await manager.loadFleet('branch')).vehicles.length, 205);
assert.equal(requests.slice(start).filter((row) => row.url === '/vehicles').length, 3);
assert.ok(requests.slice(start).every((row) => row.headers['X-Branch-Id'] === 'branch'));
assert.equal((await manager.getTrip('trip', 'branch')).stops[0]._id, 'stop');
const track = await manager.getTripTrack('trip', 'branch');
assert.equal(track.points[0].latitude, 22); assert.equal(track.points[1].gap, true);
assert.equal(requests.at(-1).headers['X-Branch-Id'], 'branch');
assert.equal((await manager.defLedger()).totals.telemetryDefL, 12);
assert.equal(requests.at(-1).url, '/def-ledger');
await manager.teamWrite('assignments', 'post', { userId: 'employee', roleId: 'role', scope: 'BRANCH', branchId: 'branch' });
assert.equal(requests.at(-1).url, '/access-control/assignments');
assert.equal(JSON.parse(requests.at(-1).data).scope, 'BRANCH');
await manager.teamWrite('branches/branch/roles/role', 'patch', { enabled: false, permissionOverrides: { trips: false } });
assert.equal(requests.at(-1).method, 'patch'); assert.equal(JSON.parse(requests.at(-1).data).enabled, false);
await manager.teamCreateEmployee({ firstName: 'Test', lastName: 'Driver', mobileNumber: '+919876543210', password: 'fixture-only', role: 'DRIVER' }, 'branch');
assert.equal(requests.at(-1).url, '/employees');
assert.equal(requests.at(-1).headers['X-Branch-Id'], 'branch');
assert.equal(JSON.parse(requests.at(-1).data).role, 'DRIVER');
await manager.teamUpdateEmployee('employee', { status: 'ACTIVE' }, 'branch');
assert.equal(requests.at(-1).url, '/employees/employee');
assert.equal(requests.at(-1).method, 'patch');
assert.equal(JSON.parse(requests.at(-1).data).status, 'ACTIVE');
// Owner capture review has no approved #313 list contract.
await assert.rejects(manager.ownerCaptures(2, 'branch'), /not connected/);
console.log('Passed: multi-page completeness, org membership selection, truck-bound agent scope, Google place mapping, historical tracks, DEF source, stop reasons, ERP ownership path/uploads and access-control contracts.');
