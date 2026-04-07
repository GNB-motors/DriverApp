# FleetEdge Driver App

React Native (Expo) mobile app for truck drivers on the FleetEdge fleet management platform. Built for low-literacy, low-connectivity environments on entry-level Android hardware.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Navigation | React Navigation v7 (native stack + bottom tabs) |
| State | React Context (Auth, Language) |
| Storage | AsyncStorage |
| Camera | expo-camera |
| Location | expo-location |
| Photo watermark | react-native-view-shot |
| Backend | FleetEdge main-backend (Node.js/Express + MongoDB) |

---

## Design Principles

The app is built for drivers — not managers. Key constraints:

- **Literacy-friendly** — icons carry meaning without labels; short 3-word max button text; conversational Hindi/regional language
- **Camera-first** — no gallery picker anywhere in the trip/fuel flow; every photo is taken live
- **Accept is final** — once a photo is accepted in preview, it cannot be retaken from the upload screen
- **No punitive data** — overspeeding, mileage scores, fleet comparisons are never shown to the driver
- **Driver never types numbers** — OCR reads fuel receipts and odometer silently; manager corrects if OCR fails

---

## What's Built

### Authentication
- Passwordless OTP login via Fast2SMS SMS
- 30-day JWT token persisted in AsyncStorage
- Session rehydration on app restart

### Home Screen
- Shows driver's name from JWT
- My Vehicle card — persists last selected vehicle to AsyncStorage
- Start Refuel entry point

### Vehicle Selection (`VehicleScreen`)
- Fetches all org vehicles from `GET /api/vehicles`
- Tap to select — saved as default vehicle in AsyncStorage
- Pre-selects saved vehicle on every refuel flow; driver doesn't re-pick each time

### Refuel Flow (3 screens)
**RefuelDetailsScreen**
- Vehicle pre-selected from saved default (locked if assigned, changeable if not)
- Driver name pulled from AuthContext
- Refuel type: Full Tank or Partial

**PhotoPreviewScreen**
- Opens device camera directly — no gallery option
- GPS location captured when shutter fires
- On Accept: timestamp + coordinates watermark burned into photo via ViewShot before the image is sent onwards
- Retake available only before accepting

**UploadPhotosScreen**
- Photo capture cards (odometer + fuel bill)
- OCR runs silently after each photo accepted — extracts litres, rate, odometer reading
- Driver sees no form fields; just takes photos and taps Submit
- On Submit: uploads photos as documents → calls `POST /api/mileage/fuel-log`
- Fuel log created with OCR-extracted values (or null if OCR fails — manager corrects later)

### Profile Screen
- Shows real driver name and mobile number from JWT

### SOS Button
- Floating button visible on all screens
- Navigates to `SOSOptionsScreen` (UI complete, backend not yet wired)

---

## API Endpoints Used

| Function | Endpoint |
|---|---|
| Request OTP | `POST /api/auth/driver/request-otp` |
| Verify OTP | `POST /api/auth/driver/verify-otp` |
| Fetch vehicles | `GET /api/vehicles` |
| Fetch drivers | `GET /api/employees?role=DRIVER` |
| OCR scan | `POST /api/ocr/scan` |
| Upload document | `POST /api/documents` |
| Submit fuel log | `POST /api/mileage/fuel-log` |
| Last odometer | `GET /api/mileage/last-odometer/:vehicleId` |
| Mileage history | `GET /api/mileage/intervals` |

---

## Running Locally

```bash
cd frontend
npm install
npx expo start
```

Set `API_BASE_URL` in `src/services/api.js`:
- Android emulator: `http://10.0.2.2:3000/api`
- iOS simulator: `http://localhost:3000/api`
- Physical device: `http://<your-machine-ip>:3000/api`
- Dev tunnel (VS Code): set tunnel to **Public**, use the tunnel URL

---

## Pending Features

### 3rd Tab — Fuel Log History
The design doc specifies 3 main tabs. Currently Home + Profile only. The 3rd tab should show the driver's past fuel log intervals using `GET /api/mileage/intervals`. Relevant API function `fetchMileageIntervals` is already in `api.js`.

### Wallet / DocumentsScreen
`DocumentsScreen` currently shows 3 hardcoded mock documents. Needs:
- `GET /api/documents` endpoint scoped to the driver
- Upload flow for personal documents (DL, Aadhaar, RC, Insurance, PUC)
- Offline caching so documents are viewable without internet (for police checkpoints)
- QR / WhatsApp share for RTO inspections

### SOS + Breakdown — Backend Wiring
UI screens exist (`SOSOptionsScreen`, `SOSEmergencyActiveScreen`) but nothing is connected to the backend. Needs:
- `POST /api/sos` — sends GPS + timestamp, notifies manager + emergency contact via SMS/WhatsApp
- Long-press 3-second hold → auto-trigger (prevents accidental activation)
- Breakdown flow — 3-tap problem type picker → ops team task queue

### Offline Queue for Fuel Submissions
When no connectivity, fuel log submissions fail silently. The correct behaviour is to queue them in AsyncStorage and retry when connected, with a sync status bar. Deferred because drivers don't enter data manually (OCR handles it) — revisit once the manager correction flow exists so partial submissions have a resolution path.

### Manager Correction UI (Fleet Owner App)
When OCR fails on a blurry photo, the fuel log is created with null values for litres/rate/odometer. The manager needs a view in the fleet owner dashboard to see incomplete logs and fill in the missing values. This is a backend + manager frontend feature, not a driver app feature.

### Photo Watermark — Reverse Geocode
The watermark currently shows raw GPS coordinates (`23.7957, 86.4304`). Better UX would show a human-readable location (`HP Pump, near Dhanbad Toll Plaza`). Requires a reverse geocoding call (Google Maps API or nominatim) at the time of photo capture.

### Voice Input
Design doc principle: microphone icon on every text field so semi-literate drivers can speak instead of type. Relevant for any future text input fields added to the driver app. Uses the device's built-in speech recognition (Google Hindi/regional language models).

### Passive Safety — Impact Detection
Background accelerometer monitoring during active sessions. If deceleration > 4G in < 0.5s, show "Are you okay?" prompt with 120-second auto-SOS countdown. Requires `expo-sensors` + background task.

---

## Project Structure

```
src/
  context/
    AuthContext.js        — JWT + OTP login state
    LanguageContext.js    — i18n
  navigation/
    AppNavigator.js       — stack + bottom tabs
  screens/
    LoginScreen.js        — OTP login (2 steps)
    HomeScreen.js         — landing, vehicle card, refuel entry
    VehicleScreen.js      — vehicle picker with persistent selection
    RefuelDetailsScreen.js — vehicle + refuel type selection
    PhotoPreviewScreen.js  — camera + watermark
    UploadPhotosScreen.js  — photo capture + silent OCR + submit
    ProfileScreen.js
    DocumentsScreen.js    — (mock, not wired)
    SOSOptionsScreen.js   — (UI only, not wired)
    SOSEmergencyActiveScreen.js — (UI only, not wired)
  services/
    api.js                — all backend API calls
  styles/                 — per-screen StyleSheet files
  i18n/
    translations.js       — Hindi + English strings
```
