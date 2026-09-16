import client from './client';

/**
 * ERP approvals (owner + manager). Backend: /api/erp/approvals.
 */
export async function listApprovals(params = {}) {
  const res = await client.get('/erp/approvals', { params });
  return res.data?.data ?? res.data;
}

export async function getApprovalsSummary(params = {}) {
  const res = await client.get('/erp/approvals/summary', { params });
  return res.data?.data ?? res.data;
}

export async function getApproval(id) {
  const res = await client.get(`/erp/approvals/${id}`);
  return res.data?.data ?? res.data;
}

export async function decideApproval(id, status, remarks) {
  const res = await client.post(`/erp/approvals/${id}/decide`, { status, remarks });
  return res.data?.data ?? res.data;
}

export default { listApprovals, getApprovalsSummary, getApproval, decideApproval };
