import * as Sentry from '@sentry/react-native';

const API_BASE_URL = 'https://api.app.gnbedge.in/v1/api';


class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

function reportApiError(err, { method, path, status, body }) {
  Sentry.withScope((scope) => {
    scope.setTag('api.method', method);
    scope.setTag('api.path', path);
    if (status != null) scope.setTag('api.status', String(status));
    scope.setContext('api', { method, path, status, body });
    Sentry.captureException(err);
  });
}

async function request(method, path, body = null, token = null) {
  const fullUrl = `${API_BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  console.log(`\n[API] >>> ${method} ${fullUrl}`);
  if (body) console.log(`[API] Request body:`, JSON.stringify(body));

  let response;
  try {
    response = await fetch(fullUrl, options);
  } catch (networkErr) {
    console.error(`[API] NETWORK ERROR — could not reach ${fullUrl}:`, networkErr.message);
    reportApiError(networkErr, { method, path, status: 0, body: null });
    throw new ApiError('Unable to reach server. Please check your connection.', 0);
  }

  console.log(`[API] <<< Status: ${response.status} ${response.statusText}`);

  if (response.status === 304) return null;

  let data;
  try {
    data = await response.json();
    console.log(`[API] Response body:`, JSON.stringify(data));
  } catch (parseErr) {
    console.error(`[API] Failed to parse JSON response from ${fullUrl}`);
    reportApiError(parseErr, { method, path, status: response.status, body: null });
    throw new ApiError('Unable to reach server. Please check your connection.', response.status);
  }

  if (!response.ok) {
    console.error(`[API] ERROR ${response.status} from ${fullUrl}:`, data?.message || data);
    const apiErr = new ApiError(data.message || 'Something went wrong', response.status);
    reportApiError(apiErr, { method, path, status: response.status, body: data });
    throw apiErr;
  }

  return data;
}

// Multipart upload helper. Optional timeout aborts the request.
// Backend response shape is inconsistent — most endpoints wrap in {data:...},
// but /documents returns the raw doc — so unwrap defensively.
async function multipart(path, formData, token, { timeoutMs } = {}) {
  const controller = timeoutMs ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      signal: controller?.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new ApiError('Request timed out. Please try again.', 408);
      reportApiError(timeoutErr, { method: 'POST', path, status: 408, body: null });
      throw timeoutErr;
    }
    reportApiError(err, { method: 'POST', path, status: 0, body: null });
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }

  const data = await response.json();
  console.log(`[API] ${path} — status: ${response.status}, full response:`, JSON.stringify(data, null, 2));
  if (!response.ok) {
    const apiErr = new ApiError(data.message || 'Upload failed', response.status);
    reportApiError(apiErr, { method: 'POST', path, status: response.status, body: data });
    throw apiErr;
  }
  return data?.data ?? data;
}

function buildFileForm(file, fields = {}) {
  const fd = new FormData();
  fd.append('file', { uri: file.uri, name: file.name, type: file.type });
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

// ── Auth ───────────────────────────────────────────────────────────────

export async function requestDriverOtp(mobileNumber) {
  return request('POST', '/auth/driver/request-otp', { mobileNumber });
}

export async function verifyDriverOtp(mobileNumber, otp) {
  const res = await request('POST', '/auth/driver/verify-otp', { mobileNumber, otp });
  return res?.data;
}

// ── Vehicles ───────────────────────────────────────────────────────────

export async function fetchVehicles(token, limit = 100) {
  const res = await request('GET', `/vehicles?limit=${limit}`, null, token);
  return res?.data;
}

// ── Employees / Drivers ────────────────────────────────────────────────

export async function fetchDrivers(token, limit = 100) {
  const res = await request('GET', `/employees?role=DRIVER&limit=${limit}`, null, token);
  return res?.data;
}

// ── Mileage ────────────────────────────────────────────────────────────

export async function fetchLastOdometer(token, vehicleId) {
  const res = await request('GET', `/mileage/last-odometer/${vehicleId}`, null, token);
  return res?.data;
}

export async function submitFuelLog(token, payload) {
  const res = await request('POST', '/mileage/fuel-log', payload, token);
  return res?.data;
}

export async function fetchMileageIntervals(token, page = 1, limit = 50) {
  return request('GET', `/mileage/intervals?page=${page}&limit=${limit}`, null, token);
}

export async function fetchMyFuelLogs(token, driverId, page = 1, limit = 50) {
  return request(
    'GET',
    `/fuel-logs?driverId=${driverId}&page=${page}&limit=${limit}`,
    null,
    token,
  );
}

// ── Driver Location ───────────────────────────────────────────────────

export async function sendDriverLocation(token, { locationPermission, latitude, longitude }) {
  const body = { locationPermission };
  if (locationPermission && latitude != null && longitude != null) {
    body.latitude = latitude;
    body.longitude = longitude;
  }
  const res = await request('POST', '/driver/location', body, token);
  return res?.data;
}

// ── OCR / Documents ────────────────────────────────────────────────────

export async function scanDocument(token, file, docType) {
  return multipart('/ocr/scan', buildFileForm(file, { docType }), token, { timeoutMs: 60000 });
}

export async function uploadDocument(token, file, entityId, docType, ocrData = null) {
  const fields = { entityType: 'VEHICLE', entityId, docType };
  if (ocrData) fields.ocrData = JSON.stringify(ocrData);
  return multipart('/documents', buildFileForm(file, fields), token);
}
