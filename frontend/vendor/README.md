# Pinned Ferrostar distribution

The tarballs are stored with Git LFS: run `git lfs install` once before cloning,
or `git lfs pull` in an existing checkout, so `npm install` gets the real files.

The public npm registry does not publish the Ferrostar React Native packages at
the time of this integration. The two tarballs here contain the real 0.59.0 SDK,
compiled from upstream commit `a499f24389554f2420c927f2aa29623221474087`.
They are local npm dependencies, not a replacement navigation implementation.

`ferrostar-provenance.json` records package integrity, source revision and SHA-256
for all Android and iOS Rust archives. The packaging script verifies generated
FFI symbols against every archive before accepting a tarball. Debug sections are
removed with the Android NDK's `llvm-strip`; source and packaged archive hashes
are both recorded, and all FFI symbols are checked again afterward. The BSD licence
is included in each package. Transitive UniFFI runtime packages retain their
own licences.

To rebuild on macOS, install Rust stable (MSRV 1.88), Xcode, Android SDK/NDK,
`cargo-ndk`, the four Android Rust targets and the iOS device/simulator targets.
Use the pinned UniFFI generator `uniffi-bindgen-react-native@0.31.0-5` and
`esbuild@0.27.7` in a tools directory. Clone the exact upstream commit, then run:

```sh
node scripts/vendor-ferrostar.mjs --source /path/to/ferrostar --tools /path/to/tools
npm install
```

The application uses React Native 0.88's code generator. Pass `--react-native`
with that package directory when the tools directory has no React Native.
Pass `--llvm-strip /path/to/ndk/toolchains/llvm/prebuilt/host/bin/llvm-strip`
if the NDK strip tool is not on PATH.
`--skip-native-build` repackages already-built archives but still regenerates
the bridge, checks source provenance and verifies all native symbols.

The script does not install global tools, change system paths, publish packages
or deploy the application. Native dependency changes require a new app binary;
an OTA JavaScript update or Expo Go cannot load these bindings.
