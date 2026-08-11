/**
 * mockFixtures.js
 *
 * Response fixtures for the local mock accounts (+919999999990–3 / OTP 123456).
 *
 * The mock adapter used to return `{ data: [] }` for every request, which meant
 * a mock session showed nothing but empty states — the role screens could not be
 * reviewed at all. These fixtures return realistically shaped payloads for the
 * paths the role screens actually call, using the SAME field names the backend
 * returns, so a screen that renders correctly here renders correctly against a
 * real server.
 *
 * Keep the shapes in sync with the backend. If a screen works against a fixture
 * but not against staging, the fixture is wrong — fix it here rather than
 * bending the screen.
 */

const DAY = 24 * 60 * 60 * 1000;
// Fixed epoch so fixtures are stable across reloads and don't depend on "now".
const BASE = new Date('2026-08-11T06:30:00.000Z').getTime();
const iso = (offsetDays) => new Date(BASE + offsetDays * DAY).toISOString();

const PARTY_RIL = { _id: 'p_ril', name: 'Reliance Industries', code: 'RIL' };
const PARTY_TATA = { _id: 'p_tata', name: 'Tata Steel', code: 'TATA' };

const TRIP_ACTIVE = {
  _id: 't_1001',
  tripNumber: 'TRP/24-25/1001',
  state: 'DISPATCHED',
  advanceGate: 'PAID',
  cnGate: 'UPDATED',
  tripDate: iso(-2),
  fromLocation: 'Mumbai',
  toLocation: 'Pune',
  totalKm: 150,
  material: 'DIESEL',
  vehicleNumber: 'MH-12-AB-1234',
  vehicleType: 'OWN',
  plannedQty: 20,
  loadedQty: 19.8,
  partyId: PARTY_RIL,
  doId: { _id: 'do_1', doNumber: 'DO/24-25/0042', material: 'DIESEL' },
  consignment: {
    _id: 'cn_1',
    cnNumber: 'CN/24-25/0311',
    cnDate: iso(-2),
    loadedQty: 19.8,
    loadedQtyUnit: 'KL',
    status: 'SAVED',
  },
  pod: null,
  advance: {
    _id: 'adv_1',
    advanceNumber: 'ADV/24-25/0208',
    netPayable: 18500,
    status: 'PAID',
    paymentMode: 'UPI',
    paidAt: iso(-2),
  },
};

const TRIPS = [
  TRIP_ACTIVE,
  {
    _id: 't_1000',
    tripNumber: 'TRP/24-25/1000',
    state: 'TRIP_CLOSED',
    advanceGate: 'PAID',
    cnGate: 'UPDATED',
    tripDate: iso(-6),
    fromLocation: 'Pune',
    toLocation: 'Nashik',
    material: 'DIESEL',
    vehicleNumber: 'MH-12-AB-1234',
    vehicleType: 'OWN',
    plannedQty: 20,
    loadedQty: 20,
    unloadedAt: iso(-4),
    partyId: PARTY_TATA,
  },
  {
    _id: 't_0999',
    tripNumber: 'TRP/24-25/0999',
    state: 'BILLED',
    advanceGate: 'PAID',
    cnGate: 'UPDATED',
    tripDate: iso(-14),
    fromLocation: 'Nashik',
    toLocation: 'Mumbai',
    material: 'PETROL',
    vehicleNumber: 'MH-14-CD-5678',
    vehicleType: 'OWN',
    plannedQty: 25,
    loadedQty: 24.6,
    unloadedAt: iso(-12),
    partyId: PARTY_RIL,
  },
  {
    _id: 't_0998',
    tripNumber: 'TRP/24-25/0998',
    state: 'PLACED',
    advanceGate: 'PENDING',
    cnGate: 'NONE',
    tripDate: iso(0),
    fromLocation: 'Mumbai',
    toLocation: 'Surat',
    material: 'DIESEL',
    vehicleNumber: 'MH-14-CD-5678',
    vehicleType: 'OWN',
    plannedQty: 25,
    partyId: PARTY_TATA,
  },
];

