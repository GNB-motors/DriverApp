import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const asModule = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const endpoint = asModule(await readFile(new URL('../src/telematics/services/authEndpoint.js', import.meta.url), 'utf8'));
const events = asModule(await readFile(new URL('../src/services/sessionEvents.js', import.meta.url), 'utf8'));
const source = (await readFile(new URL('../src/services/client.js', import.meta.url), 'utf8'))
  .replace("'axios'", JSON.stringify(import.meta.resolve('axios')))
  .replace("'../telematics/services/authEndpoint'", JSON.stringify(endpoint))
  .replace("'./sessionEvents'", JSON.stringify(events));
globalThis.__DEV__ = true;
process.env.EXPO_PUBLIC_API_URL = 'https://example.invalid/v1/api';
const { default: client, setSession, clearSession } = await import(asModule(source));
const { subscribeSessionExpiry } = await import(events);
const requests = [];
client.defaults.adapter = async (config) => {
  requests.push(config);
  return { data: { data: [] }, status: 200, config };
};
setSession({ token: 'first-account', orgId: 'first-org' });
await client.get('/vehicles');
assert.equal(requests.at(-1).baseURL, 'https://example.invalid/v1/api');
assert.equal(requests.at(-1).headers.Authorization, 'Bearer first-account');
assert.equal(requests.at(-1).headers['X-Org-Id'], 'first-org');
clearSession();
await client.get('/vehicles');
assert.equal(requests.at(-1).headers.Authorization, undefined);
assert.equal(requests.at(-1).headers['X-Org-Id'], undefined);
setSession({ token: 'second-account', orgId: 'second-org' });
let expiredToken;
const unsubscribe = subscribeSessionExpiry((token) => { expiredToken = token; });
client.defaults.adapter = async (config) => { throw { config, response: { status: 401, data: { message: 'expired' } } }; };
await assert.rejects(() => client.get('/vehicles'), /expired/);
assert.equal(expiredToken, 'second-account', 'expiry must identify the token sent, preserving account-isolation checks');
unsubscribe();
clearSession();
console.log('Passed: API prefix, bearer and org headers, logout cleanup and token-specific expiry.');
