/**
 * Document & OCR service — used by UploadPhotosScreen
 */
import { uploadFormData } from './api';

/**
 * OCR scan — reads litres / rate / odometer from an image.
 * @param {string} token
 * @param {{ uri: string, name: string, type: string }} file
 * @param {'FUEL_RECEIPT'|'ODOMETER'} docType
 */
export async function scanDocument(token, file, docType) {
  const formData = new FormData();
  formData.append('file', { uri: file.uri, name: file.name, type: file.type });
  formData.append('docType', docType);
  const res = await uploadFormData('/ocr/scan', formData, token);
  return res.data;
}

/**
 * Upload document to backend (S3).
 * @param {string} token
 * @param {{ uri: string, name: string, type: string }} file
 * @param {string} entityId   Vehicle _id
 * @param {'FUEL_SLIP'|'ODOMETER'} docType
 * @returns {{ _id, publicUrl }}
 */
export async function uploadDocument(token, file, entityId, docType) {
  const formData = new FormData();
  formData.append('file', { uri: file.uri, name: file.name, type: file.type });
  formData.append('entityType', 'VEHICLE');
  formData.append('entityId', entityId);
  formData.append('docType', docType);
  const res = await uploadFormData('/documents', formData, token);
  return res.data; // { _id, publicUrl }
}
