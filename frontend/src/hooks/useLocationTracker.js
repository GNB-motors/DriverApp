import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { updateLiveLocation, enqueueLocationFix, flushLocationQueue } from '../services/driverLocationService';
import logger from '../utils/logger';

const TRACKING_INTERVAL_MS = 60000; // 1 minute cadence

/**
 * useLocationTracker:
 * Automatically captures GPS fixes on driver devices and reports them to
 * the GNB Motors backend to power Driver Location Reconciliation (Feature #20).
 *
 * @param {Object} options
 * @param {boolean} options.enabled - Whether tracking should be active (e.g. driver logged in)
 * @param {string|null} [options.tripId] - Current active trip ID if any
 */
export function useLocationTracker({ enabled = false, tripId = null } = {}) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    let isMounted = true;

    async function recordFix() {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          const req = await Location.requestForegroundPermissionsAsync();
          if (req.status !== 'granted') {
            await updateLiveLocation({ locationPermission: false }).catch(() => {});
            return;
          }
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!isMounted || !loc?.coords) return;

        const { latitude, longitude, accuracy, speed, heading, altitude } = loc.coords;

        // 1. Update live state
        await updateLiveLocation({
          locationPermission: true,
          latitude,
          longitude,
        }).catch(() => {});

        // 2. Add to historical batch queue
        await enqueueLocationFix({
          latitude,
          longitude,
          accuracyMeters: accuracy,
          speedMps: speed,
          headingDegrees: heading,
          altitude,
          recordedAt: new Date(loc.timestamp || Date.now()).toISOString(),
          source: 'FOREGROUND',
          tripId,
        });

        // 3. Flush queue
        await flushLocationQueue().catch(() => {});
      } catch (err) {
        logger.warn('useLocationTracker error:', err.message || err);
      }
    }

    // Initial capture
    recordFix();

    // Periodic capture
    timerRef.current = setInterval(recordFix, TRACKING_INTERVAL_MS);

    return () => {
      isMounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, tripId]);
}

export default useLocationTracker;
