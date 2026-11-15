import { deviceLocationCollector } from './deviceLocationCollector';
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
} from "./locationQueue";
const TASK = "gnb-driver-location-batch-v1";
const CREDENTIALS = "gnb.driver.tracking.session";
let lastUpload = 0;
let lastRecorded = 0;
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
    const locations = data.locations.filter(location => !location.mocked);
    // Real native task fixes reach Ferrostar locally even while network upload is delayed.
    for (const location of locations) deviceLocationCollector.publish(location);
    const sampled = locations.filter(location => {
      if (location.timestamp - lastRecorded < 10000) return false;
      lastRecorded = location.timestamp; return true;
    });
    await queue.enqueue(sampled.map(location => locationFix(location, 'BACKGROUND')));
    if (Date.now() - lastUpload >= 120000) { lastUpload = Date.now(); await queue.flush(); }
    await AsyncStorage.removeItem(`${queueKey(session.user)}:error`);
  } catch (failure) {
    if ([401, 403].includes(failure.response?.status)) {
      await serialized(async () => {
        if (await active()) {
          await SecureStore.deleteItemAsync(CREDENTIALS);
          await Location.stopLocationUpdatesAsync(TASK);
          await deviceLocationCollector.setBackground(false);
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
const roles = { sharing: null, navigation: null };
function sameIdentity(a, b) {
  return !a || !b || (String(a.user._id) === String(b.user._id) && String(a.user.orgId) === String(b.user.orgId) && a.token === b.token);
}
async function applyRoles() {
  const session = roles.navigation || roles.sharing;
  if (!session) {
    await SecureStore.deleteItemAsync(CREDENTIALS);
    if ((await backgroundAvailable()) && (await Location.hasStartedLocationUpdatesAsync(TASK))) await Location.stopLocationUpdatesAsync(TASK);
    await deviceLocationCollector.setBackground(false);
    return;
  }
  const navigation = !!roles.navigation;
  await SecureStore.setItemAsync(CREDENTIALS, JSON.stringify({ ...session, navigation }));
  await Location.startLocationUpdatesAsync(TASK, {
    accuracy: navigation ? Location.Accuracy.BestForNavigation : Location.Accuracy.Balanced,
    timeInterval: navigation ? 1000 : 120000,
    distanceInterval: navigation ? 0 : 25,
    deferredUpdatesInterval: navigation ? 0 : 120000,
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.AutomotiveNavigation,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: navigation ? 'GNB navigation' : 'GNB location sharing',
      notificationBody: navigation ? 'Turn-by-turn guidance is using your location. Open DriverApp to stop guidance.' : 'Your location is being shared with your fleet.',
      killServiceOnDestroy: true,
    },
  });
  await deviceLocationCollector.setBackground(true);
}
async function startRole(role, session, isActive, requestPermission) {
  if (!(await backgroundAvailable())) throw new Error('Background navigation requires a native DriverApp build.');
  const permission = requestPermission ? await Location.requestBackgroundPermissionsAsync() : await Location.getBackgroundPermissionsAsync();
  if (permission.status !== 'granted') throw new Error('Always location permission is required for screen-off guidance.');
  return serialized(async () => {
    if (!isActive()) return;
    const other = role === 'navigation' ? roles.sharing : roles.navigation;
    if (!sameIdentity(other, session)) throw new Error('Location identity changed. Stop the previous session before starting.');
    const previous = roles[role]; roles[role] = session;
    try { await applyRoles(); } catch (error) { roles[role] = previous; await applyRoles().catch(() => {}); throw error; }
  });
}
export async function startBackground(session, isActive = () => true, requestPermission = true) {
  return startRole('sharing', session, isActive, requestPermission);
}
export async function stopBackground() {
  return serialized(async () => { roles.sharing = null; await applyRoles(); });
}
export async function startNavigationBackground(session, isActive = () => true) {
  return startRole('navigation', session, isActive, true);
}
export async function stopNavigationBackground() {
  return serialized(async () => { roles.navigation = null; await applyRoles(); });
}
