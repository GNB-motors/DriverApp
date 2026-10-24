import client from './client';

/**
 * Branches (operational locations) — for the owner's location filter.
 * Backend: GET /api/branches (Bearer + X-Org-Id via the shared client).
 * A null selection = "All branches" (enterprise scope) — handled by AuthContext.
 */
export async function listBranches(params = {}) {
  const res = await client.get('/branches', { params });
  return res.data?.data ?? res.data;
}

export default { listBranches };
