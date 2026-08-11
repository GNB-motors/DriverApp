/**
 * tripState.js
 *
 * The ERP trip state machine, as the backend actually models it. Ported from the
 * web's `nextAction()` + `StatusBadge` maps so both clients agree on what a trip
 * needs next and how a state is coloured.
 *
 * ── The model (app/modules/erpTrip/erpTrip.constants.js) ──────────────────
 * The early pipeline is PARALLEL, not linear. A trip carries two independent
 * gates and one overall state:
 *
 *   advanceGate: NONE → PENDING → APPROVED → PAID     (financial track)
 *   cnGate:      NONE → UPDATED                       (paperwork track)
 *
 * Saving the CN promotes the trip PLACED → DISPATCHED — the truck is loaded and
 * moving whether or not the advance has settled. Advance never blocks dispatch
 * or close. After dispatch the flow is linear again:
 *
 *   DISPATCHED → TRIP_CLOSED → POD_RECEIVED → UNLOADED → BILLED
 *
 * This is why a single numeric "pipelineStage" cannot represent a trip: render
 * the linear track from `state` and show `advanceGate` as a separate indicator.
 *
 * The four legacy states (ADVANCE_PENDING, ADVANCE_PAID, CN_PENDING, CN_UPDATED)
 * still exist on rows created before the refactor and must keep rendering.
 */

// ── Linear track shown in the UI ────────────────────────────────────────────
export const TRIP_TRACK = [
  { state: 'PLACED', label: 'Placed', short: 'Placed' },
  { state: 'DISPATCHED', label: 'In transit', short: 'Transit' },
  { state: 'TRIP_CLOSED', label: 'Closed', short: 'Closed' },
  { state: 'POD_RECEIVED', label: 'POD in', short: 'POD' },
  { state: 'UNLOADED', label: 'Unloaded', short: 'Unload' },
  { state: 'BILLED', label: 'Billed', short: 'Billed' },
];

/** Legacy states collapse onto their modern equivalent for display. */
const LEGACY_TO_TRACK = {
  ADVANCE_PENDING: 'PLACED',
  ADVANCE_PAID: 'PLACED',
  CN_PENDING: 'PLACED',
  CN_UPDATED: 'DISPATCHED',
};

/** Position of a trip on TRIP_TRACK, or -1 for CANCELLED / unknown. */
export function trackIndex(state) {
  const normalised = LEGACY_TO_TRACK[state] || state;
  return TRIP_TRACK.findIndex((s) => s.state === normalised);
}

export const STATE_LABELS = {
  PLACED: 'Placed',
  ADVANCE_PENDING: 'Advance pending',
  ADVANCE_PAID: 'Advance paid',
  CN_PENDING: 'CN pending',
  CN_UPDATED: 'CN updated',
  DISPATCHED: 'In transit',
  TRIP_CLOSED: 'Trip closed',
  POD_RECEIVED: 'POD received',
  UNLOADED: 'Unloaded',
  BILLED: 'Billed',
  CANCELLED: 'Cancelled',
};

export const stateLabel = (state) => STATE_LABELS[state] || state || '—';

/** Badge tone — mirrors the web's StatusBadge so colours match across clients. */
export function stateTone(state) {
  switch (state) {
    case 'PLACED':
    case 'ADVANCE_PENDING':
    case 'CN_PENDING':
      return 'warning';
    case 'DISPATCHED':
    case 'CN_UPDATED':
    case 'POD_RECEIVED':
    case 'UNLOADED':
      return 'info';
    case 'TRIP_CLOSED':
      return 'default';
    case 'BILLED':
      return 'success';
    case 'CANCELLED':
      return 'danger';
    default:
      return 'default';
  }
}

export const ADVANCE_GATE_LABELS = {
  NONE: 'Not raised',
  PENDING: 'Awaiting approval',
  APPROVED: 'Approved',
  PAID: 'Paid',
};

export function advanceGateTone(gate) {
  switch (gate) {
    case 'PAID': return 'success';
    case 'APPROVED': return 'info';
    case 'PENDING': return 'warning';
    default: return 'default';
  }
}

/**
 * The single next step for a trip — the most useful thing a card can show.
 * Ported from main-frontend TripDashboardPage.nextAction().
 *
 * `wait: true` means the ball is in someone else's court.
 * `roles` lists who may perform it; the caller checks against the session role.
 */
