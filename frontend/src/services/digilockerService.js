import client from './client';

/**
 * DigiLocker verification — driver licence and RC, verified by DigiLocker.
 *
 * Ported from app#20 onto the #18 app line: same flow, #18 conventions (central
 * `client`, one service per feature, no token argument per call).
 *
 * Behind the backend's DIGILOCKER_ENABLED flag, which is OFF by default. Every
 * function here returns the backend's stable envelope, or throws the backend's
 * error — a feature flag being off must surface as "not enabled", never as a
 * silent failure that looks like a verified document.
 *
 * The flow:
 *   1. startDigiLockerVerification() → { authorizationUrl, state }
 *   2. the app stores `state`, opens the URL in the system browser
 *   3. DigiLocker bounces back to digilockerapp://callback?code=…&state=…
 *   4. completeDigiLockerVerification() hands that code back.
 * ONLY step 4 sets verifiedAt — starting a flow verifies nothing.
 */
export async function startDigiLockerVerification(docTypes = ['DL', 'RC']) {
  const res = await client.post('/digilocker/start', { docTypes });
  return res.data?.data ?? res.data;
}

export async function completeDigiLockerVerification({ code, state, sandboxFixture }) {
  const body = { code, state };
  if (sandboxFixture) body.sandboxFixture = sandboxFixture;
  const res = await client.post('/digilocker/callback', body);
  return res.data?.data ?? res.data;
}

/** Server-side status: is DigiLocker enabled, and what is already verified. */
export async function fetchDigiLockerStatus() {
  const res = await client.get('/digilocker/status');
  return res.data?.data ?? res.data ?? null;
}

/**
 * Poll a flow that was started earlier — used when the app comes back to the
 * foreground after the browser bounced out, so the driver sees the result
 * instead of a permanently spinning card.
 */
export async function fetchDigiLockerState(state) {
  const res = await client.get(`/digilocker/state/${encodeURIComponent(state)}`);
  return res.data?.data ?? res.data ?? null;
}

export default {
  startDigiLockerVerification,
  completeDigiLockerVerification,
  fetchDigiLockerStatus,
  fetchDigiLockerState,
};