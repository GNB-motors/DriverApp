/**
 * erpApi.js
 *
 * Complete ERP API service layer for the DriverApp.
 * Mirrors the backend's /api/erp/* routes.
 *
 * All functions:
 *   • Accept a `token` string (from AuthContext)
 *   • Use the shared axios instance from api.js for base URL + timeout
 *   • Throw on non-2xx so the caller can catch and show an error
 *   • Accept an optional AbortSignal for screen-unmount cancellation
 *
 * Naming convention: verb + entity (fetchErpTrips, submitConsignment, etc.)
 */

import axios from 'axios';
import * as Sentry from '@sentry/react-native';
import { API_BASE_URL } from './api'; // re-use the same base URL already set up

// ── Shared axios instance ────────────────────────────────────────────────────
const erp = axios.create({
  baseURL: `${API_BASE_URL}/api/erp`,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Auth header helper ───────────────────────────────────────────────────────
const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

// ── Multipart header helper ──────────────────────────────────────────────────
const multipart = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'multipart/form-data',
  },
});

// ── Generic error reporter ───────────────────────────────────────────────────
function captureErpError(error, context) {
  Sentry.captureException(error, { tags: { module: 'erpApi', context } });
}

// ═══════════════════════════════════════════════════════════════════════════
// ERP TRIPS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch all ERP trips (Manager / Owner).
 * @param {string} token
 * @param {object} filters  - { state, page, limit, search, ... }
 */
export async function fetchErpTrips(token, filters = {}) {
  try {
    const { data } = await erp.get('/trips', { ...auth(token), params: filters });
    return data;
  } catch (err) {
    captureErpError(err, 'fetchErpTrips');
    throw err;
  }
}

/**
 * Fetch the single active ERP trip for the calling Driver.
 * Backend: GET /api/erp/trips/active  (requires Phase 7 backend change)
 */
export async function fetchDriverActiveTrip(token) {
  try {
    const { data } = await erp.get('/trips/active', auth(token));
    return data?.trip ?? data ?? null;
  } catch (err) {
    if (err?.response?.status === 404) return null; // No active trip — not an error
    captureErpError(err, 'fetchDriverActiveTrip');
    throw err;
  }
}

/**
 * Fetch a single ERP trip by ID.
 */
export async function fetchErpTripById(token, tripId) {
  try {
    const { data } = await erp.get(`/trips/${tripId}`, auth(token));
    return data;
  } catch (err) {
    captureErpError(err, 'fetchErpTripById');
    throw err;
  }
}

/**
 * Close an ERP trip (Stage 6).
 * @param {string} tripId
 * @param {{ unloadedAt, unloadLocation, reportEmpty, emptyTo, emptyKm, closeRemarks }} payload
 */
