import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dom = new JSDOM('<div id="app"></div>', { url: 'http://localhost' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const h = React.createElement;
const Wrapper = ({ children }) => h('div', null, children);
const Text = ({ children }) => h('span', null, children);
const Button = ({ label, onPress, disabled, loading }) =>
  h('button', { disabled: disabled || loading, onClick: onPress }, label);
const TextField = ({ label, value, onChangeText, editable = true }) =>
  h(
    'label',
    null,
    label,
    h('input', {
      'aria-label': label,
      value,
      disabled: !editable,
      onInput: (e) => onChangeText(e.target.value),
    }),
  );
const ui = {
  AppText: Text,
  Button,
  Card: Wrapper,
  StatusBadge: ({ status, label }) => h(Text, null, label || status),
  SegmentedControl: ({ options, onChange }) => h(
    'div', null,
    options.map(({ label, value }) => h(
      'button', { key: value, onClick: () => onChange(value) }, label,
    )),
  ),
  TextField,
  BackHeader: Text,
  colors: {},
  spacing: { sm: 8, md: 16, lg: 24 },
};
const Select = ({ children, selectedValue, onValueChange }) =>
  h(
    'select',
    { value: selectedValue, onChange: (e) => onValueChange(e.target.value) },
    children,
  );
Select.Item = ({ label, value }) => h('option', { value }, label);
const calls = [];
const navCalls = [];
const navigation = {
  getState: () => ({ type: 'stack' }),
  canGoBack: () => true,
  goBack() {},
  navigate: (...args) => navCalls.push(args),
  replace: (...args) => navCalls.push(args),
};
const data = { vehicle: { speed: 0 } };
const tracking = { stop: async () => calls.push(['stopTracking']) };
const billService = {
  submitBill: async (payload) => {
    calls.push(['submit', payload]);
    return { _id: 'bill-1', amount: payload.amount, status: 'PENDING' };
  },
  resubmitBill: async (id, payload) => {
    calls.push(['resubmit', id, payload]);
    return { _id: id, amount: payload.amount, status: 'PENDING' };
  },
  listBills: async () => ({
    results: [
      {
        _id: 'rejected',
        title: 'Food bill',
        amount: 200,
        status: 'REJECTED',
        rejectionReason: 'Unclear photo',
      },
    ],
    total: 1,
  }),
};
const api = {
  helpMenu: async () => ({
    cards: [{ id: 'card-1', label: 'Gate delay', canReply: true }],
  }),
  replyToHelpfulCard: async (...args) => calls.push(['reply', ...args]),
  prompts: async () => ({
    prompt: {
      id: 'prompt-1',
      subject: { label: 'Still waiting?' },
      answers: ['YES', 'NO'],
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    },
  }),
  answerPrompt: async (...args) => {
    calls.push(['answer', ...args]);
  },
  consent: async () => ({
    notice: { version: 'v1' },
    state: { grantedAt: new Date().toISOString() },
  }),
  withdrawConsent: async () => calls.push(['withdrawConsent']),
};
const modules = new Map();
function load(relative) {
  const filename = resolve(rootDir, relative);
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const mockRequire = (name) => {
    if (name === 'react') return React;
    if (name === 'react-native')
      return {
        View: Wrapper,
        ScrollView: Wrapper,
        KeyboardAvoidingView: Wrapper,
        Platform: { OS: 'web' },
      };
    if (name === 'expo-crypto')
      return { randomUUID: () => `uuid-${Math.random()}` };
    if (name === '@react-navigation/native')
      return {
        useIsFocused: () => true,
        useFocusEffect: (fn) => React.useEffect(fn, []),
      };
    if (name === 'react-native-safe-area-context')
      return {
        useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
      };
    if (/components\/ui$/.test(name)) return ui;
    if (/SelectField$/.test(name)) return { __esModule: true, default: Select };
    if (/context\/AuthContext$/.test(name))
      return { useAuth: () => ({ user: { _id: 'driver-1' } }) };
    if (/DriverDataContext$/.test(name))
      return {
        useDriverData: () => ({
          data,
          tracking,
          service: api,
          refresh: async () => {},
        }),
      };
    if (/TelematicsApiContext$/.test(name))
      return { useTelematicsApi: () => api };
    if (/LanguageContext$/.test(name))
      return { useLanguage: () => ({ language: 'en' }) };
    if (/ExperienceUI$/.test(name))
      return { useExperienceCopy: () => (key) => key };
    if (/billService$/.test(name)) return billService;
    if (/walletService$/.test(name))
      return {
        getDriverSummary: async () => ({ totalAmount: 1250 }),
        getDriverLedger: async () => ({ results: [], total: 0 }),
      };
    if (/services\/client$/.test(name))
      return { get: async () => ({ data: { data: [], meta: { total: 0 } } }) };
    if (/pickImage$/.test(name))
      return {
        pickFromCamera: async () => ({
          uri: 'photo',
          name: 'bill.jpg',
          type: 'image/jpeg',
        }),
        pickFromGallery: async () => null,
      };
    if (/AttachmentPicker$/.test(name))
      return { default: undefined, __esModule: true };
    if (/DateField$/.test(name))
      return { default: () => null, __esModule: true };
    if (/useDriverLocationSharing$/.test(name))
      return { capturePairingFix: async () => ({ latitude: 1, longitude: 1 }) };
    if (/driverDutyService$/.test(name)) return {};
    if (/telematicsApi$/.test(name))
      return { recordId: (r) => r?._id, collectPages: async () => [] };
    if (name.startsWith('.'))
      return load(`${resolve(dirname(filename), name)}.js`);
    throw new Error(`Unexpected module ${name}`);
  };
  const actualRequire = (name) =>
    /AttachmentPicker$/.test(name)
      ? {
          __esModule: true,
          default: ({ onCamera, asset }) =>
            h(Button, {
              label: asset ? 'Photo attached' : 'Take photo',
              onPress: onCamera,
            }),
        }
      : mockRequire(name);
  const { code } = transformSync(readFileSync(filename, 'utf8'), {
    filename,
    configFile: false,
    babelrc: false,
    plugins: [
      '@babel/plugin-transform-react-jsx',
      '@babel/plugin-transform-modules-commonjs',
    ],
  });
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, {
    filename,
  })(actualRequire, module, module.exports);
  return module.exports;
}
const container = document.getElementById('app');
const root = createRoot(container);
const settle = async (fn = () => {}) =>
  act(async () => {
    await fn();
    await new Promise((done) => setTimeout(done, 0));
  });
async function show(Component, props = {}) {
  await settle(() => root.render(h(Component, { navigation, ...props })));
}
async function click(label) {
  const button = [...container.querySelectorAll('button')].find(
    (b) => b.textContent === label,
  );
  assert.ok(button, `Missing button ${label}`);
  assert.equal(button.disabled, false, `${label} is disabled`);
  await settle(() => button.click());
}
async function input(label, value) {
  const element = container.querySelector(`input[aria-label="${label}"]`);
  assert.ok(element);
  await settle(() => {
    element.value = value;
    element.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}
const wallet = load('src/telematics/screens/DriverWalletScreens.js');
await show(wallet.DriverWallet);
assert.match(container.textContent, /₹1,250/);
assert.match(container.textContent, /not money held in the app/);
await click('Correct and resubmit');
assert.equal(navCalls.at(-1)[0], 'AddBill');
assert.equal(navCalls.at(-1)[1].bill._id, 'rejected');
await show(wallet.DriverBillForm, {
  route: {
    params: {
      bill: { _id: 'rejected', amount: 200, rejectionReason: 'Unclear photo' },
    },
  },
});
await click('Take photo');
await input('Amount (₹)', '250');
await click('Send for confirmation');
assert.equal(calls.find((c) => c[0] === 'resubmit')[1], 'rejected');
assert.equal(calls.find((c) => c[0] === 'resubmit')[2].amount, 250);
assert.equal(navCalls.at(-1)[0], 'BillSent');
await show(wallet.DriverBillSent, {
  route: { params: { bill: { amount: 250 } } },
});
assert.match(container.textContent, /It has not been paid/);
const services = load('src/telematics/screens/DriverServices.js');
await show(services.HelpfulCards);
await click('Add your side');
await input('Your explanation', 'Waiting at gate');
await click('Send explanation');
assert.deepEqual(calls.find((c) => c[0] === 'reply').slice(1, 2), ['card-1']);
assert.equal(calls.find((c) => c[0] === 'reply')[2].note, 'Waiting at gate');
await show(services.PrivacyConsent);
await click('withdrawConsent');
assert.ok(
  calls.findIndex((c) => c[0] === 'stopTracking') <
    calls.findIndex((c) => c[0] === 'withdrawConsent'),
);
const integrations = load('src/telematics/screens/DriverIntegrationScreens.js');
data.vehicle.speed = 30;
await show(integrations.DriverQuestions);
assert.equal(
  [...container.querySelectorAll('button')].find((b) => b.textContent === 'YES')
    .disabled,
  true,
);
data.vehicle.speed = 0;
await show(integrations.DriverQuestions);
await click('YES');
assert.equal(calls.find((c) => c[0] === 'answer')[1], 'prompt-1');
await settle(() => root.unmount());
console.log(
  'Passed: rejected bill correction, ledger meaning, pending confirmation, card-linked replies, consent withdrawal order and moving-safe prompt answers.',
);
