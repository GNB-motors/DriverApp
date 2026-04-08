/**
 * API service for FleetEdge DriverApp
 *
 * Base URL: update API_BASE_URL for your environment.
 * - Local dev (Android emulator): http://10.0.2.2:3000
 * - Local dev (iOS simulator):    http://localhost:3000
 * - Physical device (dev):        http://<your-machine-ip>:3000
 * - Production:                   https://api.yourfleetedge.com
 */
const API_BASE_URL = 'https://3.6.86.184.nip.io/v1/api';

class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function request(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${API_BASE_URL}${path}`, options);

  if (response.status === 304) return null;

  let data;
  try {
    data = await response.json();
  } catch {
    throw new ApiError('Unable to reach server. Please check your connection.', response.status);
  }

  if (!response.ok) {
    throw new ApiError(data.message || 'Something went wrong', response.status);
  }

  return data;
}

// ── Auth ───────────────────────────────────────────────────────────────

/**
 * Request OTP — sent to driver's registered mobile number via SMS.
 * @param {string} mobileNumber  e.g. "+919876543210"
 */
export async function requestDriverOtp(mobileNumber) {
  return request('POST', '/auth/driver/request-otp', { mobileNumber });
}

/**
 * Verify OTP and receive a 30-day JWT token.
 * @param {string} mobileNumber
 * @param {string} otp  6-digit string
 * @returns {{ user, token, organization }}
 */
export async function verifyDriverOtp(mobileNumber, otp) {
  const res = await request('POST', '/auth/driver/verify-otp', { mobileNumber, otp });
  return res.data; // { user, token, organization }
}

// ── Vehicles ───────────────────────────────────────────────────────────

export async function fetchVehicles(token, limit = 100) {
  const res = await request('GET', `/vehicles?limit=${limit}`, null, token);
  return res.data;
}

// ── Employees / Drivers ────────────────────────────────────────────────

export async function fetchDrivers(token, limit = 100) {
  const res = await request('GET', `/employees?role=DRIVER&limit=${limit}`, null, token);
  return res.data;
}

// ── Mileage ────────────────────────────────────────────────────────────

export async function fetchLastOdometer(token, vehicleId) {
  const res = await request('GET', `/mileage/last-odometer/${vehicleId}`, null, token);
  return res.data; // { odometerReading, refuelTime } or null
}

export async function submitFuelLog(token, payload) {
  const res = await request('POST', '/mileage/fuel-log', payload, token);
  return res.data;
}

export async function fetchMileageIntervals(token, page = 1, limit = 50) {
  const res = await request('GET', `/mileage/intervals?page=${page}&limit=${limit}`, null, token);
  return res; // { data, meta }
}

// ── OCR ────────────────────────────────────────────────────────────────

/**
 * Upload image for OCR scanning.
 * @param {string} token
 * @param {Object} file  { uri, name, type }
 * @param {'FUEL_RECEIPT'|'ODOMETER'} docType
 */
export async function scanDocument(token, file, docType) {
  const formData = new FormData();
  formData.append('file', { uri: file.uri, name: file.name, type: file.type });
  formData.append('docType', docType);

  const response = await fetch(`${API_BASE_URL}/ocr/scan`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) throw new ApiError(data.message || 'OCR failed', response.status);
  return data.data;
}

/**
 * Upload document to S3 and create a Document record.
 * @param {string} token
 * @param {Object} file        { uri, name, type }
 * @param {string} entityId    Vehicle ObjectId
 * @param {'FUEL_SLIP'|'ODOMETER'} docType
 * @returns {{ _id, publicUrl }}
 */
export async function uploadDocument(token, file, entityId, docType) {
  const formData = new FormData();
  formData.append('file', { uri: file.uri, name: file.name, type: file.type });
  formData.append('entityType', 'VEHICLE');
  formData.append('entityId', entityId);
  formData.append('docType', docType);

  const response = await fetch(`${API_BASE_URL}/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) throw new ApiError(data.message || 'Upload failed', response.status);
  return data.data;
}
