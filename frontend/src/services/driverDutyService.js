import client from './client';

/**
 * Driver duty — pairing a driver to a truck, and the hours-of-service strip.
 *
 * Ported from app#19 onto the #18 app line. The old branch kept everything in
 * one `services/api.js` and passed `token` in every call; #18 has a central
 * `client` that attaches auth and tenant headers, so these calls take no token.
 *
 * THE BACKEND IS NOT IN THIS APP. `/driver/trips/*` and `/driver/duty-status`
 * come from be#206 as reworked by task C1 — which is the version that writes a
 * DriverVehicleAssignment on pairing instead of a separate DriverTrip row. Until
 * C1 lands, these calls fail and the screens below say so plainly rather than
 * showing a fake duty state.
 *
 * → [{ dutyState, vehicleId, registrationNumber, continuousDrivingMinutes,
 *      remainingDrivingMinutes, serverTime }]
 */
export async function startDuty({ latitude, longitude, accuracy, recordedAt }) {
  const body = { lat: latitude, lng: longitude };
  if (accuracy != null) body.accuracy = accuracy;
  if (recordedAt) body.recordedAt = recordedAt;
  const res = await client.post('/driver/trips/start', body);
  return res.data?.data ?? res.data;
}

/** Close the open trip and start the driver's rest period. */
export async function endDuty() {
  const res = await client.post('/driver/trips/end', {});
  return res.data?.data ?? res.data;
}

/**
 * Current duty state. Returns null when the backend cannot answer, so a caller
 * can tell "no duty" apart from "we do not know" — the same distinction the
 * toll ledger makes between an unpriced toll and a free one.
 */
export async function fetchDutyStatus() {
  const res = await client.get('/driver/duty-status');
  return res.data?.data ?? res.data ?? null;
}

export default { startDuty, endDuty, fetchDutyStatus };