import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import logger from '../utils/logger';

const PUSH_TOKEN_KEY = 'expo_push_token';

// Foreground notification display — show banner + sound while app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function setupAndroidChannel() {
  if (Platform.OS !== 'android') return;
  Notifications.setNotificationChannelAsync('sos', {
    name: 'SOS Alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#EF4444',
    sound: 'default',
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
export async function registerForPush(authToken, { registerDevice }) {
  if (!Device.isDevice) {
    logger.warn('Push', 'Push notifications require a physical device.');
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
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
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, expoPushToken);
    await registerDevice(expoPushToken, Platform.OS === 'ios' ? 'ios' : 'android', authToken);
    logger.info('Push', `Device registered: ${expoPushToken.slice(0, 24)}…`);
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
export async function unregisterFromPush(authToken, { unregisterDevice }) {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (!token) return;
    await unregisterDevice(token, authToken);
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    logger.info('Push', 'Device unregistered.');
  } catch (err) {
    logger.warn('Push', `Unregister failed: ${err.message}`);
  }
}
