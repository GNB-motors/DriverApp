import client from './client';

/**
 * Driver trips. Backend: /api/app/v1/trips.
 *
 * Trips live in the ERP (`erptrips`). The ops route /api/erp/trips is closed to
 * drivers (its VIEWERS list excludes DRIVER), and the older /api/trips
 * collection is a separate legacy system that carries no data, so the app reads
 * the driver-scoped app endpoint instead. A DRIVER caller is pinned server-side
 * to their own trips.
 *
 * → [{ _id, tripNumber, state, fromLocation, toLocation, material, vehicleNumber,
 *      plannedQty, loadedQty, totalKm, tripDate, advanceGate, cnGate,
 *      partyId: { name, code }, doId: { doNumber }, vehicleId: { registrationNumber } }]
 */
export async function listTrips(params = {}) {
  const res = await client.get('/app/v1/trips', { params });
  return res.data?.data ?? res.data;
}

export async function getTrip(id) {
  const res = await client.get(`/app/v1/trips/${id}`);
  return res.data?.data ?? res.data;
}

export default { listTrips, getTrip };
