# Building and shipping the driver app with turn-by-turn navigation

Turn-by-turn navigation uses **Ferrostar 0.59.0** (Stadia Maps' open-source navigation SDK) and
**MapLibre React Native 11**. Ferrostar's React Native packages are not on the public npm
registry, so this repo ships them as audited tarballs in `vendor/`. That changes how the app
is built and released. Read this before the first production build.

## 1. What is custom

| Piece | Where it comes from | Why it matters |
|---|---|---|
| `@stadiamaps/ferrostar-core-react-native` | `vendor/stadiamaps-ferrostar-core-react-native-0.59.0.tgz` | JS layer of the SDK |
| `@stadiamaps/ferrostar-uniffi-react-native` | `vendor/stadiamaps-ferrostar-uniffi-react-native-0.59.0.tgz` (~97 MB) | Rust navigation core compiled for Android (arm64-v8a, armeabi-v7a, x86, x86_64) and iOS (device + simulator) |
| `@maplibre/maplibre-react-native` 11.3.10 | npm | Native map renderer, used by the navigation screen |
| `expo-speech`, `expo-location`, `react-native-svg` | npm | Voice instructions, GPS, truck marker |

Both tarballs are stored with **Git LFS**. Provenance (upstream commit, SHA-256 of every native
archive) is in `vendor/ferrostar-provenance.json`; how to rebuild them is in `vendor/README.md`.

Consequences:

- **No Expo Go.** The app needs a development build or a store build.
- **No OTA for native changes.** An EAS Update (JS only) cannot add or change these native
  libraries. Changing Ferrostar, MapLibre or any native module needs a new binary.
- `runtimeVersion` uses the `appVersion` policy, so **bump `version` in `app.json`** whenever native
  dependencies change. Old binaries then won't receive JS bundles they can't run.
- `APP_VERSION` in `src/telematics/services/authEndpoint.js` must equal `app.json` `version`.
  The backend answers `426` without a matching `X-App-Version`, and the navigation endpoints need
  app version `2.0.0` or later. `npm run check:telematics` enforces this.

## 2. Machine setup (once)

- Node 20 LTS (same as CI) and npm.
- Git LFS: `brew install git-lfs && git lfs install`.
- EAS CLI 18.11 or later: `npm i -g eas-cli`, then `eas login`.
- Local native builds only: Android Studio with SDK + NDK and JDK 17; Xcode with CocoaPods for iOS.

## 3. Get the code with the real tarballs

```sh
git clone https://github.com/GNB-motors/DriverApp.git
cd DriverApp
git lfs pull                 # replaces LFS pointer files with the real tarballs
cd frontend
ls -lh vendor/*.tgz          # the uniffi tarball must be ~97 MB, not ~130 bytes
npm ci
```

If `vendor/*.tgz` are only a few hundred bytes, LFS did not pull, and `npm ci` will fail
or install a broken package. Fix with `git lfs pull` before going further.

## 4. Configuration

Set these per build profile in `eas.json` (`build.<profile>.env`) or as EAS environment variables.
The `REPLACE-WITH-...` placeholders in `eas.json` must be replaced before any real build.

| Variable | Required | Notes |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | yes | Backend base URL, e.g. `https://api.example.com/api` |
| `EXPO_PUBLIC_ENV` | yes | `development` / `staging` / `production` |
| `EXPO_PUBLIC_SENTRY_DSN` | recommended | Crash reporting |
| `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY` | yes (Android) | Used by the fleet map screens, not navigation |
| `EXPO_PUBLIC_MAP_STYLE_URL` | optional | Navigation basemap. Unset = OpenFreeMap "liberty" (`https://tiles.openfreemap.org/styles/liberty`, OpenStreetMap data, no key). Set it to your own MapLibre style once you self-host tiles. Offline "verify resources" only trusts this origin, so that check needs it set |

`EXPO_PUBLIC_*` values are compiled into the JS bundle. Never put secrets in them.

**Backend requirements** (main-backend):

- `VALHALLA_BASE_URL` must point at a reachable Valhalla instance. Without it,
  `POST /api/app/v2/routes/our` returns 503 and the app cannot plan routes.
- The driver needs an open truck assignment and granted location consent, or navigation won't start.
- `POST /api/app/v2/nav/sessions` and `PATCH /api/app/v2/nav/sessions/:id` require an
  `Idempotency-Key` header. The app sends it; keep it if you touch `telematicsApi.js`.

## 5. Build

### Cloud builds (recommended)

EAS uploads your working tree, so run `git lfs pull` first (step 3). The upload includes the
97 MB tarball; that is expected.

```sh
cd frontend
npm run check:telematics && npm run test:guidance   # must pass
eas build --profile preview --platform android      # internal APK for testers
eas build --profile production --platform android   # Play Store AAB
eas build --profile production --platform ios       # App Store
eas submit --profile production --platform android  # or ios
```

### Local builds

`android/` and `ios/` are not committed; generate them from the Expo config:

```sh
npx expo prebuild --clean
# Android
cd android && ./gradlew :app:assembleRelease      # or :app:bundleRelease for the Play Store
# iOS
cd ios && pod install && open *.xcworkspace        # archive from Xcode
```

To save time while testing on one Android device, build a single ABI:
`./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a`.

## 6. Release checklist

1. `git lfs pull` done; the uniffi tarball is ~97 MB.
2. `app.json` `version` bumped if any native dependency changed, and `APP_VERSION` matches it.
3. `npm run check:telematics` and `npm run test:guidance` pass.
4. `eas.json` placeholders replaced; `EXPO_PUBLIC_API_URL` points at the right backend.
5. Backend has `VALHALLA_BASE_URL` set and the nav endpoints deployed.
6. On a real phone with the release build:
   - log in as a driver with an assigned truck
   - Navigate → search a destination → **Find truck routes** → route draws on the map
   - **Start** → voice + banner instructions, truck marker follows the road
   - drive or walk a short way: the banner, distance and ETA update
   - **End** → session closes
   - airplane mode mid-route: guidance continues on the saved route
7. Ship to internal testers (preview APK / TestFlight) before production.

## 7. Updating Ferrostar

Follow `vendor/README.md`: clone the exact upstream commit, run `npm run vendor:ferrostar`
with the Rust/NDK/Xcode toolchain, commit the new tarballs (LFS) and provenance file, bump the
app version and ship a new binary. Don't hand-edit the tarballs.

## 8. Testing on an emulator

- The backend runs on the host: `adb reverse tcp:3000 tcp:3000` and `adb reverse tcp:8081 tcp:8081`
  (re-run after an emulator restart).
- Fake a position with `adb emu geo fix <lng> <lat>` (longitude first). Navigation only starts
  with a fresh fix, so send one right before tapping **Start**. If the app stops accepting
  simulated fixes, force-stop and relaunch it.
- Valhalla for local work: tunnel to the server running it and set the backend's
  `VALHALLA_BASE_URL` to the tunnel.

## Known gaps

- Bengali voice: the backend returns English instruction text for `language=bn`, which the app
  then reads out with the Bengali voice.
- No offline-map download has been verified on a device in airplane mode yet.
- OpenFreeMap is a free public service with no SLA; self-host tiles (Planetiler → PMTiles) and
  set `EXPO_PUBLIC_MAP_STYLE_URL` as the fleet grows.
