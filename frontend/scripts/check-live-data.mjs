import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

const require = createRequire(import.meta.url);
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const { managerCardsFromResponse, vehicleOptionsFromResponse } = await import(moduleUrl(await read('../src/telematics/services/liveData.js')));
assert.deepEqual(managerCardsFromResponse({ cards: [] }), []);
assert.deepEqual(vehicleOptionsFromResponse({ data: [] }), []);
assert.deepEqual(vehicleOptionsFromResponse([]), []);
for (const payload of [null, undefined, {}, { cards: null }, { cards: [null] }, { cards: [{}] }]) {
  assert.throws(() => managerCardsFromResponse(payload), /unavailable/);
}
for (const payload of [null, undefined, {}, { data: {} }, { data: [null] }, { data: [{}] }]) {
  assert.throws(() => vehicleOptionsFromResponse(payload), /unavailable/);
}
const cards = [{ id: 'server-card', fact: 'Server fact' }];
const trucks = [{ _id: 'server-vehicle', registrationNumber: 'SERVER' }];
assert.equal(managerCardsFromResponse({ cards }), cards);
assert.equal(vehicleOptionsFromResponse({ data: trucks }), trucks);

// Scan every runtime source file, including legacy/field-agent routes.
const banned = /(?:^|_)(?:MOCK|FIXTURE|FIXTURES|DEMO)(?:_|$)|^(?:demoLogin|sampleRecipients|samplePapers|setPreview|setScenario|createFixtures|createMockTelematicsService|ExperienceProvider|useExperience)$/;
let scanned = 0;
async function audit(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = new URL(entry.name, dir);
    if (entry.isDirectory()) await audit(new URL(`${entry.name}/`, dir));
    else if (/\.jsx?$/.test(entry.name)) {
      scanned++;
      const source = await readFile(file, 'utf8');
      const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
      const namespaces = new Map();
      for (const node of ast.program.body) {
        if (node.type !== 'ImportDeclaration' || !node.source.value.startsWith('.')) continue;
        const namespace = node.specifiers.find(item => item.type === 'ImportNamespaceSpecifier');
        if (!namespace) continue;
        const target = new URL(`${node.source.value}.js`, file);
        const targetAst = parse(await readFile(target, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
        const names = new Set();
        for (const item of targetAst.program.body) {
          if (item.type !== 'ExportNamedDeclaration') continue;
          if (item.declaration?.id) names.add(item.declaration.id.name);
          for (const declaration of item.declaration?.declarations || []) names.add(declaration.id.name);
          for (const specifier of item.specifiers || []) names.add(specifier.exported.name);
        }
        namespaces.set(namespace.local.name, names);
      }
      traverse(ast, {
        Identifier(path) {
          assert.ok(!banned.test(path.node.name), `${file}: runtime example data/control ${path.node.name}`);
        },
        StringLiteral(path) {
          assert.ok(!/^(?:preview-|demo-token$|sample-(?:driver|vehicle|paper|recipient))/.test(path.node.value), `${file}: example identity remains`);
        },
        MemberExpression(path) {
          const names = namespaces.get(path.node.object.name);
          if (names && !path.node.computed) assert.ok(names.has(path.node.property.name), `${file}: missing screen/export ${path.node.object.name}.${path.node.property.name}`);
        },
        JSXOpeningElement(path) {
          let name = path.node.name;
          while (name.type === 'JSXMemberExpression') name = name.object;
          if (name.type === 'JSXIdentifier' && /^[A-Z]/.test(name.name)) {
            assert.ok(path.scope.hasBinding(name.name), `${file}: undefined component ${name.name}`);
          }
        },
        ObjectProperty(path) {
          if (path.node.key.name !== 'fallback') return;
          const value = path.node.value;
          assert.ok(value.type === 'NullLiteral' || (value.type === 'ArrayExpression' && !value.elements.length), `${file}: populated fallback is not allowed`);
        },
      });
    }
  }
}
await audit(new URL('../src/', import.meta.url));

const { experienceCopy } = await import(moduleUrl(await read('../src/telematics/experience/copy.js')));
for (const language of ['hi', 'bn']) {
  assert.deepEqual(Object.keys(experienceCopy[language]), Object.keys(experienceCopy.en));
  assert.ok(Object.values(experienceCopy[language]).every(value => typeof value === 'string' && value.trim()));
}

// Exercise the real hook with React effects: empty response, failed refresh,
// disabled request, out-of-order responses, scope changes and unmount.
const dom = new JSDOM('<!doctype html><div id="root"></div>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const hookSource = (await read('../src/hooks/useApi.js')).replace("from 'react'", `from ${JSON.stringify(import.meta.resolve('react'))}`);
const { useApi } = await import(moduleUrl(hookSource));
const root = createRoot(document.getElementById('root'));
let state;
const renderedStates = [];
function Probe({ load, scope, enabled = true }) {
  state = useApi(load, [scope], { enabled, fallback: [{ id: 'must-never-display' }] });
  renderedStates.push({ scope, data: state.data });
  return React.createElement('output', null, state.error ? 'error' : JSON.stringify(state.data));
}
const render = (props) => act(async () => { root.render(React.createElement(Probe, props)); });
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
try {
  let reads = 0;
  await render({ scope: 'disabled', enabled: false, load: async () => { reads++; return trucks; } });
  assert.equal(reads, 0);
  assert.equal(state.data, null);
  await render({ scope: 'empty', load: async () => [] });
  assert.deepEqual(state.data, []);
  await render({ scope: 'loaded', load: async () => trucks });
  assert.equal(state.data, trucks);
  const failure = new Error('Server unavailable');
  await render({ scope: 'failure', load: async () => { throw failure; } });
  assert.equal(state.data, null);
  assert.equal(state.error, failure);
  assert.ok(renderedStates.filter(item => item.scope === 'failure').every(item => item.data === null), 'old query data must be hidden even before effects');
  let failRefresh = false;
  await render({ scope: 'failed-refresh', load: async () => { if (failRefresh) throw failure; return trucks; } });
  assert.equal(state.data, trucks);
  failRefresh = true;
  await act(async () => { await state.refetch(); });
  assert.equal(state.data, null, 'a failed refresh must clear the last success');
  assert.equal(state.error, failure);
  const oldRead = deferred(), newRead = deferred();
  await render({ scope: 'branch-a', load: () => oldRead.promise });
  await render({ scope: 'branch-b', load: () => newRead.promise });
  await act(async () => { oldRead.resolve(trucks); });
  assert.equal(state.data, null, 'previous branch response must stay hidden');
  await act(async () => { newRead.resolve([]); });
  assert.deepEqual(state.data, []);
  const oldRefresh = deferred(), newRefresh = deferred();
  let refreshes = 0;
  await render({ scope: 'refresh-race', load: () => ++refreshes === 1 ? oldRefresh.promise : newRefresh.promise });
  let refresh;
  await act(async () => { refresh = state.refetch(); });
  await act(async () => { newRefresh.resolve(trucks); await refresh; });
  await act(async () => { oldRefresh.resolve([]); });
  assert.equal(state.data, trucks, 'late refresh must not replace latest data');
  const pending = deferred();
  await render({ scope: 'unmount', load: () => pending.promise });
  await act(async () => { root.unmount(); pending.resolve(trucks); });
} finally {
  dom.window.close();
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
}
console.log(`Passed: ${scanned} runtime files contain no example datasets/controls, localized unavailable copy, strict empty/invalid server responses, and real React hook failure/disabled/race/unmount behavior.`);