const ADVANCES = [
  {
    _id: 'adv_1',
    advanceNumber: 'ADV/24-25/0208',
    netPayable: 18500,
    totalDeductions: 1500,
    status: 'PAID',
    paymentMode: 'UPI',
    paidAt: iso(-2),
    createdAt: iso(-2),
    tripId: {
      _id: 't_1001',
      tripNumber: 'TRP/24-25/1001',
      fromLocation: 'Mumbai',
      toLocation: 'Pune',
      state: 'DISPATCHED',
      tripDate: iso(-2),
    },
  },
  {
    _id: 'adv_2',
    advanceNumber: 'ADV/24-25/0201',
    netPayable: 22000,
    totalDeductions: 0,
    status: 'PAID',
    paymentMode: 'CASH',
    paidAt: iso(-6),
    createdAt: iso(-6),
    tripId: {
      _id: 't_1000',
      tripNumber: 'TRP/24-25/1000',
      fromLocation: 'Pune',
      toLocation: 'Nashik',
      state: 'TRIP_CLOSED',
      tripDate: iso(-6),
    },
  },
  {
    _id: 'adv_3',
    advanceNumber: 'ADV/24-25/0215',
    netPayable: 26400,
    totalDeductions: 3600,
    status: 'PENDING_APPROVAL',
    paymentMode: null,
    paidAt: null,
    createdAt: iso(0),
    tripId: {
      _id: 't_0998',
      tripNumber: 'TRP/24-25/0998',
      fromLocation: 'Mumbai',
      toLocation: 'Surat',
      state: 'PLACED',
      tripDate: iso(0),
    },
  },
];

const APPROVALS = [
  {
    _id: 'ap_1',
    type: 'ADVANCE_OVER_BUDGET',
    entityType: 'AdvancePayment',
    entityId: 'adv_3',
    entityLabel: 'ADV/24-25/0215',
    status: 'PENDING',
    reason: { requested: 30000, budget: 26400, excess: 3600 },
    requestedBy: { firstName: 'Ramesh', lastName: 'Patil' },
    createdAt: iso(0),
  },
  {
    _id: 'ap_2',
    type: 'SHORTAGE_OVER_LIMIT',
    entityType: 'Unloading',
    entityId: 'unl_9',
    entityLabel: 'TRP/24-25/0999',
    status: 'PENDING',
    reason: { shortageQty: 0.4, shortageValue: 8200, limit: 5000 },
    requestedBy: { firstName: 'Sunita', lastName: 'Rao' },
    createdAt: iso(-1),
  },
];

const DASHBOARD_SUMMARY = {
  pendingDosCount: 15,
  placementsTodayCount: 6,
  tripsByState: {
    PLACED: 8,
    DISPATCHED: 23,
    TRIP_CLOSED: 11,
    POD_RECEIVED: 5,
    UNLOADED: 4,
    BILLED: 62,
  },
  pendingCnsCount: 8,
  pendingTripCloseCount: 23,
  pendingPodCount: 11,
  pendingUnloadingCount: 5,
  pendingBillSubmissionCount: 4,
  pendingApprovalsCount: 2,
  receivables: { total: 4218000, overdue: 962000 },
  payables: { total: 1830500 },
  unadjustedReceipts: { total: 145000 },
};

const FINANCE_SUMMARY = {
  receivableTotal: 4218000,
  payableTotal: 1830500,
  netOutstanding: 2387500,
  unbilledTrips: 18,
  revenueMtd: 2450000,
  revenuePrevMtd: 2187000,
};

const AGEING = [
  { bucket: '0-30', label: '0–30 days', amount: 1840000, count: 22 },
  { bucket: '31-60', label: '31–60 days', amount: 1416000, count: 14 },
  { bucket: '61-90', label: '61–90 days', amount: 610000, count: 6 },
  { bucket: '90+', label: '90+ days', amount: 352000, count: 4 },
];

const SALE_BILLS = [
  {
    _id: 'sb_1',
    billNumber: 'SB/24-25/0188',
    billDate: iso(-3),
    status: 'ISSUED',
    netAmount: 495000,
    outstandingAmount: 495000,
    partyId: PARTY_RIL,
  },
  {
    _id: 'sb_2',
    billNumber: 'SB/24-25/0187',
    billDate: iso(-9),
    status: 'PARTIALLY_PAID',
    netAmount: 612500,
    outstandingAmount: 212500,
    partyId: PARTY_TATA,
  },
  {
    _id: 'sb_3',
    billNumber: 'SB/24-25/0186',
    billDate: iso(-21),
    status: 'PAID',
    netAmount: 388000,
    outstandingAmount: 0,
    partyId: PARTY_RIL,
  },
];

