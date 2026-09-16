import { postForm } from './client';

/**
 * Consignment note (bilty) upload — driver may upload.
 * Backend: POST /api/erp/consignments/upload-bilty (multipart).
 *
 * The endpoint takes a SINGLE file part named `bilty` and stores exactly one
 * bilty per trip — a new upload supersedes the previous one. There is no way to
 * attach multiple pages, so the screen captures a single page. `cnNumber` is set
 * later at CN save (web), not here, and the upload validator rejects unknown
 * fields, so we only send `tripId` + `bilty`.
 */
export async function uploadBilty({ tripId, file } = {}) {
  const fd = new FormData();
  if (tripId) fd.append('tripId', tripId);
  if (file) fd.append('bilty', file);
  return postForm('/erp/consignments/upload-bilty', fd);
}

export default { uploadBilty };
