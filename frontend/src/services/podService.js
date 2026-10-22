import { postForm } from './client';

/**
 * Proof of delivery upload — driver may upload.
 * Backend: POST /api/erp/pods/upload (multipart).
 */
export async function uploadPod({ tripId, condition, receiver, remarks, file } = {}) {
  const fd = new FormData();
  if (tripId) fd.append('tripId', tripId);
  if (condition) fd.append('condition', condition);
  if (receiver) fd.append('receiver', receiver);
  if (remarks) fd.append('remarks', remarks);
  if (file) fd.append('file', file);
  return postForm('/erp/pods/upload', fd);
}

export default { uploadPod };
