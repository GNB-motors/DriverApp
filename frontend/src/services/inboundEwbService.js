import client from './client';

export async function listQueue(params = {}) {
  const res = await client.get('/erp/inbound-ewb', { params });
  return res.data?.data ?? res.data;
}

export async function sync() {
  const res = await client.post('/erp/inbound-ewb/sync');
  return res.data?.data ?? res.data;
}

export async function confirm(id, payload = {}) {
  const res = await client.post(`/erp/inbound-ewb/${id}/confirm`, payload);
  return res.data?.data ?? res.data;
}

export async function ignore(id) {
  const res = await client.post(`/erp/inbound-ewb/${id}/ignore`);
  return res.data?.data ?? res.data;
}

export default { listQueue, sync, confirm, ignore };
