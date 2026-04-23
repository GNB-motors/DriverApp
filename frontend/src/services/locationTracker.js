import * as Location from 'expo-location';
import { sendDriverLocation } from './api';

const INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

let intervalId = null;

async function sendLocation(token) {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    const hasPermission = status === 'granted';

    if (!hasPermission) {
      await sendDriverLocation(token, { locationPermission: false });
      return;
    }

    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await sendDriverLocation(token, {
        locationPermission: true,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch {
      // GPS on but no fix — Scenario C
      await sendDriverLocation(token, { locationPermission: true });
    }
  } catch (err) {
    console.warn('[LocationTracker] Failed to send location:', err.message);
  }
}

export function startLocationTracking(token) {
  if (intervalId) return; // already running
  // Send immediately, then every INTERVAL_MS
  sendLocation(token);
  intervalId = setInterval(() => sendLocation(token), INTERVAL_MS);
}

export function stopLocationTracking() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export function isTracking() {
  return intervalId !== null;
}
