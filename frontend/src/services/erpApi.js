/**
 * erpApi.js
 *
 * ERP/CRM API surface for the app. Every function here was verified against the
 * backend routers in `app/modules/erp*` — path, HTTP verb, and response shape.
 *
 * Two rules this file exists to enforce:
 *
 *  1. **One axios instance.** Paths are relative to `apiClient`'s base URL, which
 *     already ends in `/api`. So a backend route mounted at `/api/erp/trips` is
 *     requested here as `/erp/trips`. This file used to build its own client and
 *     re-append `/api`, sending every request to `/api/api/erp/...`.
 *  2. **Unwrap once, here.** The backend answers `{ success, data, meta }` via
 *     `sendSuccess`. Callers get `data` (and `meta` where pagination matters), so
 *     no screen has to guess between `res.data`, `res.results` and `res`.
 */

import { apiClient } from './api';

// ── Envelope helpers ────────────────────────────────────────────────────────

/** `{ success, data, meta }` → `data`. Tolerates a bare payload. */
const unwrap = (res) => {
  const body = res?.data;
  if (body && typeof body === 'object' && 'data' in body) return body.data;
  return body;
};

/** For list endpoints: always `{ results, meta }`, never a bare array. */
const unwrapList = (res) => {
  const body = res?.data ?? {};
  const payload = 'data' in body ? body.data : body;
  const results = Array.isArray(payload)
    ? payload
    // Some older endpoints nest again as { data: { results, ... } }.
    : payload?.results ?? payload?.data ?? [];
  return {
    results: Array.isArray(results) ? results : [],
    meta: body.meta ?? payload?.meta ?? null,
  };
};

const withToken = (token, extra = {}) => ({ token, ...extra });

/** Strip empty filters — the backend's Joi runs without stripUnknown, and an
 *  empty string is a validation error rather than "unset". */
const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '',
    ),
  );

const get = (path, token, params) =>
  apiClient.get(path, withToken(token, { params: cleanParams(params) }));

const post = (path, token, body) => apiClient.post(path, body, withToken(token));
const patch = (path, token, body) => apiClient.patch(path, body, withToken(token));

const upload = (path, token, file, fields = {}) => {
  const form = new FormData();
  form.append('file', {
    uri: file.uri,
    name: file.name || 'upload.jpg',
    type: file.type || 'image/jpeg',
  });
  Object.entries(fields).forEach(([k, v]) => form.append(k, String(v)));
  return apiClient.post(path, form, withToken(token, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60_000,
  }));
};

// ═══════════════════════════════════════════════════════════════════════════
// DRIVER — self-scoped reads
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The calling driver's current trip, or null.
 *
 * GET /api/erp/trips/my-active — returns 200 with `null` when the driver has no
 * active trip, so "no trip today" is not an error path.
 */
export async function fetchMyActiveTrip(token) {
  const res = await get('/erp/trips/my-active', token);
  const trip = unwrap(res);
  // Mock/empty responses can come back as [] — normalise to null.
  return trip && !Array.isArray(trip) ? trip : null;
}

/** GET /api/erp/trips/my — the driver's own trip history. */
export async function fetchMyTrips(token, filters = {}) {
  return unwrapList(await get('/erp/trips/my', token, filters));
}

/** GET /api/erp/advances/my — the driver's own advances (payout view only). */
export async function fetchMyAdvances(token, filters = {}) {
  return unwrapList(await get('/erp/advances/my', token, filters));
}

// ═══════════════════════════════════════════════════════════════════════════
// TRIPS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/erp/trips — Owner/Manager/Ops/Accounts.
 * `state` must be a real ERP_TRIP_STATES value; anything else is a hard 400.
 */
export async function fetchErpTrips(token, filters = {}) {
  return unwrapList(await get('/erp/trips', token, filters));
}

/**
 * GET /api/erp/trips/:tripId — the 360° view.
 * Returns the trip plus `advances[]`, `consignment`, `pod`, `unloading`,
 * `saleBill`, `purchaseBill` in one call.
 */
export async function fetchErpTripById(token, tripId) {
  return unwrap(await get(`/erp/trips/${tripId}`, token));
}

/** GET /api/erp/trips/pending-close — DISPATCHED trips with CN ageing. */
export async function fetchTripsPendingClose(token, filters = {}) {
  return unwrapList(await get('/erp/trips/pending-close', token, filters));
}

/**
 * POST /api/erp/trips/:tripId/close
 * Requires the trip to be DISPATCHED and `unloadedAt` on/after the trip date.
 * @param {{ unloadedAt: string, unloadLocation?: string, closeRemarks?: string,
 *           reportEmpty?: { toLocation: string, distanceKm: number } }} payload
 */
export async function closeErpTrip(token, tripId, payload) {
  return unwrap(await post(`/erp/trips/${tripId}/close`, token, payload));
}

