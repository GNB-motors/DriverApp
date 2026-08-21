import client from './client';

/**
 * Trips. Backend: /api/trips (list/detail; DRIVER can start/end its trip).
 */
export async function listTrips(params = {}) {
  const res = await client.get('/trips', { params });
  return res.data?.data ?? res.data;
}

export async function getTrip(id) {
  const res = await client.get(`/trips/${id}`);
  return res.data?.data ?? res.data;
}

export async function startTrip(id) {
  const res = await client.post(`/trips/${id}/start`);
  return res.data?.data ?? res.data;
}

export async function endTrip(id) {
  const res = await client.post(`/trips/${id}/end`);
  return res.data?.data ?? res.data;
}

export default { listTrips, getTrip, startTrip, endTrip };
