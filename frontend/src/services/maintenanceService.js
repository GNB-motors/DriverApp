import client, { postForm } from './client';

/**
 * Repairs / maintenance. Backend: /api/maintenance (OWNER/MANAGER/DRIVER).
 */
export async function listMaintenance(params = {}) {
  const res = await client.get('/maintenance', { params });
  return res.data?.data ?? res.data;
}

// Fields the /maintenance create endpoint accepts (multipart; strict Joi rejects
// unknown keys). Photos are sent separately as `files` parts.
const MAINTENANCE_FIELDS = [
  'vehicleId', 'recordType', 'date', 'workshop', 'type',
  'amount', 'notes', 'currentKm', 'driverId',
];

/**
 * Create a service/repair record. `photos` is an array of RN file parts
 * { uri, name, type }; each is uploaded as a multipart `files` part and stored
 * on the record's attachments — not dropped.
 */
export async function createMaintenance({ photos, ...fields } = {}) {
  const fd = new FormData();
  MAINTENANCE_FIELDS.forEach((k) => {
    if (fields[k] != null && fields[k] !== '') fd.append(k, String(fields[k]));
  });
  (photos || []).forEach((p) => { if (p) fd.append('files', p); });
  return postForm('/maintenance', fd);
}

export default { listMaintenance, createMaintenance };
