import React from 'react';
import Badge from './Badge';

/**
 * StatusBadge — maps a lifecycle status to the right Badge tone + label.
 * Used across bills, fuel, trips, advances, documents.
 *
 *   <StatusBadge status="pending" />
 *   <StatusBadge status="confirmed" />
 *   <StatusBadge status="rejected" />
 *   <StatusBadge status="in_transit" label="In transit" dot />
 *
 * Props: status (string), label (override text), dot, style.
 */

// status key → { tone, label }
const STATUS = {
  // amber
  pending: { tone: 'pending', label: 'Pending' },
  approved: { tone: 'pending', label: 'Approved' },
  in_workshop: { tone: 'pending', label: 'In workshop' },
  expiring: { tone: 'pending', label: 'Expiring' },
  late: { tone: 'pending', label: 'Late' },
  // green
  confirmed: { tone: 'valid', label: 'Confirmed' },
  paid: { tone: 'valid', label: 'Paid' },
  closed: { tone: 'valid', label: 'Closed' },
  done: { tone: 'valid', label: 'Done' },
  verified: { tone: 'valid', label: 'Verified' },
  valid: { tone: 'valid', label: 'Valid' },
  captured: { tone: 'valid', label: 'Captured' },
  assigned: { tone: 'valid', label: 'Assigned' },
  // red
  rejected: { tone: 'expired', label: 'Rejected' },
  failed: { tone: 'expired', label: 'Failed' },
  // blue
  in_transit: { tone: 'inTransit', label: 'In transit' },
  required: { tone: 'info', label: 'Required' },
  // neutral
  draft: { tone: 'neutral', label: 'Draft' },
};

export default function StatusBadge({ status, label, dot = false, style }) {
  const key = String(status || '').toLowerCase().replace(/[\s-]+/g, '_');
  const entry = STATUS[key] || { tone: 'neutral', label: label || String(status || '') };
  return <Badge tone={entry.tone} label={label || entry.label} dot={dot} style={style} />;
}