// ═══════════════════════════════════════════════════════════════════════════
// PLACEMENTS
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchPlacements(token, filters = {}) {
  return unwrapList(await get('/erp/placements', token, filters));
}

export async function fetchPlacementBoard(token, filters = {}) {
  return unwrapList(await get('/erp/placements/board', token, filters));
}

export async function fetchPlacementById(token, id) {
  return unwrap(await get(`/erp/placements/${id}`, token));
}

/**
 * POST /api/erp/placements/check-restrictions
 * Previous-cargo / material compatibility check. Run this before creating so the
 * user sees the warning before committing, the same way the web board does.
 */
export async function checkPlacementRestrictions(token, payload) {
  return unwrap(await post('/erp/placements/check-restrictions', token, payload));
}

/** GET /api/erp/placements/pending-empty-legs */
export async function fetchPendingEmptyLegs(token, filters = {}) {
  return unwrapList(await get('/erp/placements/pending-empty-legs', token, filters));
}

/**
 * Creation is split by vehicle source — there is no generic POST /placements.
 * @param {'OWN'|'HIRE'} vehicleType
 */
export async function createPlacement(token, vehicleType, payload) {
  const path = vehicleType === 'HIRE' ? '/erp/placements/hire' : '/erp/placements/own';
  return unwrap(await post(path, token, payload));
}

// ═══════════════════════════════════════════════════════════════════════════
// ADVANCES
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchAdvances(token, filters = {}) {
  return unwrapList(await get('/erp/advances', token, filters));
}

export async function fetchAdvanceById(token, advanceId) {
  return unwrap(await get(`/erp/advances/${advanceId}`, token));
}

/** POST /api/erp/advances/preview — budget breakdown before requesting. */
export async function previewAdvance(token, payload) {
  return unwrap(await post('/erp/advances/preview', token, payload));
}

export async function requestAdvance(token, payload) {
  return unwrap(await post('/erp/advances', token, payload));
}

