import { postForm } from './client';

/**
 * Consignment note (bilty) upload — driver may upload.
 * Backend: POST /api/erp/consignments/upload-bilty (multipart).
 */
export async function uploadBilty({ tripId, cnNumber, file } = {}) {
  const fd = new FormData();
  if (tripId) fd.append('tripId', tripId);
  if (cnNumber) fd.append('cnNumber', cnNumber);
  if (file) fd.append('file', file);
  return postForm('/erp/consignments/upload-bilty', fd);
}

export default { uploadBilty };
