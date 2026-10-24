import client from './client';

/**
 * Documents. Backend: /api/documents (multipart create + OCR).
 */
export async function listDocuments(entityType, entityId) {
  const res = await client.get('/documents', { params: { entityType, entityId } });
  return res.data?.data ?? res.data;
}

export async function getDocument(id) {
  const res = await client.get(`/documents/${id}`);
  return res.data?.data ?? res.data;
}

export default { listDocuments, getDocument };
