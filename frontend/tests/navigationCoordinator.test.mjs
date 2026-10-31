import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../src/telematics/guidance/navigationCoordinator.js', import.meta.url), 'utf8');
const { NavigationCoordinator, validateFix, validateBundle } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const fix = { latitude: 22, longitude: 88, accuracy: 5, timestamp: 100000 };
const bundle = { schemaVersion: 1, format: 'valhalla-osrm', routeId: 'route-a', payload: { routes: [{ legs: [{}] }] } };
function setup(api = {}) {
  const calls = []; const saved = new Map();
  const engine = Object.fromEntries(['location', 'parse', 'start', 'replace', 'stop'].map(name => [name, value => { calls.push(name); return value; }]));
  const c = new NavigationCoordinator({ api: { navSessionStart: async () => ({ session: { id: 's', routeVersion: 1, recoveryLeaseUntil: new Date(100000 + 86400000).toISOString(), route: { navigation: bundle } } }), ...api }, engine, storage: { setItem: async (k,v) => saved.set(k,v), getItem: async k => saved.get(k), removeItem: async k => saved.delete(k) }, identity: { orgId: 'o', userId: 'u', vehicleId: 'v' }, now: () => 100000 });
  c.location(fix); return { c, calls, saved };
}
test('rejects stale, inaccurate, mocked and unknown fixes', () => {
  for (const value of [{ ...fix, timestamp: 1 }, { ...fix, accuracy: null }, { ...fix, mocked: true }, { ...fix, latitude: 100 }, { ...fix, timestamp: undefined }, { ...fix, timestamp: NaN }]) assert.throws(() => validateFix(value, 100000));
});
test('late but still fresh location fixes cannot rewind guidance', () => {
  const { c, calls } = setup();
  assert.equal(c.location({ ...fix, timestamp: 99999 }), false);
  assert.equal(c.fix.timestamp, fix.timestamp);
  assert.equal(calls.filter(name => name === 'location').length, 1);
});
test('rejects flattened legacy route payload', () => assert.throws(() => validateBundle({ geometry: 'abc', maneuvers: [] })));
test('failed server activation never starts SDK', async () => {
  const { c, calls } = setup({ navSessionStart: async () => { throw new Error('unauthorized'); } });
  await assert.rejects(c.activate({ bundle, consent: true })); assert.ok(!calls.includes('start'));
});
test('stop cancels an in-flight activation', async () => {
  let resolve; const pending = new Promise(r => { resolve = r; });
  const { c, calls } = setup({ navSessionStart: () => pending });
  const started = c.activate({ bundle, consent: true }); await Promise.resolve(); c.stop();
  resolve({ session: { id: 's', routeVersion: 1, recoveryLeaseUntil: new Date(100000 + 86400000).toISOString(), route: { navigation: bundle } } }); await started; assert.ok(!calls.includes('start'));
});
test('CAS conflict leaves the current SDK route intact', async () => {
  const { c, calls } = setup({ navSessionPatch: async () => { throw new Error('stale route'); } });
  await c.activate({ bundle, consent: true });
  await assert.rejects(c.replace({ ...bundle, routeId: 'route-b' })); assert.ok(!calls.includes('replace')); assert.equal(c.session.navigation.routeId, 'route-a');
});
test('recovery refuses a newer server route version', async () => {
  const { c, calls } = setup({ navSessionActive: async () => ({ session: { id: 's', routeVersion: 2 } }) });
  await c.activate({ bundle, consent: true }); c.stop();
  const starts = calls.filter(c => c === 'start').length;
  await assert.rejects(c.recover({ consent: true })); assert.equal(calls.filter(c => c === 'start').length, starts);
});

test('existing session with different route cannot start selected local guidance', async () => {
  const { c, calls } = setup({ navSessionStart: async () => ({ session: { id: 's', routeVersion: 1, route: { navigation: { routeId: 'other' } } } }) });
  await assert.rejects(c.activate({ bundle, consent: true })); assert.ok(!calls.includes('start'));
});
test('offline recovery requires a bounded unexpired local recovery lease', async () => {
  const { c, saved } = setup(); await c.activate({ bundle, consent: true }); c.stop();
  const [key, value] = [...saved][0]; const cached = JSON.parse(value); cached.recoveryLeaseUntil = 99999; saved.set(key, JSON.stringify(cached));
  await assert.rejects(c.recover({ consent: true, online: false }), /lease expired/);
});
test('a delayed write cannot repopulate cache after generation cancellation', async () => {
  const { c, saved } = setup(); let release; let entered;
  const entering = new Promise(r => { entered = r; });
  c.storage.setItem = async (k,v) => { entered(); await new Promise(r => { release = r; }); saved.set(k,v); };
  const activation = c.activate({ bundle, consent: true }); await entering; c.stop(); release(); await activation;
  assert.equal(saved.size, 0);
});
