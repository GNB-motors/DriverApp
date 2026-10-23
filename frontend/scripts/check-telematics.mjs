import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const root = fileURLToPath(new URL('../', import.meta.url));
const sourceRoot = path.join(root, 'src/telematics');
async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(file));
    else if (file.endsWith('.js')) result.push(file);
  }
  return result;
}
const sources = await files(sourceRoot);
for (const file of [...sources, path.join(root, 'App.js'), path.join(root, 'src/navigation/AppNavigator.js'), path.join(root, 'src/services/api.js')]) {
  const ast = parse(await readFile(file, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
  if (!file.startsWith(sourceRoot)) continue;
  traverse(ast, {
    ImportDeclaration({ node }) {
      const target = node.source.value;
      assert.ok(!/^(axios|expo-location|expo-camera|expo-image-picker|expo-notifications|expo-task-manager|react-native-sse)$/.test(target), `${file}: operational SDK import ${target}`);
      if (target.startsWith('.')) {
        const resolved = path.resolve(path.dirname(file), target);
        assert.ok(!resolved.startsWith(path.join(root, 'src/services') + path.sep), `${file}: real service import`);
        assert.ok(!resolved.startsWith(path.join(root, 'src/hooks') + path.sep), `${file}: legacy API/tracking hook import`);
      }
    },
    CallExpression({ node }) {
      if (node.callee.type === 'Identifier') assert.ok(!['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource'].includes(node.callee.name), `${file}: operational network call`);
    },
    NewExpression({ node }) {
      if (node.callee.type === 'Identifier') assert.ok(!['XMLHttpRequest', 'WebSocket', 'EventSource'].includes(node.callee.name), `${file}: operational network constructor`);
    },
  });
}
console.log(`Syntax/source-boundary audit passed (${sources.length} telematics files). This is not a runtime network trace.`);
for (const script of ['foundation', 'driver', 'manager', 'owner']) {
  const result = spawnSync(process.execPath, [path.join(root, `scripts/check-telematics-${script}.mjs`)], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('Telematics automated verification passed. Real-account, device and runtime network checks remain manual.');
