import client from './client';

/**
 * ERP advances (owner + manager). Backend: /api/erp/advances.
 */
export async function listAdvances(params = {}) {
  const res = await client.get('/erp/advances', { params });
  return res.data?.data ?? res.data;
}

export async function getAdvance(id) {
  const res = await client.get(`/erp/advances/${id}`);
  return res.data?.data ?? res.data;
}

export async function payAdvance(id, payload) {
  const res = await client.post(`/erp/advances/${id}/pay`, payload);
  return res.data?.data ?? res.data;
}

export default { listAdvances, getAdvance, payAdvance };
