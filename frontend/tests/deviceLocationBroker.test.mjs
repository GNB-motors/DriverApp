import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
async function moduleFile(path) { const source = await readFile(new URL(path, import.meta.url), 'utf8'); return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`); }
const { createDeviceLocationBroker } = await moduleFile('../src/telematics/tracking/deviceLocationBroker.js');
const { corridorPackBounds, packReady } = await moduleFile('../src/telematics/guidance/corridorPacks.js');
test('navigation and upload consumers share one OS watch and independent frequency', async () => {
  let callback; let active = 0; let peak = 0; let now = 1000; const interval = []; let local = 0; let upload = 0;
  const broker = createDeviceLocationBroker({ now: () => now, watch: async (options, cb) => { interval.push(options.interval); callback = cb; active++; peak = Math.max(peak, active); return { remove() { active--; } }; } });
  const sharing = await broker.subscribe({ interval: 120000, onLocation() { upload++; } });
  const navigation = await broker.subscribe({ interval: 1000, onLocation() { local++; } });
  callback({ timestamp: now }); now += 1000; callback({ timestamp: now });
  assert.equal(local, 2); assert.equal(upload, 1); assert.equal(peak, 1); assert.equal(active, 1); assert.equal(interval.at(-1), 1000);
  navigation.remove(); await Promise.resolve(); await Promise.resolve();
  assert.equal(interval.at(-1), 120000); sharing.remove(); await broker.clear(); assert.equal(active, 0);
});
test('native background task replaces foreground watch and still publishes to engine', async () => {
  let active = 0; let ticks = 0;
  const broker = createDeviceLocationBroker({ watch: async () => { active++; return { remove() { active--; } }; } });
  await broker.subscribe({ onLocation() { ticks++; } }); await broker.setBackground(true); assert.equal(active, 0);
  broker.publish({ timestamp: 1 }); assert.equal(ticks, 1);
  await broker.setBackground(false); assert.equal(active, 1); await broker.clear();
});
test('subscription cancelled during asynchronous native acquisition releases late handle', async () => {
  let release; let active = 0;
  const broker = createDeviceLocationBroker({ watch: () => new Promise(resolve => { release = () => { active++; resolve({ remove() { active--; } }); }; }) });
  const pending = broker.subscribe({ onLocation() {} }); await Promise.resolve(); await Promise.resolve();
  const clearing = broker.clear(); release(); await pending; await clearing; assert.equal(active, 0);
});
test('corridor packs cover complete geometry with bounded overlapping regions', () => {
  const points = Array.from({ length: 30 }, (_, i) => [88 + i * 0.01, 22 + i * 0.001]);
  const packs = corridorPackBounds(points); assert.ok(packs.length > 1);
  for (const point of points) assert.ok(packs.some(b => point[0] >= b[0] && point[0] <= b[2] && point[1] >= b[1] && point[1] <= b[3]));
  for (const box of packs) assert.ok(box[2] - box[0] <= 0.112001);
});
test('gaps and oversized downloads cannot be presented as valid offline packs', () => {
  assert.throws(() => corridorPackBounds([[88,22],[89,22]]), /gap/);
  assert.throws(() => corridorPackBounds(Array.from({length: 30}, (_,i) => [88+i*0.05,22]), { maxPacks: 2 }), /too large/);
  assert.equal(packReady({ state: 'complete', completedResourceCount: 0, requiredResourceCount: 0 }), false);
  assert.equal(packReady({ state: 'complete', completedResourceCount: 4, requiredResourceCount: 5 }), false);
  assert.equal(packReady({ state: 'complete', completedResourceCount: 5, requiredResourceCount: 5 }), true);
});
test('failed offline map replacement preserves the installed generation and removes staged regions', async () => {
  const source = await readFile(new URL('../src/telematics/guidance/offlinePacks.native.js', import.meta.url), 'utf8');
  globalThis.corridorPackBounds = corridorPackBounds;
  globalThis.packReady = packReady;
  globalThis.navigationCacheKey = identity => `nav:${identity.orgId}:${identity.userId}:${identity.vehicleId}`;
  const values = new Map(); const removed = []; let created = 0;
  globalThis.AsyncStorage = {
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, value); },
    async removeItem(key) { values.delete(key); },
  };
  globalThis.OfflineManager = {
    async getPack(id) { return { status: async () => ({ state: 'complete', requiredResourceCount: 1, completedResourceCount: 1 }) }; },
    async deletePack(id) { removed.push(id); },
    async createPack(_options, onStatus) {
      created++;
      if (created === 2) throw new Error('offline download failed');
      const pack = { id: `staged-${created}`, pause: async () => {}, resume: async () => onStatus(pack, { state: 'complete', requiredResourceCount: 1, completedResourceCount: 1, percentage: 100 }) };
      return pack;
    },
  };
  const stripped = source.replace(/^import .*;\s*$/gm, '');
  const { downloadOfflineMaps } = await import(`data:text/javascript;base64,${Buffer.from(stripped).toString('base64')}`);
  const identity = { orgId: 'o', userId: 'u', vehicleId: 'v' };
  const bundle = { routeId: 'r', geometryHash: 'new' };
  const key = `nav:o:u:v:maps:r:new`;
  const installed = { routeId: 'r', geometryHash: 'new', mapStyle: 'style', ids: ['installed'], expected: 1, minZoom: 10, maxZoom: 15, downloadedAt: 'previous' };
  values.set(key, JSON.stringify(installed));
  await assert.rejects(downloadOfflineMaps({ identity, bundle, coordinates: [[88,22],[88.09,22],[88.18,22]], mapStyle: 'style' }), /offline download failed/);
  assert.deepEqual(JSON.parse(values.get(key)), installed);
  assert.deepEqual(removed, ['staged-1']);
});
