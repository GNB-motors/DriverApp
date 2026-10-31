import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/telematics/guidance/resourceInstaller.js', import.meta.url), 'utf8');
const { validateResourceManifest, installResources } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const mapStyle = 'https://tiles.example.com/styles/fleet-v4/style.json';
const manifest = {
  schemaVersion: 1, readiness: 'READY', routeId: 'route-1', packId: 'pack-1', mapVersion: 'fleet-v4', mapStyle,
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  resources: [{ id: 'style', kind: 'style', url: mapStyle, sha256: 'a'.repeat(64), bytes: 1 }],
};

test('resource manifest must match the configured MapLibre style URL', () => {
  assert.throws(() => validateResourceManifest(manifest, { routeId: 'route-1', mapStyle: `${mapStyle}?v=other`, allowedOrigins: ['https://tiles.example.com'] }), /does not match the configured map style/);
  assert.equal(validateResourceManifest(manifest, { routeId: 'route-1', mapStyle, allowedOrigins: ['https://tiles.example.com'] }).bytes, 1);
});

test('verified style resources remain distinct from native offline map readiness', async () => {
  const stored = new Map();
  const files = {
    async freeBytes() { return 256 * 1024 * 1024; },
    async directory() { return '/private/tmp/nav/'; },
    async info() { return { exists: true, size: 1 }; },
    async sha256() { return 'a'.repeat(64); },
    async remove() {},
  };
  const storage = { async getItem(key) { return stored.get(key) ?? null; }, async setItem(key, value) { stored.set(key, value); }, async removeItem(key) { stored.delete(key); } };
  const index = await installResources({ manifest, routeId: 'route-1', mapStyle, allowedOrigins: ['https://tiles.example.com'], files, storage, identityKey: 'org:user:vehicle', now: Date.now });
  assert.equal(index.mapStyle, mapStyle);
  assert.equal(index.resourcesVerified, true);
  assert.equal(index.nativePackComplete, false);
});
