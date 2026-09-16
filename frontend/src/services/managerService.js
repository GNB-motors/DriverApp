import client from './client';

/**
 * Manager / Ops read surfaces: ERP trips, delivery orders, placements,
 * unloading. (Approvals + advances reuse approvalService / advanceService.)
 */
export async function listErpTrips(params = {}) {
  const res = await client.get('/erp/trips', { params });
  return res.data?.data ?? res.data;
}

export async function getErpTrip(id) {
  const res = await client.get(`/erp/trips/${id}`);
  return res.data?.data ?? res.data;
}

export async function listDeliveryOrders(params = {}) {
  const res = await client.get('/erp/delivery-orders', { params });
  return res.data?.data ?? res.data;
}

export async function getPlacementsBoard(params = {}) {
  const res = await client.get('/erp/placements/board', { params });
  return res.data?.data ?? res.data;
}

export async function listUnloading(params = {}) {
  const res = await client.get('/erp/unloading', { params });
  return res.data?.data ?? res.data;
}

export async function closeErpTrip(id, payload = {}) {
  const res = await client.post(`/erp/trips/${id}/close`, payload);
  return res.data?.data ?? res.data;
}

export default { listErpTrips, getErpTrip, listDeliveryOrders, getPlacementsBoard, listUnloading, closeErpTrip };
