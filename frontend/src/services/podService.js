import { postForm } from './client';
import { appendFile } from '../utils/appendFile';

/**
 * Proof of delivery upload — driver may upload.
 * Backend: POST /api/erp/pods/upload (multipart).
 */
export async function uploadPod({ tripId, condition, receiver, remarks, file } = {}) {
  const fd = new FormData();
  if (tripId) fd.append('tripId', tripId);
  await appendFile(fd, 'pod', file);
  return postForm('/erp/pods/upload', fd);
}

export default { uploadPod };
