import client from './client';

/**
 * Vehicles. Backend: /api/vehicles (DRIVER/FIELD_AGENT may read list + docs).
 */
export async function listVehicles(params = {}) {
  const res = await client.get('/vehicles', { params });
  return res.data?.data ?? res.data;
}

export async function getVehicleDocuments(vehicleId) {
  const res = await client.get(`/vehicles/${vehicleId}/documents`);
  return res.data?.data ?? res.data;
}

export default { listVehicles, getVehicleDocuments };
