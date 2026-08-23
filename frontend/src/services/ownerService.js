import client from './client';

/**
 * Owner read surfaces: ERP dashboard, finance hub, sale bills, company ledger,
 * khata driver list. Grouped here since each screen uses one or two calls.
 *
 * Response shapes are the backend's, unchanged — screens map them. See
 * screens/owner/* for the field mapping against each payload.
 */

/** Operational + financial counters. → { pendingCounts, financials } */
export async function getErpDashboard(params = {}) {
  const res = await client.get('/erp/dashboard/summary', { params });
  return res.data?.data ?? res.data;
}

/**
 * Finance hub — the money picture behind the Business overview screen.
 * → { receivables, payables, net, unapplied, inFlight, cashMovement, period }
 */
export async function getFinanceSummary(params = {}) {
  const res = await client.get('/erp/finance-hub/summary', { params });
  return res.data?.data ?? res.data;
}

/**
 * Receivable / payable ageing buckets (CURRENT, 1-30, 31-60, 61-90, 90+).
 * → { receivable: { buckets, total, count }, payable: { ... } }
 */
export async function getFinanceAgeing(params = {}) {
  const res = await client.get('/erp/finance-hub/ageing', { params });
  return res.data?.data ?? res.data;
}

/** → { results: [{ _id, firstName, lastName, mobileNumber, totalAmount, entryCount }] } */
export async function listKhataDrivers(params = {}) {
  const res = await client.get('/khata/drivers', { params });
  return res.data?.data ?? res.data;
}

/** → [{ billNumber, partyId: { name }, netAmount, outstandingAmount, status, dueDate }] */
export async function listSaleBills(params = {}) {
  const res = await client.get('/erp/sale-bills', { params });
  return res.data?.data ?? res.data;
}

/** Outstanding sale bills (what customers owe). → [{ billNumber, partyName, outstandingAmount, dueDate, overdueDays, ageingBucket }] */
export async function listOutstanding(params = {}) {
  const res = await client.get('/erp/sale-bills/outstanding', { params });
  return res.data?.data ?? res.data;
}

/** → { entries: [{ narration, debit, credit, balanceAfter, ... }], totals: { debit, credit } } */
export async function getLedgerEntries(params = {}) {
  const res = await client.get('/erp/ledger/entries', { params });
  return res.data?.data ?? res.data;
}

export default {
  getErpDashboard,
  getFinanceSummary,
  getFinanceAgeing,
  listKhataDrivers,
  listSaleBills,
  listOutstanding,
  getLedgerEntries,
};
