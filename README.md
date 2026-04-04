# 🚚 Driver App Prototype

A high-fidelity, literacy-friendly React Native mobile application designed specifically for truck and fleet drivers operating under varying network conditions. Engineered with a massive focus on accessibility, speed, and safety, this app streamlines driver workflows including refuelling, document tracking, and emergency handling.

---

## 🌟 Core Features

- **🌐 Deep Localization Engine (i18n):** 
  Built from the ground up for full bilingual support (English & Hindi). Includes a seamless first-time launch language selector that writes to `@react-native-async-storage/async-storage` for permanent state persistence. 
- **⛽ Smart Refuelling Flow:** 
  Guided action-first workflows that adjust dynamically based on driver input. Full refuels strictly enforce dual-photo documentation (Odometer + Fuel Bill) utilizing robust cross-screen state persistence. Dropdown selectors protect against manual entry typos.
- **📸 Native Camera Integrations:** 
  Bypasses native device galleries entirely with `expo-camera`. Triggers an instant full-screen capture state with instant photo previews, forcing drivers to Accept or Retake on the spot to ensure high-quality documentation.
- **🚨 Pulse SOS System:** 
  A persistent floating SOS module available globally across the application. Long-pressing triggers an inescapable pulsing modal with high-contrast UI dispatching breakdown or emergency alerts instantly.

---

## 🛠️ Tech Stack

- **Framework:** [React Native](https://reactnative.dev/) (Managed by [Expo](https://expo.dev/))
- **Navigation:** `@react-navigation/native` / `@react-navigation/bottom-tabs` / `@react-navigation/native-stack`
- **Data Persistence:** `@react-native-async-storage/async-storage`
- **Native Modules:** `expo-camera`, `@react-native-picker/picker`, `react-native-safe-area-context`
- **Icons:** `@expo/vector-icons`

---

## 🚀 Quick Start Instructions

Follow these instructions to get the app running locally on your emulator or physical device.

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed and the [Expo Go](https://expo.dev/go) app installed on your physical testing device (iOS/Android).

### 2. Clone the Repository
```bash
git clone https://github.com/GNB-motors/DriverApp.git
cd DriverApp
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Start the Development Server
```bash
npx expo start
```

### 5. Open the App
- **For Physical Devices:** Open the camera app (iOS) or the Expo Go app (Android) and scan the massive QR code displayed in your terminal.
- **For Emulators:** Press `a` in the terminal to launch on the Android Emulator, or `i` to launch on the iOS Simulator.

---

## 🎨 Design System

All padding, border radii (12px), primary hex codes, and typography elements are centralized inside `src/theme/theme.js`. Minimum touch targets are enforced at `48dp` universally to comply with modern accessibility standards, and text contrasts are heavily saturated to maintain visibility under harsh direct sunlight.