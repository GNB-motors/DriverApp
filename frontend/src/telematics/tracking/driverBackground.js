import Constants from "expo-constants";
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { appLoginUrl } from "../services/authEndpoint";
import {
  createLocationQueue,
  queueKey,
  locationFix,
  recordAndFlush,
} from "./locationQueue";
const TASK = "gnb-driver-location-batch-v1";
const CREDENTIALS = "gnb.driver.tracking.session";
TaskManager.defineTask(TASK, async ({ data, error }) => {
  const saved = await SecureStore.getItemAsync(CREDENTIALS);
  if (!saved) return;
  const session = JSON.parse(saved);
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
        foregroundService: {
          notificationTitle: "GNB location sharing",
          notificationBody: "Your location is being shared with your fleet.",
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
