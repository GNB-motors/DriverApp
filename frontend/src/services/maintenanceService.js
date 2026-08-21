import client from './client';

/**
 * Repairs / maintenance. Backend: /api/maintenance (OWNER/MANAGER/DRIVER).
 */
export async function listMaintenance(params = {}) {
  const res = await client.get('/maintenance', { params });
  return res.data?.data ?? res.data;
}

export async function createMaintenance(payload) {
  const res = await client.post('/maintenance', payload);
  return res.data?.data ?? res.data;
}

export default { listMaintenance, createMaintenance };
