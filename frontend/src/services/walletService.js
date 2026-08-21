import client from './client';

/**
 * Wallet / khata — the driver's ledger and balance summary.
 * Backend: GET /api/khata/drivers/:driverId/{ledger,summary} (Bearer + X-Org-Id).
 */
export async function getDriverLedger(driverId, params = {}) {
  const res = await client.get(`/khata/drivers/${driverId}/ledger`, { params });
  return res.data?.data ?? res.data;
}

export async function getDriverSummary(driverId, params = {}) {
  const res = await client.get(`/khata/drivers/${driverId}/summary`, { params });
  return res.data?.data ?? res.data;
}

export default { getDriverLedger, getDriverSummary };
