import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const moduleUrl = text => `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`;
const root = new URL('../src/telematics/services/', import.meta.url);
const endpoint = moduleUrl(await readFile(new URL('authEndpoint.js', root), 'utf8'));
const metadata = moduleUrl(await readFile(new URL('alertMetadata.js', root), 'utf8'));
const axiosUrl = pathToFileURL(require.resolve('axios')).href;
const source = (await readFile(new URL('telematicsApi.js', root), 'utf8'))
  .replace(/['"]axios['"]/, JSON.stringify(axiosUrl))
  .replace(/['"]\.\/authEndpoint['"]/, JSON.stringify(endpoint))
  .replace(/['"]\.\/alertMetadata['"]/, JSON.stringify(metadata));
const { default: axios } = await import(axiosUrl);
const { createTelematicsApi } = await import(moduleUrl(source));

test('consent writes preserve retry keys and offline manifests keep the backend envelope', async () => {
  const requests = [];
  const manifest = { schemaVersion: 1, routeId: 'route-a', readiness: 'UNAVAILABLE', reasons: ['OWN_MAP_PACKS_NOT_CONFIGURED'] };
  axios.defaults.adapter = async config => {
    requests.push(config);
    return { config, status: 200, data: config.url.includes('/nav/offline/') ? manifest : { success: true, data: { needsConsent: false } } };
  };
  const api = createTelematicsApi({ baseURL: 'https://fleet.invalid/v1', token: 'test-token', user: { _id: 'driver' } });
  const body = { noticeVersion: '1.2.3', language: 'bn' };
  await api.grantConsent(body, 'grant-retry-key');
  await api.grantConsent(body, 'grant-retry-key');
  await api.withdrawConsent('withdraw-retry-key');
  assert.equal(requests[0].url, '/app/v2/consent');
  assert.equal(requests[0].headers['Idempotency-Key'], 'grant-retry-key');
  assert.equal(requests[1].headers['Idempotency-Key'], 'grant-retry-key');
  assert.deepEqual(JSON.parse(requests[0].data), body);
  assert.equal(requests[2].url, '/app/v2/consent/withdraw');
  assert.equal(requests[2].headers['Idempotency-Key'], 'withdraw-retry-key');
  assert.deepEqual(await api.navOfflineManifest('route-a'), manifest);
});
