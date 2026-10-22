/**
 * Backend status enums → display label + Pill tone.
 *
 * Every value here is copied from a backend model's `enum`, so a status the API
 * can actually return always has a label. `metaFor` falls back to a humanised
 * form of the raw value rather than an em dash, so a newly-added backend status
 * degrades to readable text instead of disappearing.
 *
 * Tones are BackOfficeBits TONE keys (see components/ui).
 */

/** Humanise an unmapped enum value: PENDING_APPROVAL → "Pending approval". */
const humanise = (v) =>
  String(v || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());

/** Look a status up in a map, falling back to a humanised neutral chip. */
export const metaFor = (map, value) =>
  map[value] || { tone: 'neutral', label: humanise(value) || '—' };

/** AdvancePayment.status — erpAdvance/advance.model.js */
export const ADVANCE_STATUS = {
  PENDING_APPROVAL: { tone: 'pending', label: 'Pending approval' },
  APPROVED: { tone: 'info', label: 'Approved' },
  PAID: { tone: 'success', label: 'Paid' },
  CANCELLED: { tone: 'rejected', label: 'Cancelled' },
};

/** DeliveryOrder.status — erpDeliveryOrder model */
export const DO_STATUS = {
  PENDING_APPROVAL: { tone: 'pending', label: 'Pending approval' },
  PENDING: { tone: 'info', label: 'Open' },
  PARTIAL: { tone: 'warning', label: 'Partial' },
  COMPLETED: { tone: 'success', label: 'Completed' },
  EXPIRED: { tone: 'rejected', label: 'Expired' },
  CANCELLED: { tone: 'rejected', label: 'Cancelled' },
};

/** ErpTrip.state — erpTrip/erpTrip.constants.js ERP_TRIP_STATES */
export const TRIP_STATE = {
  PLACED: { tone: 'info', label: 'Placed' },
  ADVANCE_PENDING: { tone: 'pending', label: 'Advance pending' },
  ADVANCE_PAID: { tone: 'info', label: 'Advance paid' },
  CN_PENDING: { tone: 'pending', label: 'CN pending' },
  CN_UPDATED: { tone: 'info', label: 'CN updated' },
  DISPATCHED: { tone: 'in_transit', label: 'Dispatched' },
  TRIP_CLOSED: { tone: 'purple', label: 'Trip closed' },
  POD_RECEIVED: { tone: 'purple', label: 'POD received' },
  UNLOADED: { tone: 'info', label: 'Unloaded' },
  BILLED: { tone: 'success', label: 'Billed' },
  CANCELLED: { tone: 'rejected', label: 'Cancelled' },
};

/** SaleBill.status — erpSaleBill/saleBill.model.js */
export const SALE_BILL_STATUS = {
  DRAFT: { tone: 'neutral', label: 'Draft' },
  PENDING_APPROVAL: { tone: 'pending', label: 'Pending approval' },
  APPROVED: { tone: 'info', label: 'Approved' },
  SUBMITTED: { tone: 'info', label: 'Submitted' },
  PARTIALLY_PAID: { tone: 'warning', label: 'Part paid' },
  PAID: { tone: 'success', label: 'Paid' },
  CANCELLED: { tone: 'rejected', label: 'Cancelled' },
};

/** Vehicle.status — vehicle/vehicle.model.js */
export const VEHICLE_STATUS = {
  AVAILABLE: { tone: 'success', label: 'Available' },
  ON_TRIP: { tone: 'in_transit', label: 'On trip' },
  MAINTENANCE: { tone: 'warning', label: 'Maintenance' },
};

/** MaintenanceRecord.recordType — maintenance/maintenance.model.js RECORD_TYPES */
export const MAINTENANCE_TYPE = {
  SERVICE: { tone: 'info', label: 'Service' },
  REPAIR: { tone: 'warning', label: 'Repair' },
};

/** Driver expense bill status — /app/v1/bills */
export const BILL_STATUS = {
  PENDING: { tone: 'pending', label: 'Pending' },
  CONFIRMED: { tone: 'success', label: 'Confirmed' },
  REJECTED: { tone: 'rejected', label: 'Rejected' },
};
