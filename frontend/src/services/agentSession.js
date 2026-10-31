const orgIdOf = (value) => typeof value === 'object' ? value?._id || value?.orgId : value;
export async function resolveAgentSession(result, preferredOrg, listOrgs, verifySession) {
  if (result.user.role !== 'FIELD_AGENT') return { ...result, activeOrgId: orgIdOf(result.user.orgId) || null };
  const orgs = await listOrgs(result.token);
  const boundOrg = orgIdOf(result.user.orgId);
  const permitted = boundOrg ? orgs.filter((row) => String(row.orgId) === String(boundOrg)) : orgs;
  const selected = permitted.find((row) => String(row.orgId) === String(preferredOrg || boundOrg)) || permitted[0];
  if (!selected) return { ...result, organization: null, activeOrgId: null };
  const id = String(selected.orgId);
  await verifySession(result.token, id);
  return { ...result, organization: { _id: id, companyName: selected.companyName }, activeOrgId: id };
}