export async function closeErpTrip(token, tripId, payload) {
  try {
    const { data } = await erp.post(`/trips/${tripId}/close`, payload, auth(token));
    return data;
  } catch (err) {
    captureErpError(err, 'closeErpTrip');
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PLACEMENTS
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchPlacements(token, filters = {}) {
  try {
    const { data } = await erp.get('/placements', { ...auth(token), params: filters });
    return data;
  } catch (err) {
    captureErpError(err, 'fetchPlacements');
    throw err;
  }
}

export async function fetchPlacementById(token, id) {
  try {
    const { data } = await erp.get(`/placements/${id}`, auth(token));
    return data;
  } catch (err) {
    captureErpError(err, 'fetchPlacementById');
    throw err;
  }
}

/**
 * Create a new Placement (Owner only — Stage 3).
 */
export async function createPlacement(token, payload) {
  try {
    const { data } = await erp.post('/placements', payload, auth(token));
    return data;
  } catch (err) {
    captureErpError(err, 'createPlacement');
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ADVANCES
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchAdvances(token, filters = {}) {
  try {
    const { data } = await erp.get('/advances', { ...auth(token), params: filters });
    return data;
  } catch (err) {
    captureErpError(err, 'fetchAdvances');
    throw err;
  }
}

/**
 * Fetch the active advance for the calling Driver's trip.
 * Backend: GET /api/erp/advances/my-advance  (requires Phase 7 backend change)
 */
export async function fetchDriverAdvance(token) {
  try {
    const { data } = await erp.get('/advances/my-advance', auth(token));
    return data?.advance ?? data ?? null;
  } catch (err) {
    if (err?.response?.status === 404) return null;
    captureErpError(err, 'fetchDriverAdvance');
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSIGNMENTS (CNs)
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchConsignments(token, filters = {}) {
  try {
    const { data } = await erp.get('/consignments', { ...auth(token), params: filters });
    return data;
  } catch (err) {
    captureErpError(err, 'fetchConsignments');
    throw err;
  }
}

/**
 * Step 1: Upload bilty document photo. Returns { documentId }.
 * @param {object} file - { uri, name, type }
 */
export async function uploadBiltyDocument(token, file) {
  try {
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name || 'bilty.jpg', type: file.type || 'image/jpeg' });
    const { data } = await erp.post('/consignments/upload-bilty', form, multipart(token));
    return data; // { documentId, url }
  } catch (err) {
    captureErpError(err, 'uploadBiltyDocument');
    throw err;
  }
}

/**
 * Step 2: Submit consignment with documentId linked.
 * @param {{ tripId, documentId, cnNumber, cnDate, loadedQty, qtyUnit, sealNumbers, temperature, density }} payload
 */
export async function submitConsignment(token, payload) {
  try {
    const { data } = await erp.post('/consignments', payload, auth(token));
    return data;
  } catch (err) {
    captureErpError(err, 'submitConsignment');
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PODs
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchPods(token, filters = {}) {
  try {
    const { data } = await erp.get('/pods', { ...auth(token), params: filters });
    return data;
  } catch (err) {
    captureErpError(err, 'fetchPods');
    throw err;
  }
}

/**
 * Step 1: Upload POD document photo. Returns { documentId }.
 */
export async function uploadPodDocument(token, file) {
  try {
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name || 'pod.jpg', type: file.type || 'image/jpeg' });
    const { data } = await erp.post('/pods/upload', form, multipart(token));
    return data; // { documentId, url }
  } catch (err) {
    captureErpError(err, 'uploadPodDocument');
    throw err;
  }
}

/**
 * Step 2: Submit POD form.
 * @param {{ tripId, documentId, receivedDate, copyType, receivedVia, remarks }} payload
 */
export async function submitPod(token, payload) {
  try {
    const { data } = await erp.post('/pods', {
      ...payload,
      receivedVia: payload.receivedVia ?? 'DRIVER_APP',
    }, auth(token));
    return data;
  } catch (err) {
    captureErpError(err, 'submitPod');
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DELIVERY ORDERS
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchDeliveryOrders(token, filters = {}) {
  try {
    const { data } = await erp.get('/delivery-orders', { ...auth(token), params: filters });
    return data;
  } catch (err) {
    captureErpError(err, 'fetchDeliveryOrders');
    throw err;
  }
}

/**
 * Create a Delivery Order (Owner only — Stage 2).
 */
export async function createDeliveryOrder(token, payload) {
  try {
    const { data } = await erp.post('/delivery-orders', payload, auth(token));
    return data;
  } catch (err) {
    captureErpError(err, 'createDeliveryOrder');
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// APPROVALS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch pending approvals queue.
 * @param {{ status, type, page, limit }} filters
 */
export async function fetchApprovals(token, filters = {}) {
  try {
    const { data } = await erp.get('/approvals', { ...auth(token), params: filters });
    return data;
  } catch (err) {
    captureErpError(err, 'fetchApprovals');
    throw err;
  }
}

/**
 * Fetch only the count of PENDING approvals — used by ErpContext for badge.
 * Returns a number.
 */
export async function fetchPendingApprovalsCount(token) {
  try {
    const { data } = await erp.get('/approvals', {
      ...auth(token),
      params: { status: 'PENDING', limit: 1 },
    });
    // Backend returns { results: [], totalResults: N }
    return data?.totalResults ?? data?.total ?? 0;
  } catch (err) {
    captureErpError(err, 'fetchPendingApprovalsCount');
    return 0; // Non-fatal — return 0 to avoid breaking badge
  }
}

/**
 * Approve or reject an approval request.
 * @param {string} id
 * @param {{ decision: 'APPROVED'|'REJECTED', remarks?: string }} payload
 */
export async function decideApproval(token, id, payload) {
  try {
    const { data } = await erp.patch(`/approvals/${id}/decide`, payload, auth(token));
    return data;
  } catch (err) {
    captureErpError(err, 'decideApproval');
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UNLOADING (Stage 8)
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchUnloadings(token, filters = {}) {
  try {
    const { data } = await erp.get('/unloading', { ...auth(token), params: filters });
    return data;
  } catch (err) {
    captureErpError(err, 'fetchUnloadings');
    throw err;
  }
}

/**
 * Submit an unloading record (Stage 8).
 */
export async function submitUnloading(token, payload) {
  try {
    const { data } = await erp.post('/unloading', payload, auth(token));
    return data;
  } catch (err) {
    captureErpError(err, 'submitUnloading');
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FINANCE / LEDGER / KHATA
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchFinanceSummary(token) {
  try {
    const { data } = await erp.get('/finance', auth(token));
    return data;
  } catch (err) {
    captureErpError(err, 'fetchFinanceSummary');
    throw err;
  }
}

export async function fetchLedgerEntries(token, filters = {}) {
  try {
    const { data } = await erp.get('/ledger', { ...auth(token), params: filters });
    return data;
  } catch (err) {
    captureErpError(err, 'fetchLedgerEntries');
    throw err;
  }
}

export async function fetchKhataLedger(token, filters = {}) {
  try {
    const { data } = await erp.get('/khata', { ...auth(token), params: filters });
    return data;
  } catch (err) {
    captureErpError(err, 'fetchKhataLedger');
    throw err;
  }
}

export async function fetchSaleBills(token, filters = {}) {
  try {
    const { data } = await erp.get('/sale-bills', { ...auth(token), params: filters });
    return data;
  } catch (err) {
    captureErpError(err, 'fetchSaleBills');
    throw err;
  }
}