const LEDGER_ENTRIES = [
  { _id: 'le_1', voucherNumber: 'RCPT/24-25/0091', entryDate: iso(-1), narration: 'Receipt — Reliance Industries', debit: 0, credit: 400000, balance: 2387500 },
  { _id: 'le_2', voucherNumber: 'SB/24-25/0188', entryDate: iso(-3), narration: 'Sale bill — Reliance Industries', debit: 495000, credit: 0, balance: 2787500 },
  { _id: 'le_3', voucherNumber: 'PMT/24-25/0044', entryDate: iso(-5), narration: 'Vendor payment — Balaji Transport', debit: 0, credit: 180000, balance: 2292500 },
];

const PLACEMENTS = [
  { _id: 'pl_1', placementNumber: 'PL/24-25/0311', placementDate: iso(0), status: 'PLACED', vehicleType: 'OWN', vehicleNumber: 'MH-14-CD-5678', fromLocation: 'Mumbai', toLocation: 'Surat', material: 'DIESEL', doId: { doNumber: 'DO/24-25/0044' } },
  { _id: 'pl_2', placementNumber: 'PL/24-25/0310', placementDate: iso(-2), status: 'COMPLETED', vehicleType: 'OWN', vehicleNumber: 'MH-12-AB-1234', fromLocation: 'Mumbai', toLocation: 'Pune', material: 'DIESEL', doId: { doNumber: 'DO/24-25/0042' } },
  { _id: 'pl_3', placementNumber: 'PL/24-25/0309', placementDate: iso(-3), status: 'COMPLETED', vehicleType: 'HIRE', hireVehicleNumber: 'MH-43-XY-9999', fromLocation: 'Pune', toLocation: 'Nashik', material: 'PETROL', doId: { doNumber: 'DO/24-25/0041' } },
];

const DELIVERY_ORDERS = [
  { _id: 'do_1', doNumber: 'DO/24-25/0044', doDate: iso(-1), status: 'PENDING', material: 'DIESEL', quantity: 100, freightRate: 2500, rateUnit: 'KL', partyId: PARTY_TATA },
  { _id: 'do_2', doNumber: 'DO/24-25/0043', doDate: iso(-4), status: 'PARTIAL', material: 'DIESEL', quantity: 200, freightRate: 2500, rateUnit: 'KL', partyId: PARTY_RIL },
  { _id: 'do_3', doNumber: 'DO/24-25/0042', doDate: iso(-8), status: 'CLOSED', material: 'PETROL', quantity: 80, freightRate: 2650, rateUnit: 'KL', partyId: PARTY_RIL },
];

const CONSIGNMENTS = [
  { _id: 'cn_1', cnNumber: 'CN/24-25/0311', cnDate: iso(-2), loadedQty: 19.8, loadedQtyUnit: 'KL', status: 'SAVED', tripId: { tripNumber: 'TRP/24-25/1001', fromLocation: 'Mumbai', toLocation: 'Pune' } },
  { _id: 'cn_2', cnNumber: 'CN/24-25/0310', cnDate: iso(-6), loadedQty: 20, loadedQtyUnit: 'KL', status: 'SAVED', tripId: { tripNumber: 'TRP/24-25/1000', fromLocation: 'Pune', toLocation: 'Nashik' } },
];

const PODS = [
  { _id: 'pod_1', receivedDate: iso(-3), copyType: 'BOTH', receivedVia: 'DRIVER_APP', handedToBilling: false, tripId: { tripNumber: 'TRP/24-25/1000', fromLocation: 'Pune', toLocation: 'Nashik' } },
  { _id: 'pod_2', receivedDate: iso(-11), copyType: 'HARD', receivedVia: 'COURIER', handedToBilling: true, tripId: { tripNumber: 'TRP/24-25/0999', fromLocation: 'Nashik', toLocation: 'Mumbai' } },
];

const UNLOADINGS = [
  { _id: 'unl_1', unloadingDate: iso(-4), loadedQty: 20, unloadedQty: 19.9, qtyUnit: 'KL', shortageQty: 0.1, detentionDays: 0, netReceivable: 497500, tripId: { tripNumber: 'TRP/24-25/1000' } },
  { _id: 'unl_2', unloadingDate: iso(-12), loadedQty: 24.6, unloadedQty: 24.2, qtyUnit: 'KL', shortageQty: 0.4, detentionDays: 2, netReceivable: 638200, tripId: { tripNumber: 'TRP/24-25/0999' } },
];

