import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Notifications from '../services/notificationsModule';
import { backgroundAvailable } from '../telematics/tracking/driverBackground';

/**
 * The location rule from the design: trips, mileage and auto-trip all need
 * "Allow all the time", the phone GPS switch on, and notifications allowed (so
 * the tracking notification and the "location is off" alert can show).
 *
 * Where a build cannot run background location at all (Expo Go, web) the rule
 * relaxes to "while using", so a developer build is never locked behind a
 * screen it can never pass.
 */
export async function readSetupStatus() {
  if (Platform.OS === 'web') return { checked: true, requireAlways: false, location: 'always', gpsOn: true, notifications: true, ok: true };
  const requireAlways = await backgroundAvailable().catch(() => false);
  const [foreground, background, gpsOn, notif] = await Promise.all([
    Location.getForegroundPermissionsAsync().catch(() => ({ status: 'undetermined' })),
    Location.getBackgroundPermissionsAsync().catch(() => ({ status: 'undetermined' })),
    Location.hasServicesEnabledAsync().catch(() => true),
    Notifications ? Notifications.getPermissionsAsync().catch(() => null) : Promise.resolve(null),
  ]);
  const location = background.status === 'granted' ? 'always' : foreground.status === 'granted' ? 'whileUsing' : 'none';
  // No notifications module (Expo Go on Android) means nothing can be checked or fixed here.
  const notifications = !notif || notif.granted || notif.ios?.status === Notifications?.IosAuthorizationStatus?.PROVISIONAL;
  const locationOk = location === 'always' || (!requireAlways && location === 'whileUsing');
  return {
    checked: true,
    requireAlways,
    location,
    locationOk,
    gpsOn,
    notifications,
    canAskForeground: foreground.status === 'undetermined' || foreground.canAskAgain !== false,
    canAskNotifications: !!notif && !notif.granted && notif.canAskAgain !== false,
    ok: locationOk && gpsOn && notifications,
  };
}

/**
 * Screen 05 "Continue": the system popups, each asked once. Android shows its
 * own While using / Only this time / Don't allow popup first; on a yes the
 * background request opens the app's location page (Android 11+). We never
 * repeat a popup — Android blocks it after two denials, so screen 06 sends the
 * driver to settings instead.
 */
export async function requestSetupPermissions() {
  if (Platform.OS === 'web') return readSetupStatus();
  const foreground = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: 'denied' }));
  if (foreground.status === 'granted' && (await backgroundAvailable().catch(() => false))) {
    await Location.requestBackgroundPermissionsAsync().catch(() => null);
  }
  if (Notifications) await Notifications.requestPermissionsAsync().catch(() => null);
  return readSetupStatus();
}

/** Opens the page that fixes the first broken item: GPS switch, else this app's settings. */
export async function openFixSettings(status) {
  if (Platform.OS === 'android' && status && status.locationOk && !status.gpsOn) {
    try { await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS'); return; } catch { /* fall through to app settings */ }
  }
  if (status && status.locationOk && status.gpsOn && !status.notifications && status.canAskNotifications && Notifications) {
    await Notifications.requestPermissionsAsync().catch(() => null);
    return;
  }
  await Linking.openSettings();
}

const setupKey = (userId) => `driverUi:locationSetupDone:${userId}`;
const SetupContext = createContext(null);

/**
 * Re-checks the rule on mount and every time the app returns to the
 * foreground (cold start and resume), as the design asks. `done` records that
 * this driver finished onboarding on this phone, so later failures show the
 * permission guard (08) instead of the first-run setup (05).
 */
export function DriverSetupProvider({ userId, children }) {
  const [status, setStatus] = useState({ checked: false, ok: false });
  const [done, setDone] = useState(null);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++sequence.current;
    const next = await readSetupStatus().catch(() => null);
    if (next && current === sequence.current) setStatus(next);
    return next;
  }, []);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(setupKey(userId)).then((value) => { if (active) setDone(value === '1'); }).catch(() => { if (active) setDone(false); });
    refresh();
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => { active = false; listener.remove(); };
  }, [userId, refresh]);
  const markDone = useCallback(async () => {
    setDone(true);
    await AsyncStorage.setItem(setupKey(userId), '1').catch(() => {});
  }, [userId]);
  return <SetupContext.Provider value={{ status, refresh, done, markDone, loaded: done !== null && status.checked }}>{children}</SetupContext.Provider>;
}
export const useDriverSetup = () => useContext(SetupContext);
