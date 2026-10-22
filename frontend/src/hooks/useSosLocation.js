import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import logger from '../utils/logger';

// A cached fix older or looser than this is not shown at all: in an emergency a
// confidently wrong place is worse than "getting your location".
const LAST_KNOWN = { maxAge: 60000, requiredAccuracy: 100 };

const hhmm = (ts) => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * useSosLocation — the phone's position for the SOS screens. Display only:
 * nothing is uploaded or sent from here; the driver shares it themselves.
 *
 * Shows a recent cached fix at once (no wait in an emergency), then refines it
 * with a fresh high-accuracy fix. Until the fresh fix lands the position is
 * marked approximate, with its age and accuracy, both on screen and in the
 * shared message.
 */
export default function useSosLocation() {
  const [fix, setFix] = useState(null); // { coords, timestamp, fresh }
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
        const last = await Location.getLastKnownPositionAsync(LAST_KNOWN).catch(() => null);
        if (alive && last?.coords) setFix({ coords: last.coords, timestamp: last.timestamp, fresh: false });
        const now = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (alive && now?.coords) setFix({ coords: now.coords, timestamp: now.timestamp, fresh: true });
      } catch (err) {
        logger.warn('useSosLocation error:', err.message || err);
        if (alive) setError('Could not get your current location');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const coords = fix?.coords || null;
  const accuracy = Number.isFinite(coords?.accuracy) ? `±${Math.round(coords.accuracy)} m` : null;
  const asOf = fix ? hhmm(fix.timestamp || Date.now()) : null;
  const approximate = !!fix && !fix.fresh;

  let label = error || 'Getting your location…';
  if (coords) {
    const where = `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
    const meta = [accuracy, approximate ? `approx. as of ${asOf}` : null].filter(Boolean).join(' · ');
    label = meta ? `${where} · ${meta}` : where;
    if (error) label = `${label} · ${error}`;
  }

  const mapsUrl = coords ? `https://maps.google.com/?q=${coords.latitude},${coords.longitude}` : null;
  const shareText = mapsUrl
    ? approximate
      ? `Approximate location as of ${asOf}${accuracy ? ` (${accuracy})` : ''}: ${mapsUrl}`
      : `My location: ${mapsUrl}`
    : 'I could not get my location yet.';

  return { coords, label, mapsUrl, shareText, approximate, error };
}
