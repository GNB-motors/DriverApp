import client, { postForm } from './client';

/**
 * Driver bill loop — the bill→confirm→wallet flow.
 * Backend: /api/app/v1/bills (Bearer + X-Org-Id via the shared client).
 *
 *   - Drivers submit a bill (multipart photo) and list their own bills.
 *   - Owners/managers list the pending queue and confirm / reject.
 * A confirmed bill counts toward the driver's wallet (khata); pending/rejected
 * bills do not.
 */

/** List bills. Drivers get their own; reviewers pass `{ status: 'PENDING' }`. */
export async function listBills(params = {}) {
  const res = await client.get('/app/v1/bills', { params });
  return res.data?.data ?? res.data;
}

/** One bill by id (with driver, receiptUrl, status, rejectionReason). */
export async function getBill(id) {
  const res = await client.get(`/app/v1/bills/${id}`);
  return res.data?.data ?? res.data;
}

/**
 * Submit a bill from the app. `photo` is an RN file part { uri, name, type }
 * (from utils/pickImage). Returns the created PENDING bill.
 */
export async function submitBill({ amount, category, description, expenseDate, tripId, vehicleId, photo } = {}) {
  const fd = new FormData();
  fd.append('amount', String(amount));
  if (category) fd.append('category', category);
  if (description) fd.append('description', description);
  if (expenseDate) fd.append('expenseDate', expenseDate);
  if (tripId) fd.append('tripId', tripId);
  if (vehicleId) fd.append('vehicleId', vehicleId);
  if (photo) fd.append('receipt', photo);
  return postForm('/app/v1/bills', fd);
}

/** Owner/manager confirms a pending bill → credits the driver's wallet. */
export async function confirmBill(id) {
  const res = await client.post(`/app/v1/bills/${id}/confirm`);
  return res.data?.data ?? res.data;
}

/** Owner/manager rejects a pending bill with a reason the driver sees. */
export async function rejectBill(id, reason) {
  const res = await client.post(`/app/v1/bills/${id}/reject`, { reason });
  return res.data?.data ?? res.data;
}

export default { listBills, getBill, submitBill, confirmBill, rejectBill };