export function nextAction(trip) {
  if (!trip) return null;
  switch (trip.state) {
    case 'CANCELLED':
      return null;
    case 'PLACED':
    case 'ADVANCE_PENDING':
    case 'ADVANCE_PAID':
    case 'CN_PENDING':
      return {
        key: 'cn',
        label: 'Create CN',
        driverLabel: 'Upload bilty & CN',
        roles: ['OWNER', 'MANAGER', 'OPS_EXECUTIVE', 'DRIVER'],
      };
    case 'CN_UPDATED':
    case 'DISPATCHED':
      return {
        key: 'close',
        label: 'Close trip',
        roles: ['OWNER', 'MANAGER', 'OPS_EXECUTIVE'],
      };
    case 'TRIP_CLOSED':
      return {
        key: 'pod',
        label: 'Upload POD',
        driverLabel: 'Submit POD',
        roles: ['OWNER', 'MANAGER', 'OPS_EXECUTIVE', 'DRIVER'],
      };
    case 'POD_RECEIVED':
      return {
        key: 'unloading',
        label: 'Enter unloading',
        roles: ['OWNER', 'MANAGER', 'OPS_EXECUTIVE'],
      };
    case 'UNLOADED':
      return {
        key: 'salebill',
        label: 'Generate sale bill',
        roles: ['OWNER', 'MANAGER', 'ACCOUNTS'],
      };
    case 'BILLED':
      return {
        key: 'receipt',
        label: 'Awaiting payment',
        wait: true,
        roles: ['OWNER', 'MANAGER', 'ACCOUNTS'],
      };
    default:
      return null;
  }
}

/** The next action, but only if this role is allowed to perform it. */
export function nextActionFor(trip, role) {
  const action = nextAction(trip);
  if (!action) return null;
  if (!action.roles.includes(role)) return { ...action, wait: true };
  return action;
}

// ── Guards the screens use so a button is never offered on a state the
//    backend will reject ─────────────────────────────────────────────────────

/** CN save states, from consignment.service.CN_SAVE_STATES. */
export const canSaveCn = (trip) =>
  ['PLACED', 'ADVANCE_PENDING', 'ADVANCE_PAID'].includes(trip?.state);

/** closeTrip() hard-requires DISPATCHED — not a stage number. */
export const canCloseTrip = (trip) => trip?.state === 'DISPATCHED';

/** recordPod() hard-requires TRIP_CLOSED. */
export const canRecordPod = (trip) => trip?.state === 'TRIP_CLOSED';

/** saveUnloading() runs once the POD is in. */
export const canEnterUnloading = (trip) => trip?.state === 'POD_RECEIVED';

/** States in which the trip is still the driver's concern. */
export const isTripLive = (trip) =>
  !!trip && !['BILLED', 'CANCELLED'].includes(trip.state);

// ── Display helpers ─────────────────────────────────────────────────────────

/** Trips are identified by tripNumber. There is no `lrNumber` on the model. */
export const tripRef = (trip) => trip?.tripNumber || '—';

/** Route as "From → To" using the real field names. */
export function tripRoute(trip) {
  const from = trip?.fromLocation || '—';
  const to = trip?.toLocation || '—';
  return { from, to, text: `${from} → ${to}` };
}

/** Party name off the populated `partyId`. */
export const tripParty = (trip) =>
  trip?.partyId?.name || trip?.party?.name || '—';

/** Quantity with unit, preferring the loaded figure once the CN exists. */
export function tripQty(trip) {
  const qty = trip?.loadedQty ?? trip?.plannedQty;
  if (qty === null || qty === undefined) return '—';
  const unit = trip?.consignment?.loadedQtyUnit || 'KL';
  const isActual = trip?.loadedQty !== null && trip?.loadedQty !== undefined;
  return `${qty} ${unit}${isActual ? '' : ' (planned)'}`;
}

/**
 * Filter chips for trip lists. `value` matches FilterBar's prop shape.
 *
 * Only states the backend both stores AND accepts in the listTrips validator —
 * sending anything else (e.g. the old 'ACTIVE'/'CLOSED') is a hard 400.
 */
export const TRIP_FILTERS = [
  { value: '', label: 'All' },
  { value: 'PLACED', label: 'Placed' },
  { value: 'DISPATCHED', label: 'In transit' },
  { value: 'TRIP_CLOSED', label: 'Closed' },
  { value: 'POD_RECEIVED', label: 'POD in' },
  { value: 'UNLOADED', label: 'Unloaded' },
  { value: 'BILLED', label: 'Billed' },
];