const KHATA_LEDGER = {
  balance: 4250,
  entries: [
    { _id: 'k_1', date: iso(-1), title: 'Diesel — HP pump, Lonavala', category: 'FUEL', amount: 3200, direction: 'DEBIT' },
    { _id: 'k_2', date: iso(-2), title: 'Trip advance received', category: 'ADVANCE', amount: 18500, direction: 'CREDIT' },
    { _id: 'k_3', date: iso(-2), title: 'Toll — Mumbai-Pune expressway', category: 'TOLL', amount: 940, direction: 'DEBIT' },
    { _id: 'k_4', date: iso(-3), title: 'Tyre puncture repair', category: 'REPAIR', amount: 650, direction: 'DEBIT' },
  ],
};

const EXPENSES = {
  results: [
    { _id: 'e_1', expenseDate: iso(-1), title: 'Diesel — HP pump, Lonavala', category: 'FUEL', amount: 3200 },
    { _id: 'e_2', expenseDate: iso(-2), title: 'Toll — Mumbai-Pune expressway', category: 'TOLL', amount: 940 },
    { _id: 'e_3', expenseDate: iso(-3), title: 'Tyre puncture repair', category: 'REPAIR', amount: 650 },
  ],
  total: 3,
  page: 1,
  limit: 20,
  totalPages: 1,
};

/**
 * Path → fixture. Longest match wins, so '/erp/trips/my-active' is checked
 * before '/erp/trips'. Values are the *unwrapped* payload — the adapter wraps
 * them in the `{ success, data, meta }` envelope the real API uses.
 */
const ROUTES = [
  ['/erp/trips/my-active', () => TRIP_ACTIVE],
  ['/erp/trips/pending-close', () => TRIPS.filter((t) => t.state === 'DISPATCHED')],
  ['/erp/trips/my', () => TRIPS],
  ['/erp/trips', () => TRIPS],
  ['/erp/advances/my', () => ADVANCES],
  ['/erp/advances', () => ADVANCES],
  ['/erp/approvals/summary', () => ({ pendingCount: APPROVALS.length })],
  ['/erp/approvals', () => APPROVALS],
  ['/erp/dashboard/summary', () => DASHBOARD_SUMMARY],
  ['/erp/finance-hub/summary', () => FINANCE_SUMMARY],
  ['/erp/finance-hub/ageing', () => AGEING],
  ['/erp/finance-hub/balances', () => AGEING],
  ['/erp/finance', () => FINANCE_SUMMARY],
  ['/erp/sale-bills', () => SALE_BILLS],
  ['/erp/ledger/entries', () => LEDGER_ENTRIES],
  ['/erp/ledger/statement', () => LEDGER_ENTRIES],
  ['/erp/ledger', () => LEDGER_ENTRIES],
  ['/erp/placements/board', () => PLACEMENTS],
  ['/erp/placements', () => PLACEMENTS],
  ['/erp/delivery-orders', () => DELIVERY_ORDERS],
  ['/erp/consignments', () => CONSIGNMENTS],
  ['/erp/pods', () => PODS],
  ['/erp/unloading', () => UNLOADINGS],
  ['/khata/drivers', () => KHATA_LEDGER],
  ['/expenses/summary', () => ({ totalAmount: 4790, count: 3, categoryBreakdown: { FUEL: 3200, TOLL: 940, REPAIR: 650 } })],
  ['/expenses', () => EXPENSES],
];

/** A single trip detail request — `/erp/trips/<id>` that isn't a static path. */
const TRIP_DETAIL_RX = /^\/erp\/trips\/(?!my|my-active|pending-close)[^/]+$/;

/**
 * Resolve a fixture for a request path, or undefined when there is none
 * (the adapter then falls back to an empty list).
 */
export function resolveMockFixture(url = '', method = 'get') {
  const path = String(url).split('?')[0].replace(/\/+$/, '') || '/';

  // Writes succeed and echo something plausible — enough for the UI to advance
  // to its success state without pretending a record was really created.
  if (method.toLowerCase() !== 'get') {
    if (path.includes('/upload')) return { documentId: 'mock_doc_1', url: 'https://example.invalid/mock.jpg' };
    return { _id: 'mock_created_1', mock: true };
  }

  if (TRIP_DETAIL_RX.test(path)) return TRIP_ACTIVE;

  const hit = ROUTES.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`));
  return hit ? hit[1]() : undefined;
}

export const MOCK_TOKEN_PREFIX = 'mock-jwt-';

export const isMockToken = (token) => String(token || '').startsWith(MOCK_TOKEN_PREFIX);