/** POST /api/erp/advances/:id/pay — Owner/Manager/Accounts only. */
export async function payAdvance(token, advanceId, payload) {
  return unwrap(await post(`/erp/advances/${advanceId}/pay`, token, payload));
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSIGNMENTS (CN / bilty)
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchConsignments(token, filters = {}) {
  return unwrapList(await get('/erp/consignments', token, filters));
}

/** GET /api/erp/consignments/pending — trips awaiting a CN. */
export async function fetchPendingConsignments(token, filters = {}) {
  return unwrapList(await get('/erp/consignments/pending', token, filters));
}

/**
 * Step 1 — POST /api/erp/consignments/upload-bilty (multipart).
 * Drivers are allowed here. Returns the created Document.
 */
export async function uploadBiltyDocument(token, file, { tripId } = {}) {
  return unwrap(await upload('/erp/consignments/upload-bilty', token, file, cleanParams({ tripId })));
}

/**
 * Step 2 — POST /api/erp/consignments.
 * `biltyDocumentId` is required by the validator, so always upload first.
 * @param {{ tripId, cnNumber, cnDate, loadingDate, loadedQty, loadedQtyUnit,
 *           biltyDocumentId, temperature?, density?, sealNumbers? }} payload
 */
export async function saveConsignment(token, payload) {
  return unwrap(await post('/erp/consignments', token, payload));
}

// ═══════════════════════════════════════════════════════════════════════════
// PODs
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchPods(token, filters = {}) {
  return unwrapList(await get('/erp/pods', token, filters));
}

/** GET /api/erp/pods/pending — closed trips with no POD yet. */
export async function fetchPendingPods(token, filters = {}) {
  return unwrapList(await get('/erp/pods/pending', token, filters));
}

/** Step 1 — POST /api/erp/pods/upload (multipart). Drivers allowed. */
export async function uploadPodDocument(token, file, { tripId } = {}) {
  return unwrap(await upload('/erp/pods/upload', token, file, cleanParams({ tripId })));
}

/**
 * Step 2 — POST /api/erp/pods.
 * @param {{ tripId, receivedDate, copyType, receivedVia?, documentIds?,
 *           courierName?, courierDocket?, remarks? }} payload
 */
export async function recordPod(token, payload) {
  return unwrap(await post('/erp/pods', token, {
    receivedVia: 'DRIVER_APP',
    ...payload,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// DELIVERY ORDERS
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchDeliveryOrders(token, filters = {}) {
  return unwrapList(await get('/erp/delivery-orders', token, filters));
}

export async function fetchDeliveryOrderById(token, id) {
  return unwrap(await get(`/erp/delivery-orders/${id}`, token));
}

export async function createDeliveryOrder(token, payload) {
  return unwrap(await post('/erp/delivery-orders', token, payload));
}

// ═══════════════════════════════════════════════════════════════════════════
// UNLOADING
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchUnloadings(token, filters = {}) {
  return unwrapList(await get('/erp/unloading', token, filters));
}

/**
 * POST /api/erp/unloading/calculate — shortage / detention / net receivable
 * preview. The app never computes these itself.
 */
export async function calculateUnloading(token, payload) {
  return unwrap(await post('/erp/unloading/calculate', token, payload));
}

export async function saveUnloading(token, payload) {
  return unwrap(await post('/erp/unloading', token, payload));
}

// ═══════════════════════════════════════════════════════════════════════════
// APPROVALS
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchApprovals(token, filters = { status: 'PENDING' }) {
  return unwrapList(await get('/erp/approvals', token, filters));
}

/** GET /api/erp/approvals/summary → `{ pendingCount }`. */
export async function fetchApprovalsSummary(token) {
  const data = unwrap(await get('/erp/approvals/summary', token));
  return data?.pendingCount ?? 0;
}

/**
 * POST /api/erp/approvals/:id/decide — note POST, not PATCH.
 * Only OWNER / APPROVER / SUPER_ADMIN may decide; MANAGER gets 403.
 * `remarks` is required (min 3 chars) when rejecting.
 * @param {{ status: 'APPROVED'|'REJECTED', remarks?: string }} payload
 */
export async function decideApproval(token, approvalId, payload) {
  return unwrap(await post(`/erp/approvals/${approvalId}/decide`, token, payload));
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD / FINANCE / BILLING / LEDGER
// ═══════════════════════════════════════════════════════════════════════════

/** GET /api/erp/dashboard/summary — powers both Manager and Owner homes. */
export async function fetchErpDashboardSummary(token) {
  return unwrap(await get('/erp/dashboard/summary', token));
}

export async function fetchFinanceHubSummary(token, filters = {}) {
  return unwrap(await get('/erp/finance-hub/summary', token, filters));
}

export async function fetchFinanceAgeing(token, filters = {}) {
  return unwrapList(await get('/erp/finance-hub/ageing', token, filters));
}

export async function fetchFinanceBalances(token, filters = {}) {
  return unwrapList(await get('/erp/finance-hub/balances', token, filters));
}

export async function fetchSaleBills(token, filters = {}) {
  return unwrapList(await get('/erp/sale-bills', token, filters));
}

export async function fetchSaleBillById(token, billId) {
  return unwrap(await get(`/erp/sale-bills/${billId}`, token));
}

export async function fetchLedgerEntries(token, filters = {}) {
  return unwrapList(await get('/erp/ledger/entries', token, filters));
}

export async function fetchLedgerStatement(token, filters = {}) {
  return unwrapList(await get('/erp/ledger/statement', token, filters));
}

// ═══════════════════════════════════════════════════════════════════════════
// KHATA / EXPENSES  (mounted at /api/khata and /api/expenses — NOT under /erp)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/khata/drivers/:driverId/ledger
 * A driver may only pass their own id — the backend 403s otherwise.
 */
export async function fetchDriverKhataLedger(token, driverId, filters = {}) {
  return unwrap(await get(`/khata/drivers/${driverId}/ledger`, token, filters));
}

export async function fetchDriverKhataSummary(token, driverId, filters = {}) {
  return unwrap(await get(`/khata/drivers/${driverId}/summary`, token, filters));
}

/** GET /api/expenses — self-scoped server-side for drivers. */
export async function fetchExpenses(token, filters = {}) {
  return unwrapList(await get('/expenses', token, filters));
}

export async function fetchExpenseSummary(token, filters = {}) {
  return unwrap(await get('/expenses/summary', token, filters));
}

/**
 * POST /api/expenses — a driver's `driverId` is forced from their session
 * server-side, so it never needs to be sent from the app.
 * @param {{ title, amount, category, expenseDate, vehicleId?, tripId?, notes? }} payload
 */
export async function createExpense(token, payload) {
  return unwrap(await apiClient.post('/expenses', payload, withToken(token)));
}

// ═══════════════════════════════════════════════════════════════════════════
// OWNER ALERTS  (/api/owner-alerts — Owner + Manager only)
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchOwnerAlerts(token, filters = {}) {
  return unwrapList(await get('/owner-alerts', token, filters));
}

export async function ackOwnerAlert(token, alertId) {
  return unwrap(await apiClient.put(`/owner-alerts/${alertId}/ack`, {}, withToken(token)));
}

// ═══════════════════════════════════════════════════════════════════════════
// CRM — PARTIES & CALL PLANNING
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchParties(token, filters = {}) {
  return unwrapList(await get('/erp/masters/parties', token, filters));
}

export async function fetchPartyById(token, partyId) {
  return unwrap(await get(`/erp/masters/parties/${partyId}`, token));
}

export async function fetchCallTasks(token, filters = {}) {
  return unwrapList(await get('/erp/calls/tasks', token, filters));
}

/** POST /api/erp/calls/tasks/:taskId/outcome — KAM/Manager/Owner. */
export async function logCallOutcome(token, taskId, payload) {
  return unwrap(await post(`/erp/calls/tasks/${taskId}/outcome`, token, payload));
}
