import Constants from "expo-constants";
import { Platform } from "react-native";
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { appLoginUrl } from "../services/authEndpoint";
import Notifications from "../../services/notificationsModule";
import {
  createLocationQueue,
  queueKey,
  locationFix,
  recordAndFlush,
} from "./locationQueue";
const TASK = "gnb-driver-location-batch-v1";
const CREDENTIALS = "gnb.driver.tracking.session";
const NUDGE_EVERY_MS = 30 * 60 * 1000;
export const LOCATION_ALERT_CHANNEL = "location-alerts";

// Design screen 09 (B): when permission or the GPS switch goes off while
// tracking runs, post "Location is off" at most once every 30 minutes. Tapping
// it opens the app, whose permission guard (screen 08) then shows the fix.
async function nudgeIfLocationOff(session) {
  if (!Notifications || !session?.nudge) return;
  const [gpsOn, background] = await Promise.all([
    Location.hasServicesEnabledAsync().catch(() => true),
    Location.getBackgroundPermissionsAsync().catch(() => ({ status: "granted" })),
  ]);
  if (gpsOn && background.status === "granted") return;
  const key = `${queueKey(session.user)}:nudgedAt`;
  const last = Number(await AsyncStorage.getItem(key).catch(() => 0)) || 0;
  if (Date.now() - last < NUDGE_EVERY_MS) return;
  await AsyncStorage.setItem(key, String(Date.now())).catch(() => {});
  const gpsOnly = background.status === "granted" && !gpsOn;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: gpsOnly ? session.nudge.gpsTitle : session.nudge.title,
      body: gpsOnly ? session.nudge.gpsBody : session.nudge.body,
      data: { kind: "LOCATION_OFF" },
    },
    trigger: Platform.OS === "android" ? { channelId: LOCATION_ALERT_CHANNEL } : null,
  }).catch(() => {});
}
TaskManager.defineTask(TASK, async ({ data, error }) => {
  const saved = await SecureStore.getItemAsync(CREDENTIALS);
  if (!saved) return;
  const session = JSON.parse(saved);
  await nudgeIfLocationOff(session).catch(() => {});
  if (error) {
    await AsyncStorage.setItem(
      `${queueKey(session.user)}:error`,
      error.message || "Background location failed.",
    );
    return;
  }
  if (!data?.locations?.length) return;
  const active = async () =>
    (await SecureStore.getItemAsync(CREDENTIALS)) === saved;
  const queue = createLocationQueue({
    storage: AsyncStorage,
    key: queueKey(session.user),
    send: async (fixes) => {
      if (!(await active())) throw new Error("Tracking session ended.");
      const root = appLoginUrl(session.apiURL).replace(
        /\/app\/v1\/auth\/login$/,
        "",
      );
      const consent = (await axios.get(`${root}/app/v2/consent`, {
        timeout: 20000, headers: { Authorization: `Bearer ${session.token}`, 'X-App-Version': '2.0.0' },
      })).data.data;
      if (!consent?.state?.grantedAt || consent.state.withdrawnAt) {
        await SecureStore.deleteItemAsync(CREDENTIALS);
        await AsyncStorage.removeItem(queueKey(session.user));
        await AsyncStorage.removeItem(`${queueKey(session.user)}:mode`);
        await Location.stopLocationUpdatesAsync(TASK);
        throw new Error('Location consent is not active. Sharing stopped.');
      }
      if (!(await active())) throw new Error('Tracking session ended.');
      return (
        await axios.post(
          `${root}/driver/location/batch`,
          { fixes },
          {
            timeout: 20000,
            headers: { Authorization: `Bearer ${session.token}` },
          },
        )
      ).data.data;
    },
  });
  try {
    if (!(await active())) return;
    await recordAndFlush(
      queue,
      data.locations
        .filter((location) => !location.mocked)
        .map((location) => locationFix(location, "BACKGROUND")),
    );
    await AsyncStorage.removeItem(`${queueKey(session.user)}:error`);
  } catch (failure) {
    if ([401, 403].includes(failure.response?.status)) {
      await serialized(async () => {
        if (await active()) {
          await SecureStore.deleteItemAsync(CREDENTIALS);
          await Location.stopLocationUpdatesAsync(TASK);
        }
      });
    }
    await AsyncStorage.setItem(
      `${queueKey(session.user)}:error`,
      failure.message,
    ).catch(() => {});
    // Network failures preserve queued fixes for replay on the next task or foreground resume.
  }
});
export async function backgroundAvailable() {
  return (
    Constants.executionEnvironment !== "storeClient" &&
    (await TaskManager.isAvailableAsync())
  );
}
let operation = Promise.resolve();
const serialized = (action) => {
  const next = operation.catch(() => {}).then(action);
  operation = next;
  return next;
};
export async function startBackground(
  session,
  isActive = () => true,
  requestPermission = true,
) {
  if (!(await backgroundAvailable()))
    throw new Error(
      "Background sharing needs a native development build. Foreground sharing is available.",
    );
  const permission = requestPermission
    ? await Location.requestBackgroundPermissionsAsync()
    : await Location.getBackgroundPermissionsAsync();
  if (permission.status !== "granted")
    throw new Error(
      "Always location permission is required for background sharing.",
    );
  return serialized(async () => {
    if (!isActive()) return;
    await SecureStore.setItemAsync(CREDENTIALS, JSON.stringify(session));
    try {
      await Location.startLocationUpdatesAsync(TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 120000,
        distanceInterval: 25,
        deferredUpdatesInterval: 120000,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        // Design screen 09 (A): the quiet ongoing notification. Android keeps
        // a foreground-service notification on screen and not swipeable;
        // tapping it opens the app.
        foregroundService: {
          notificationTitle:
            session.notification?.title || "Sharing location for your trip",
          notificationBody:
            session.notification?.body || "Your location is being shared with your fleet.",
          notificationColor: "#213EA7",
        },
      });
    } catch (error) {
      await SecureStore.deleteItemAsync(CREDENTIALS);
      throw error;
    }
  });
}
export async function stopBackground() {
  return serialized(async () => {
    await SecureStore.deleteItemAsync(CREDENTIALS);
    if (
      (await backgroundAvailable()) &&
      (await Location.hasStartedLocationUpdatesAsync(TASK))
    )
      await Location.stopLocationUpdatesAsync(TASK);
  });
}
