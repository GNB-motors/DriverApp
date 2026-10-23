import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const url = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
async function load(relative) { return import(url(await readFile(new URL(relative, import.meta.url), 'utf8'))); }
const { createFixtures } = await load('../src/telematics/data/fixtures.js');
const { selectAppShell } = await load('../src/telematics/services/appShell.js');
assert.equal(selectAppShell(null), 'login');
for (const role of ['DRIVER', 'MANAGER', 'OWNER']) {
  assert.equal(selectAppShell({ role }), role.toLowerCase());
  assert.equal(selectAppShell({ role }, false), 'legacy');
}
assert.equal(selectAppShell({ role: 'FIELD_AGENT' }), 'field-agent');
assert.equal(selectAppShell({ role: 'FIELD_AGENT' }, false), 'field-agent');
for (const role of ['SUPER_ADMIN', 'ACCOUNTS', 'toString', undefined]) assert.equal(selectAppShell({ role }), 'unsupported');
const { appLoginUrl } = await load('../src/telematics/services/authEndpoint.js');
const { selectDriverView } = await load('../src/telematics/services/driverView.js');
const fixtureUrl = url(await readFile(new URL('../src/telematics/data/fixtures.js', import.meta.url), 'utf8'));
const { createMockTelematicsService } = await import(url((await readFile(new URL('../src/telematics/services/mockTelematicsService.js', import.meta.url), 'utf8')).replace('../data/fixtures.js', fixtureUrl)));
for (const base of ['https://example.com', 'https://example.com/', 'https://example.com/api', 'https://example.com/api/', 'https://example.com/api/app/v1/']) {
  assert.equal(appLoginUrl(base), 'https://example.com/api/app/v1/auth/login');
}
assert.equal(appLoginUrl('https://example.com/proxy/api'), 'https://example.com/proxy/api/app/v1/auth/login');
assert.throws(() => appLoginUrl(''), /Configure/);
const records = createFixtures();
records.fuel.push({ id: 'other-fuel', driverId: 'driver-02', vehicleId: 'truck-02' });
const view = selectDriverView(records);
assert.equal(view.vehicle.id, 'truck-01');
assert.deepEqual(view.alerts.map((item) => item.id), ['alert-01']);
assert.equal(view.documents.length, 2);
assert.equal(view.fuel.length, 1);
records.drivers[0].vehicleId = null;
assert.equal(selectDriverView(records).vehicle, null);
assert.equal(selectDriverView(records).documents.length, 1);
const service = createMockTelematicsService({ identity: 'test:org', delayMs: 0 });
await assert.rejects(service.submit('fuel', { vehicleId: 'truck-01', litres: Infinity, amountInr: 100 }), /positive/);
await assert.rejects(service.submit('bills', { vehicleId: 'truck-01', title: 'Workshop', amountInr: 200 }), /Attach/);
await service.submit('bills', { vehicleId: 'truck-01', driverId: 'driver-01', title: 'Workshop', amountInr: 200, evidence: 'sample-image-only' });
assert.equal((await service.list('bills'))[0].status, 'Pending review');
await service.submit('support', { title: 'Sample help request', driverId: 'driver-01' });
assert.equal((await service.list('support')).length, 1);
await assert.rejects(service.submit('stopNotes', { title: 'Rest', vehicleId: 'truck-01', stopId: 'missing' }), /valid demo stop/);
await service.submit('stopNotes', { title: 'Rest', vehicleId: 'truck-01', stopId: 'stop-01' });
assert.equal((await service.list('stopNotes')).length, 1);
service.reset();
assert.equal((await service.list('bills')).length, 0);
assert.equal((await service.list('support')).length, 0);
service.dispose();
console.log('Driver checks passed: app login URL, own-driver projection, unassigned state, local bills/support/stop notes, validation and reset.');
