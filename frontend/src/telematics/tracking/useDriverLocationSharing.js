import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  backgroundAvailable,
  startBackground,
  stopBackground,
} from "./driverBackground";
import {
  createLocationQueue,
  queueKey,
  locationFix,
  recordAndFlush,
} from "./locationQueue";
export async function capturePairingFix() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted")
    throw new Error("Allow location access to find a nearby truck.");
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  if (
    location.mocked ||
    location.coords.accuracy == null ||
    location.coords.accuracy > 100 ||
    Date.now() - location.timestamp > 120000
  )
    throw new Error(
      "A fresh location accurate to 100 metres is required. Try outdoors.",
    );
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    recordedAt: new Date(location.timestamp).toISOString(),
    mocked: !!location.mocked,
  };
}
export function useDriverLocationSharing({ user, token, service }) {
  const [mode, setMode] = useState("off");
  const [error, setError] = useState("");
  const [lastSent, setLastSent] = useState(null);
  const [pending, setPending] = useState(0);
  const [canBackground, setCanBackground] = useState(false);
  const [busy, setBusy] = useState(false);
  const lease = useRef(0);
  const current = useRef(null);
  const preference = `${queueKey(user)}:mode`;
  const stop = useCallback(
    async (forget = true) => {
      ++lease.current;
      const previous = current.current;
      current.current = null;
      if (previous) {
        clearInterval(previous.timer);
        previous.listener?.remove();
      }
      try {
        await stopBackground();
      } catch (failure) {
        setError(failure.message);
      }
      if (forget) await AsyncStorage.removeItem(preference);
      setMode("off");
    },
    [preference],
  );
  const start = useCallback(
    async (nextMode = "foreground", requestPermission = true) => {
      setBusy(true);
      setError("");
      let ticket;
      try {
        const stopped = stop(false);
        ticket = lease.current;
        await stopped;
        if (ticket !== lease.current) return;
        const permission = requestPermission
          ? await Location.requestForegroundPermissionsAsync()
          : await Location.getForegroundPermissionsAsync();
        if (permission.status !== "granted")
          throw new Error(
            "Location permission is required. Your location is not being shared.",
          );
        if (ticket !== lease.current) return;
        const queue = createLocationQueue({
          storage: AsyncStorage,
          key: queueKey(user),
          send: service.sendLocationBatch,
          isActive: () => ticket === lease.current,
        });
        let running = false;
        const send = async () => {
          if (
            running ||
            AppState.currentState !== "active" ||
            ticket !== lease.current
          )
            return;
          running = true;
          try {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            if (ticket !== lease.current) return;
            const remaining = await recordAndFlush(queue, [
              locationFix(location, "FOREGROUND"),
            ]);
            if (ticket === lease.current) {
              setPending(remaining || 0);
              setLastSent(new Date().toISOString());
              setError("");
            }
          } catch (failure) {
            if (ticket === lease.current) {
              setError(failure.message);
              const count = await queue.count().catch(() => null);
              if (ticket === lease.current) setPending(count);
            }
          } finally {
            running = false;
          }
        };
        if (nextMode === "background") {
          await startBackground(
            {
              user: {
                _id: user._id,
                orgId:
                  typeof user.orgId === "object" ? user.orgId?._id : user.orgId,
              },
              token,
              apiURL: process.env.EXPO_PUBLIC_API_URL,
            },
            () => ticket === lease.current,
            requestPermission,
          );
          if (ticket !== lease.current) return;
        }
        current.current = {
          timer: nextMode === "foreground" ? setInterval(send, 120000) : null,
          listener: AppState.addEventListener("change", (state) => {
            if (state === "active") {
              if (nextMode === "foreground") send();
              else
                queue
                  .count()
                  .then(async (count) => {
                    const remaining = await queue.flush();
                    if (ticket === lease.current) {
                      setPending(remaining);
                      if (count) setLastSent(new Date().toISOString());
                      const backgroundError = await AsyncStorage.getItem(
                        `${queueKey(user)}:error`,
                      );
                      if (ticket === lease.current)
                        setError(backgroundError || "");
                    }
                  })
                  .catch((failure) => {
                    if (ticket === lease.current) setError(failure.message);
                  });
            }
          }),
        };
        await AsyncStorage.setItem(preference, nextMode);
        if (ticket !== lease.current) return;
        setMode(nextMode);
        if (nextMode === "foreground") send();
      } catch (failure) {
        if (ticket === lease.current) {
          await stop(false);
          setError(failure.message);
        }
      } finally {
        if (ticket === lease.current || !current.current) setBusy(false);
      }
    },
    [user, token, service, stop, preference],
  );
  useEffect(() => {
    let mounted = true;
    setLastSent(null);
    createLocationQueue({
      storage: AsyncStorage,
      key: queueKey(user),
      send: service.sendLocationBatch,
    })
      .count()
      .then((count) => {
        if (mounted) setPending(count);
      })
      .catch((failure) => {
        if (mounted) {
          setPending(null);
          setError(failure.message);
        }
      });
    AsyncStorage.getItem(`${queueKey(user)}:error`)
      .then((message) => {
        if (mounted && message) setError(message);
      })
      .catch(() => {});
    backgroundAvailable()
      .then((available) => {
        if (mounted) setCanBackground(available);
      })
      .catch(() => {});
    AsyncStorage.getItem(preference)
      .then((saved) => {
        if (mounted && saved) start(saved, false);
      })
      .catch((failure) => {
        if (mounted) setError(failure.message);
      });
    return () => {
      mounted = false;
      stop(false).catch(() => {});
    };
  }, [start, stop, preference]);
  return { mode, error, pending, lastSent, canBackground, busy, start, stop };
}
