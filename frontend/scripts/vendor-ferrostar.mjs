#!/usr/bin/env node
// Package the real SDK from a pinned source checkout; never substitute a JS engine.
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';

const SOURCE_COMMIT = 'a499f24389554f2420c927f2aa29623221474087';
const VERSION = '0.59.0';
const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { values } = parseArgs({ options: {
  source: { type: 'string' },
  tools: { type: 'string' },
  'react-native': { type: 'string' },
  'llvm-strip': { type: 'string' },
  'skip-native-build': { type: 'boolean', default: false },
} });

if (!values.source) throw new Error('Pass --source /path/to/pinned/ferrostar checkout. See vendor/README.md.');
const source = resolve(values.source);
const sdk = join(source, 'react-native', 'uniffi');
const tools = resolve(values.tools || project);
const requireTools = createRequire(join(tools, 'package.json'));
const reactNative = values['react-native']
  ? resolve(values['react-native'])
  : dirname(requireTools.resolve('react-native/package.json'));
const vendor = join(project, 'vendor');
const stage = join(project, '.ferrostar-build', 'packages');
const strip = values['llvm-strip'] || process.env.FERROSTAR_LLVM_STRIP || 'llvm-strip';

function run(command, args, cwd, capture = false) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit',
    env: { ...process.env, npm_config_cache: process.env.npm_config_cache || join(project, '.ferrostar-build/npm-cache') } });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.status}): ${result.stderr || result.stdout || ''}`);
  return result.stdout?.trim();
}
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const head = run('git', ['rev-parse', 'HEAD'], source, true);
if (head !== SOURCE_COMMIT) throw new Error(`Expected upstream ${SOURCE_COMMIT}, got ${head}`);
// Tracked source modifications would make the provenance claim false.
const changed = run('git', ['diff', '--name-only', 'HEAD'], source, true);
if (changed) throw new Error(`Upstream tracked sources are modified: ${changed}`);

if (!values['skip-native-build']) {
  const ubrn = join(tools, 'node_modules', '.bin', 'ubrn');
  for (const platform of ['ios', 'android']) {
    run(ubrn, ['build', platform, '--config', 'ubrn.config.yaml', '--release', '--and-generate'], sdk);
  }
}

// Use the application's exact RN code generator, not an unpinned npx download.
for (const platform of ['android', 'ios']) {
  run(process.execPath, [join(reactNative, 'scripts', 'generate-codegen-artifacts.js'),
    '-p', sdk, '-t', platform, '-o', join(sdk, platform, 'generated'),
    '-s', 'library', '--forceOutputPath'], project);
}
// RN 0.88 still emits the generic package when invoked for a library.
const generic = join(sdk, 'android/generated/java/com/facebook/fbreact/specs');
const javaPackage = join(sdk, 'android/generated/java/com/stadiamaps/ferrostar');
if (existsSync(generic)) {
  await mkdir(javaPackage, { recursive: true });
  for (const name of await readdir(generic)) {
    const java = await readFile(join(generic, name), 'utf8');
    await writeFile(join(javaPackage, name), java.replace('package com.facebook.fbreact.specs', 'package com.stadiamaps.ferrostar'));
  }
  await rm(generic, { recursive: true });
}

// Upstream's verifier assumes clang-format whitespace. Match declarations independently
// of formatting and check every generated symbol in every packaged Rust archive.
const cpp = await readFile(join(sdk, 'cpp/generated/ferrostar.cpp'), 'utf8');
const start = cpp.indexOf('extern "C" {');
const end = cpp.indexOf('namespace uniffi::ferrostar', start);
if (start < 0 || end < 0) throw new Error('Cannot locate generated Rust declarations');
const symbols = [...new Set([...cpp.slice(start, end).matchAll(/\b((?:uniffi_ferrostar|ffi_ferrostar)_[a-zA-Z0-9_]+)\s*\(/g)].map(m => m[1]))];
if (symbols.length < 100) throw new Error('Generated symbol list is incomplete');
const archives = ['arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64']
  .map(abi => `android/src/main/jniLibs/${abi}/libferrostar.a`);
for (const item of await readdir(join(sdk, 'FerrostarRN.xcframework'), { withFileTypes: true })) {
  if (item.isDirectory()) archives.push(`FerrostarRN.xcframework/${item.name}/libferrostar.a`);
}
const nativeArtifacts = [];
for (const name of archives) {
  const bytes = await readFile(join(sdk, name));
  const table = bytes.toString('latin1');
  const missing = symbols.filter(symbol => !table.includes(symbol));
  if (missing.length) throw new Error(`${name}: missing generated symbols: ${missing.join(', ')}`);
  nativeArtifacts.push({ path: name, bytes: bytes.length, sha256: sha(bytes) });
}

await rm(stage, { recursive: true, force: true });
await mkdir(stage, { recursive: true });
await mkdir(vendor, { recursive: true });
const { build } = await import(pathToFileURL(requireTools.resolve('esbuild')).href);
const output = [];
const packagedNativeArtifacts = [];
for (const kind of ['uniffi', 'core']) {
  const from = join(source, 'react-native', kind);
  const to = join(stage, kind);
  await mkdir(to, { recursive: true });
  const manifest = JSON.parse(await readFile(join(from, 'package.json'), 'utf8'));
  await cp(join(from, 'src'), join(to, 'src'), { recursive: true });
  await cp(join(source, 'LICENSE.txt'), join(to, 'LICENSE'));
  delete manifest.scripts;
  delete manifest.devDependencies;
  delete manifest.tsup;
  delete manifest['react-native-builder-bob'];
  manifest.gnbDistribution = { upstreamCommit: SOURCE_COMMIT, nativeGenerator: 'uniffi-bindgen-react-native@0.31.0-5', reactNativeCodegen: '0.88.0' };
  manifest.types = `./src/index.${kind === 'uniffi' ? 'tsx' : 'ts'}`;
  manifest['react-native'] = manifest.types;
  if (kind === 'uniffi') {
    for (const item of ['android', 'ios', 'cpp', 'FerrostarRN.xcframework', 'FerrostarUniffiReactNative.podspec', 'react-native.config.js']) {
      await cp(join(from, item), join(to, item), { recursive: true, filter: path => !/(?:^|\/)(?:build|\.gradle|\.cxx)(?:\/|$)/.test(path) });
    }
    // Upstream's build.gradle names consumerProguardFiles 'proguard-rules.pro' but the
    // pinned commit ships no such file, which fails every minified release build.
    // Keep the TurboModule classes React Native finds by name; the Rust FFI is
    // reached through JSI/C++, not Java reflection.
    const proguard = join(to, 'android', 'proguard-rules.pro');
    if (!existsSync(proguard)) {
      await writeFile(proguard, '# Added by GNB packaging: missing upstream at the pinned commit.\n-keep class com.stadiamaps.ferrostar.** { *; }\n');
      manifest.gnbDistribution.addedFiles = ['android/proguard-rules.pro'];
    }
    // Rust's distributed standard library carries debug sections even in release
    // static archives. Remove only debug information; retain and reverify every
    // FFI symbol. This keeps the audited package below GitHub's per-file limit.
    for (const name of archives) {
      run(strip, ['--strip-debug', join(to, name)], project);
      const bytes = await readFile(join(to, name));
      const table = bytes.toString('latin1');
      if (symbols.some(symbol => !table.includes(symbol))) throw new Error(`Stripping removed an FFI symbol from ${name}`);
      packagedNativeArtifacts.push({ path: name, bytes: bytes.length, sha256: sha(bytes) });
    }
    manifest.files = ['src', 'lib', 'android', 'ios', 'cpp', 'FerrostarRN.xcframework', '*.podspec', 'react-native.config.js', 'LICENSE'];
    manifest.main = './lib/commonjs/index.js';
    manifest.module = './lib/module/index.js';
    manifest.exports = { '.': { types: manifest.types, 'react-native': manifest.types, import: manifest.module, require: manifest.main } };
    // These are exactly the bridge/runtime versions used to generate the native code.
    manifest.dependencies = { '@ubjs/core': '0.31.0-5', 'uniffi-bindgen-react-native': '0.31.0-5' };
  } else {
    manifest.files = ['src', 'lib', 'LICENSE'];
    manifest.main = './lib/index.js';
    manifest.dependencies = { '@stadiamaps/ferrostar-uniffi-react-native': VERSION };
  }
  await writeFile(join(to, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
  for (const format of kind === 'uniffi' ? ['cjs', 'esm'] : ['cjs']) {
    const outfile = kind === 'uniffi'
      ? join(to, 'lib', format === 'cjs' ? 'commonjs' : 'module', 'index.js')
      : join(to, 'lib/index.js');
    await build({ entryPoints: [join(to, manifest.types)], outfile, bundle: true, format,
      platform: 'neutral', target: 'es2022', sourcemap: true,
      external: ['react', 'react-native', '@ubjs/core', 'uniffi-bindgen-react-native', '@stadiamaps/ferrostar-uniffi-react-native'] });
  }
  const result = JSON.parse(run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', vendor], to, true))[0];
  if (kind === 'uniffi') {
    for (const item of [...archives, 'android/proguard-rules.pro', 'android/generated/jni/CMakeLists.txt', 'android/generated/java/com/stadiamaps/ferrostar/NativeFerrostarUniffiReactNativeSpec.java']) {
      if (!result.files.some(file => file.path === item)) throw new Error(`Pack omitted native file ${item}`);
    }
  }
  const bytes = await readFile(join(vendor, result.filename));
  if (bytes.length >= 100 * 1024 * 1024) throw new Error(`${result.filename} exceeds the repository per-file limit`);
  output.push({ name: manifest.name, version: VERSION, filename: result.filename, bytes: bytes.length, sha256: sha(bytes), integrity: result.integrity });
}
await writeFile(join(vendor, 'ferrostar-provenance.json'), JSON.stringify({
  schemaVersion: 1, source: 'https://github.com/stadiamaps/ferrostar', sourceCommit: SOURCE_COMMIT,
  version: VERSION, generatedSymbols: symbols.length, sourceNativeArtifacts: nativeArtifacts, nativeArtifacts: packagedNativeArtifacts, packages: output,
  patches: ['RN 0.88 codegen Java namespace normalization', 'Exact inter-package dependency versions; prebuilt JS entrypoints', 'Removed native debug sections; all FFI symbols verified afterward'],
}, null, 2) + '\n');
console.log(JSON.stringify({ generatedSymbols: symbols.length, packages: output }, null, 2));
