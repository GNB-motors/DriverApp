import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Notifications from './notificationsModule';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import logger from '../utils/logger';

const PUSH_TOKEN_KEY = 'expo_push_token';

async function accountKey(token) { return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, token || ''); }

// Foreground notification display — show banner + sound while app is open.
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function setupAndroidChannel() {
  if (Platform.OS !== 'android' || !Notifications) return;
  Notifications.setNotificationChannelAsync('sos', {
    name: 'SOS Alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#EF4444',
  }).catch(() => {});
}

async function getProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.manifest2?.extra?.expoClient?.extra?.eas?.projectId ??
    null
  );
}

/**
 * Request permissions and register this device's Expo push token with the
 * backend. Safe to call after every login — the backend upserts on token.
 *
 * Returns the Expo push token string, or null when push is unavailable
 * (simulator, permission denied, no project ID).
 */
async function register(authToken, { registerDevice, unregisterDevice, isCurrent = () => true, requestPermission = false }) {
  if (Platform.OS === 'web' || !isCurrent()) return null;
  if (!Notifications) {
    logger.warn('Push', 'Push notifications need a development build on Android (not Expo Go).');
    return null;
  }
  if (!Device.isDevice) {
    logger.warn('Push', 'Push notifications require a physical device.');
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted' && requestPermission) {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (!isCurrent()) return null;
  if (finalStatus !== 'granted') {
    if (unregisterDevice) await unregister(authToken, { unregisterDevice });
    logger.warn('Push', 'Notification permission not granted.');
    return null;
  }

  const projectId = await getProjectId();
  if (!projectId) {
    logger.warn('Push', 'No EAS project ID found — push token unavailable.');
    return null;
  }

  try {
    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!isCurrent()) return null;
    await registerDevice(expoPushToken, Platform.OS === 'ios' ? 'ios' : 'android', authToken);
    if (!isCurrent()) {
      if (unregisterDevice) await unregisterDevice(expoPushToken, authToken);
      return null;
    }
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, JSON.stringify({ token: expoPushToken, accountKey: await accountKey(authToken) }));
    logger.info('Push', 'Device registered.');
    return expoPushToken;
  } catch (err) {
    logger.warn('Push', `Registration failed: ${err.message}`);
    return null;
  }
}

/**
 * Remove this device's push token from the backend and clear local storage.
 * Call on logout and on notification permission removal.
 */
async function unregister(authToken, { unregisterDevice }) {
  try {
    const stored = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (!stored) return;
    let record;
    try { record = JSON.parse(stored); } catch { record = { token: stored, accountKey: await accountKey(authToken) }; }
    if (record.accountKey !== await accountKey(authToken)) return;
    await unregisterDevice(record.token, authToken);
    if (await AsyncStorage.getItem(PUSH_TOKEN_KEY) === stored) await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    logger.info('Push', 'Device unregistered.');
  } catch (err) {
    logger.warn('Push', `Unregister failed: ${err.message}`);
  }
}

// Keep token ownership changes ordered even when auth effects overlap.
let registrationQueue = Promise.resolve();
function serialize(operation) {
  const result = registrationQueue.then(operation, operation);
  registrationQueue = result.catch(() => {});
  return result;
}
export function registerForPush(authToken, options) { return serialize(() => register(authToken, options)); }
export function unregisterFromPush(authToken, options) { return serialize(() => unregister(authToken, options)); }
