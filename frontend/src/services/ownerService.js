import client from './client';

/**
 * Owner read surfaces: ERP dashboard, sale bills, company ledger, khata driver
 * list, and fleet. Grouped here since each screen uses one or two calls.
 */
export async function getErpDashboard(params = {}) {
  const res = await client.get('/erp/dashboard/summary', { params });
  return res.data?.data ?? res.data;
}

export async function listKhataDrivers(params = {}) {
  const res = await client.get('/khata/drivers', { params });
  return res.data?.data ?? res.data;
}

export async function listSaleBills(params = {}) {
  const res = await client.get('/erp/sale-bills', { params });
  return res.data?.data ?? res.data;
}

export async function getLedgerEntries(params = {}) {
  const res = await client.get('/erp/ledger/entries', { params });
  return res.data?.data ?? res.data;
}

export default { getErpDashboard, listKhataDrivers, listSaleBills, getLedgerEntries };
