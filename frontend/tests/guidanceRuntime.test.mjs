import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { transformSync } = require('esbuild');
const { JSDOM } = require('jsdom');
const React = require('react');
const { createRoot } = require('react-dom/client');
const { act } = React;
const { window } = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = window;
globalThis.document = window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const root = new URL('../src/telematics/', import.meta.url);
function evaluate(file, dependencies = {}) {
  const source = readFileSync(new URL(file, root), 'utf8');
  const compiled = transformSync(source, { loader: 'jsx', format: 'cjs' }).code;
  const module = { exports: {} };
  new Function('module', 'exports', 'require', compiled)(module, module.exports, id => {
    if (id === 'react') return React;
    if (dependencies[id]) return dependencies[id];
    throw Error(`Unexpected native or service dependency: ${id}`);
  });
  return module.exports;
}

test('a failed refresh retains guidance, while confirmed reassignment and auth loss stop it', async () => {
  const guidance = evaluate('guidance/GuidanceRuntimeContext.js');
  let load = async () => ({ vehicle: { id: 'truck-a' } });
  const service = { loadDriver: () => load() };
  const user = { _id: 'driver', orgId: 'org' };
  const data = evaluate('context/DriverDataContext.js', {
    '../guidance/GuidanceRuntimeContext': guidance,
    'react-native': { AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) } },
    '../../context/AuthContext': { useAuth: () => ({ user, token: 'test-token' }) },
    '../tracking/useDriverLocationSharing': { useDriverLocationSharing: () => ({}) },
    './TelematicsApiContext': { useTelematicsApi: () => service },
  });
  let currentData, currentRuntime, stopped = 0, disposed = 0;
  function Probe() { currentData = data.useDriverData(); currentRuntime = guidance.useGuidanceRuntime(); return null; }
  const element = document.createElement('div');
  const view = createRoot(element);
  try {
    await act(async () => view.render(React.createElement(data.DriverDataProvider, null, React.createElement(Probe))));
    const original = currentRuntime;
    original.owner.current = { stop() { stopped++; }, engine: { dispose() { disposed++; } } };
    load = async () => { throw Error('Network unavailable'); };
    await act(async () => currentData.refresh());
    assert.equal(currentRuntime, original);
    assert.equal(currentData.data.vehicle.id, 'truck-a');
    assert.equal(currentData.error, 'Network unavailable');
    assert.equal(stopped, 0);
    load = async () => ({ vehicle: { id: 'truck-b' } });
    await act(async () => currentData.refresh());
    assert.notEqual(currentRuntime, original);
    assert.equal(stopped, 1); assert.equal(disposed, 1);
    currentRuntime.owner.current = { stop() { stopped++; }, engine: { dispose() { disposed++; } } };
    load = async () => { throw Object.assign(Error('Session expired'), { response: { status: 401 } }); };
    await act(async () => currentData.refresh());
    assert.equal(currentData.data, null);
    assert.equal(stopped, 2); assert.equal(disposed, 2);
  } finally { await act(async () => view.unmount()); }
});

test('planning without a valid first GPS fix reports the GPS error before any request', async () => {
  const screen = readFileSync(new URL('guidance/NavigateExperience.js', root), 'utf8');
  const source = readFileSync(new URL('guidance/navigationCoordinator.js', root), 'utf8');
  const { validateFix } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const planSource = screen.match(/async function plan\(\) \{[\s\S]*?\n  \}/)[0];
  let requested = false;
  const plan = new Function('initialize', 'destination', 'service', 'language', 'setOptions', 'setStatus', 'setSelectedRouteId', 'validateFix', `${planSource}; return plan;`)(
    async () => ({ fix: null }), { lat: 23, lng: 89 }, { ourRoutes: async () => { requested = true; } }, 'en', () => {}, () => {}, () => {}, validateFix,
  );
  await assert.rejects(plan(), /fresh GPS fix accurate to 50 metres/);
  assert.equal(requested, false);
});

