import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { updateLiveLocation } from '../services/driverLocationService';
import logger from '../utils/logger';

/**
 * useSosLocation — the phone's real position for the SOS screens.
 *
 * Shows the last known fix at once (no wait in an emergency), then refines it
 * with a fresh high-accuracy fix. The fresh fix is also pushed to the driver's
 * live location so the web app shows where the driver is; it does NOT notify
 * anyone by itself.
 */
export default function useSosLocation() {
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') ({ status } = await Location.requestForegroundPermissionsAsync());
        if (status !== 'granted') {
          if (alive) setError('Location permission is off');
          return;
        }
        const last = await Location.getLastKnownPositionAsync().catch(() => null);
        if (alive && last?.coords) setCoords(last.coords);
        const fresh = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (!alive || !fresh?.coords) return;
        setCoords(fresh.coords);
        updateLiveLocation({
          locationPermission: true,
          latitude: fresh.coords.latitude,
          longitude: fresh.coords.longitude,
        }).catch(() => {});
      } catch (err) {
        logger.warn('useSosLocation error:', err.message || err);
        if (alive) setError('Could not get your location');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const label = coords
    ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
    : error || 'Getting your location…';
  const mapsUrl = coords
    ? `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`
    : null;

  return { coords, label, mapsUrl, error };
}
