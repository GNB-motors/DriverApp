import AsyncStorage from '@react-native-async-storage/async-storage';
import client from './client';
import logger from '../utils/logger';

const QUEUE_STORAGE_KEY = 'gnb_driver_location_offline_queue';
const MAX_BATCH_SIZE = 250;

/**
 * Update the driver's current live location on the backend.
 * Calls POST /api/driver/location
 *
 * @param {Object} params
 * @param {boolean} params.locationPermission
 * @param {number|null} [params.latitude]
 * @param {number|null} [params.longitude]
 */
export async function updateLiveLocation({ locationPermission, latitude, longitude }) {
  try {
    const res = await client.post('/driver/location', {
      locationPermission: Boolean(locationPermission),
      latitude: latitude !== undefined ? latitude : null,
      longitude: longitude !== undefined ? longitude : null,
    });
    return res.data;
  } catch (error) {
    logger.warn('Failed to update live location:', error.message || error);
    throw error;
  }
}

/**
 * Send a batch of location points to the backend.
 * Calls POST /api/driver/location/batch
 *
 * @param {Array<Object>} fixes
 */
export async function sendBatchFixes(fixes) {
  if (!Array.isArray(fixes) || fixes.length === 0) return { ok: true, count: 0 };
  const chunks = [];
  for (let i = 0; i < fixes.length; i += MAX_BATCH_SIZE) {
    chunks.push(fixes.slice(i, i + MAX_BATCH_SIZE));
  }

  for (const chunk of chunks) {
    await client.post('/driver/location/batch', { fixes: chunk });
  }

  return { ok: true, count: fixes.length };
}

/**
 * Enqueue a fix into AsyncStorage for offline resilience, then flush if possible.
 */
export async function enqueueLocationFix(fix) {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    queue.push({
      latitude: fix.latitude,
      longitude: fix.longitude,
      accuracyMeters: fix.accuracyMeters ?? null,
      speedMps: fix.speedMps ?? null,
      headingDegrees: fix.headingDegrees ?? null,
      altitude: fix.altitude ?? null,
      recordedAt: fix.recordedAt || new Date().toISOString(),
      batteryLevel: fix.batteryLevel ?? null,
      isMoving: fix.isMoving ?? null,
      source: fix.source || 'FOREGROUND',
      tripId: fix.tripId || null,
    });

    // Cap local storage queue at 1000 items to avoid runaway memory
    if (queue.length > 1000) {
      queue.splice(0, queue.length - 1000);
    }
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    logger.warn('Error enqueuing location fix:', err);
  }
}

/**
 * Flush any queued location fixes to the server.
 */
export async function flushLocationQueue() {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return 0;
    const queue = JSON.parse(raw);
    if (!Array.isArray(queue) || queue.length === 0) return 0;

    await sendBatchFixes(queue);
    await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
    return queue.length;
  } catch (err) {
    logger.warn('Failed to flush offline location queue:', err.message || err);
    return 0;
  }
}

export default {
  updateLiveLocation,
  sendBatchFixes,
  enqueueLocationFix,
  flushLocationQueue,
};
