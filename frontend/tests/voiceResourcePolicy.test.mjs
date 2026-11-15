import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/telematics/guidance/voiceResourcePolicy.js', import.meta.url), 'utf8');
const { createVoicePolicyController, selectReviewedVoice, validVoicePolicy, voicePolicyCacheKey } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const now = 1_000_000;
const lease = new Date(now + 60 * 60 * 1000).toISOString();
const voice = (language, status = 'VALID', revision = 1, offlineVerified = true) => ({ language, platform: 'android', resourceVersion: `${language}-v${revision}`, voiceIdentifier: `${language}-reviewed`, status, revision, reason: null, offlineVerified });
const policy = (resources, overrides = {}) => ({ schemaVersion: 1, language: 'hi', platform: 'android', resources, expiresAt: lease, fallbackLanguage: 'en', ...overrides });
const installed = [{ identifier: 'hi-reviewed', language: 'hi-IN' }, { identifier: 'en-reviewed', language: 'en-IN' }];

test('only exact installed, reviewed voices speak; suspension falls back to reviewed English', () => {
  const p = policy([voice('hi', 'SUSPENDED', 2), voice('en', 'VALID', 3)]);
  assert.deepEqual(selectReviewedVoice(p, installed, { language: 'hi', platform: 'android', now }), {
    language: 'en', requestedLanguage: 'hi', voiceIdentifier: 'en-reviewed', resourceVersion: 'en-v3', revision: 3,
    offlineVerified: true, offlinePolicy: false, usingFallback: true, expiresAt: lease,
  });
  assert.equal(selectReviewedVoice(p, [{ identifier: 'hi-unreviewed', language: 'hi-IN' }], { language: 'hi', platform: 'android', now }), null);
});

test('offline policy requires offline verification and a still-live server lease', () => {
  const p = policy([voice('hi', 'VALID', 1, false), voice('en', 'VALID', 1, false)]);
  assert.equal(selectReviewedVoice(p, installed, { language: 'hi', platform: 'android', offline: true, now }), null);
  assert.equal(validVoicePolicy(p, { language: 'hi', platform: 'android', now: now + 61 * 60 * 1000 }), false);
  assert.equal(validVoicePolicy({ ...p, expiresAt: new Date(now + 63 * 60 * 1000).toISOString() }, { language: 'hi', platform: 'android', now }), false);
  assert.equal(validVoicePolicy(policy([voice('hi'), voice('hi', 'SUSPENDED', 2)]), { language: 'hi', platform: 'android', now }), false);
});

test('online voice fetch failure never restores a cached authorization', async () => {
  const cache = new Map(); const selected = [];
  const identity = { orgId: 'org', userId: 'driver' };
  const key = voicePolicyCacheKey({ ...identity, platform: 'android', language: 'hi' });
  cache.set(key, JSON.stringify(policy([voice('hi'), voice('en')])));
  const controller = createVoicePolicyController({ api: { async navVoiceResources() { throw new Error('unavailable'); } }, storage: { async getItem(k) { return cache.get(k) || null; }, async setItem(k,v) { cache.set(k,v); } }, identity, language: 'hi', platform: 'android', installedVoices: installed, now: () => now, onSelection: value => selected.push(value) });
  assert.equal(await controller.initialize({ offline: false }), null);
  assert.equal(controller.selection, null);
  assert.equal(selected.filter(Boolean).length, 0);
  controller.dispose();
});

test('offline cache is identity scoped and cannot authorize an unverified voice', async () => {
  const cache = new Map(); const identity = { orgId: 'org', userId: 'driver' };
  const key = voicePolicyCacheKey({ ...identity, platform: 'android', language: 'hi' });
  cache.set(key, JSON.stringify(policy([voice('hi', 'VALID', 1, false), voice('en', 'VALID', 2, true)])));
  const controller = createVoicePolicyController({ api: { async navVoiceResources() { throw new Error('offline'); } }, storage: { async getItem(k) { return cache.get(k) || null; }, async setItem(k,v) { cache.set(k,v); } }, identity, language: 'hi', platform: 'android', installedVoices: installed, now: () => now });
  const selected = await controller.initialize({ offline: true });
  assert.equal(selected.voiceIdentifier, 'en-reviewed');
  assert.equal(selected.offlinePolicy, true);
  assert.notEqual(voicePolicyCacheKey({ ...identity, platform: 'ios', language: 'hi' }), key);
  controller.dispose();
});

test('new suspension replaces the active selection; malformed refresh disables speech', async () => {
  const cache = new Map(); let current = policy([voice('hi', 'VALID', 1), voice('en', 'VALID', 1)]); const selected = [];
  const controller = createVoicePolicyController({ api: { async navVoiceResources() { return current; } }, storage: { async getItem(k) { return cache.get(k) || null; }, async setItem(k,v) { cache.set(k,v); } }, identity: { orgId: 'org', userId: 'driver' }, language: 'hi', platform: 'android', installedVoices: installed, now: () => now, onSelection: value => selected.push(value) });
  assert.equal((await controller.initialize()).voiceIdentifier, 'hi-reviewed');
  current = policy([voice('hi', 'SUSPENDED', 2), voice('en', 'VALID', 2)]);
  assert.equal((await controller.refresh()).voiceIdentifier, 'en-reviewed');
  current = { ...current, resources: [{ ...current.resources[0], revision: 3, status: 'UNKNOWN' }] };
  assert.equal(await controller.refresh(), null);
  assert.equal(controller.selection, null);
  controller.dispose();
});

test('superseded slow response cannot overwrite a newer suspension policy', async () => {
  const cache = new Map(); const waiters = [];
  const api = { navVoiceResources() { return new Promise(resolve => waiters.push(resolve)); } };
  const controller = createVoicePolicyController({ api, storage: { async getItem(k) { return cache.get(k) || null; }, async setItem(k,v) { cache.set(k,v); } }, identity: { orgId: 'org', userId: 'driver' }, language: 'hi', platform: 'android', installedVoices: installed, now: () => now });
  const older = controller.initialize(); const newer = controller.refresh();
  waiters[1](policy([voice('hi', 'SUSPENDED', 2), voice('en', 'SUSPENDED', 2)]));
  await newer;
  waiters[0](policy([voice('hi', 'VALID', 1), voice('en', 'VALID', 1)]));
  await older;
  assert.equal(controller.selection, null);
  assert.equal(JSON.parse(cache.values().next().value).resources[0].status, 'SUSPENDED');
  controller.dispose();
});