test('ending a route releases the runtime so the next route initializes fresh GPS and guidance', async () => {
  const { stopGuidanceRuntime } = evaluate('guidance/GuidanceRuntimeContext.js');
  const screen = readFileSync(new URL('guidance/NavigateExperience.js', root), 'utf8');
  const finishSource = screen.match(/function finish\(action\) \{[\s\S]*?\n  \}/)[0];
  let action, disposed = 0, removed = 0, voiceStopped = 0;
  const runtime = {
    generation: { current: 0 },
    owner: { current: { lifecycle: async value => { action = value; }, stop() {}, engine: { dispose() { disposed++; } } } },
    watcher: { current: { remove() { removed++; } } },
    voicePolicyController: { dispose() { voiceStopped++; } },
  };
  const finish = new Function('run', 'owner', 'runtime', 'watcher', 'stopGuidanceRuntime', 'setMenuOpen', 'setArrived', 'setProgress', 'setGeometry', 'clearDestination', `${finishSource}; return finish;`)(
    fn => fn(), runtime.owner, runtime, runtime.watcher, stopGuidanceRuntime, () => {}, () => {}, () => {}, () => {}, () => {},
  );
  await finish('END');
  assert.equal(action, 'END');
  assert.equal(runtime.owner.current, null);
  assert.equal(runtime.watcher.current, null);
  assert.equal(runtime.voicePolicyController, null);
  assert.equal(runtime.generation.current, 1);
  assert.equal(disposed, 1); assert.equal(removed, 1); assert.equal(voiceStopped, 1);
});

test('consent requires a deliberate choice, retries the same decision and stops guidance on withdrawal', async () => {
  const guidance = evaluate('guidance/GuidanceRuntimeContext.js');
  const runtime = { generation: { current: 0 }, owner: { current: null }, watcher: { current: null } };
  let stopped = 0, sharedStopped = 0;
  runtime.owner.current = { stop() { stopped++; }, engine: { dispose() {} } };
  const stored = new Map();
  const notice = { version: '1.2.3', language: 'en', title: 'Fleet location notice', body: 'Your location supports navigation.', items: [{ dataClass: 'Location', purpose: 'Route guidance' }] };
  const initial = { notice, needsConsent: true, state: {} };
  const granted = { notice, needsConsent: false, state: { noticeVersion: '1.2.3', grantedAt: '2026-11-15T00:00:00Z' } };
  const calls = [];
  const service = {
    consent: async () => initial,
    grantConsent: async (body, key) => {
      calls.push({ body, key });
      if (calls.length === 1) throw Error('Connection interrupted');
      return granted;
    },
    withdrawConsent: async () => ({ ...initial, state: { ...granted.state, withdrawnAt: '2026-11-15T01:00:00Z' } }),
  };
  const Text = ({ children }) => React.createElement('p', null, children);
  const Box = ({ children }) => React.createElement('section', null, children);
  const Button = ({ label, onPress, disabled, loading }) => React.createElement('button', { onClick: onPress, disabled: disabled || loading }, label);
  const Pressable = ({ children, onPress, disabled }) => React.createElement('button', { onClick: onPress, disabled }, children);
  const { default: Screen } = evaluate('screens/PrivacyConsentScreen.js', {
    'react-native': { Pressable, View: Box },
    'expo-crypto': { randomUUID: () => 'stable-review-decision' },
    '@react-native-async-storage/async-storage': { setItem: async (k, v) => stored.set(k, v), removeItem: async k => stored.delete(k) },
    '../../context/AuthContext': { useAuth: () => ({ user: { _id: 'driver', orgId: 'org' } }) },
    '../../context/LanguageContext': { useLanguage: () => ({ language: 'hi' }) },
    '../../components/ui': { AppText: Text, Button, Card: Box, colors: {} },
    '../components/WorkspacePage': { default: Box, __esModule: true },
    '../context/DriverDataContext': { useDriverData: () => ({ service, tracking: { stop: async () => { sharedStopped++; } } }) },
    '../guidance/GuidanceRuntimeContext': { ...guidance, useGuidanceRuntime: () => runtime },
  });
  const element = document.createElement('div');
  const view = createRoot(element);
  const button = label => [...element.querySelectorAll('button')].find(node => node.textContent === label);
  const click = async node => act(async () => node.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
  try {
    await act(async () => view.render(React.createElement(Screen, { navigation: {} })));
    assert.equal(button('Agree to this notice').disabled, true);
    assert.equal(calls.length, 0);
    await click([...element.querySelectorAll('button')].find(node => node.textContent.includes('I have read')));
    await click(button('Agree to this notice'));
    assert.match(element.textContent, /Connection interrupted/);
    await click(button('Agree to this notice'));
    assert.deepEqual(calls[1], calls[0]);
    assert.deepEqual(calls[0].body, { noticeVersion: '1.2.3', language: 'en' });
    assert.equal(stored.size, 1);
    await click(button('Withdraw location consent'));
    assert.equal(stopped, 1); assert.equal(sharedStopped, 1); assert.equal(stored.size, 0);
    assert.match(element.textContent, /consent is withdrawn/);
  } finally { await act(async () => view.unmount()); }
});
