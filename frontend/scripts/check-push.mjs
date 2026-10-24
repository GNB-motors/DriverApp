import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const storage = new Map();
let permission = 'granted', prompts = 0;
const calls = [];
const mocks = {
  Crypto: { CryptoDigestAlgorithm: { SHA256: 'sha256' }, digestStringAsync: async (_, value) => createHash('sha256').update(value).digest('hex') },
  Device: { isDevice: true },
  Notifications: { setNotificationHandler() {}, getPermissionsAsync: async () => ({ status: permission }), requestPermissionsAsync: async () => { prompts++; return { status: permission }; }, getExpoPushTokenAsync: async () => ({ data: 'ExponentPushToken[test-device]' }) },
  Platform: { OS: 'ios' },
  AsyncStorage: { getItem: async (key) => storage.get(key) || null, setItem: async (key, value) => storage.set(key, value), removeItem: async (key) => storage.delete(key) },
  Constants: { expoConfig: { extra: { eas: { projectId: 'test-project' } } } },
  logger: { warn() {}, info() {} },
};
globalThis.__pushTestDependencies = mocks;
const source = (await readFile(new URL('../src/services/pushNotifications.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '');
const prefix = 'const { Crypto, Device, Notifications, Platform, AsyncStorage, Constants, logger } = globalThis.__pushTestDependencies;\n';
const service = await import(`data:text/javascript;base64,${Buffer.from(prefix + source).toString('base64')}`);
const options = {
  registerDevice: async (token, platform, auth) => calls.push(['register', auth]),
  unregisterDevice: async (token, auth) => calls.push(['unregister', auth]),
};
permission = 'undetermined';
assert.equal(await service.registerForPush('account-a', options), null);
assert.equal(prompts, 0, 'automatic restore must not open a permission prompt');
permission = 'granted';
await service.registerForPush('account-a', options);
assert.deepEqual(calls, [['register', 'account-a']]);
let active = true, release, signal;
const started = new Promise((resolve) => { signal = resolve; });
const blocked = new Promise((resolve) => { release = resolve; });
const old = service.registerForPush('account-a', { ...options, isCurrent: () => active,
  registerDevice: async () => { calls.push(['register', 'old-in-flight']); signal(); await blocked; },
});
await started;
active = false;
const next = service.registerForPush('account-b', options);
release();
await Promise.all([old, next]);
assert.deepEqual(calls.slice(-3), [['register', 'old-in-flight'], ['unregister', 'account-a'], ['register', 'account-b']]);
const current = [...storage.values()][0];
await service.unregisterFromPush('account-a', options);
assert.equal([...storage.values()][0], current, 'old-account cleanup must not remove the new registration');
permission = 'denied';
await service.registerForPush('account-b', options);
assert.deepEqual(calls.at(-1), ['unregister', 'account-b']);
assert.equal(storage.size, 0);
assert.equal(prompts, 0);
await service.registerForPush('account-b', { ...options, requestPermission: true });
assert.equal(prompts, 1);
delete globalThis.__pushTestDependencies;
console.log('Passed: push permission controls, serialized account changes, cancellation, account-scoped cleanup and permission revocation.');
