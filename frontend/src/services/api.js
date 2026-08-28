import * as Sentry from '@sentry/react-native';
import axios from 'axios';
import logger from '../utils/logger';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export class ApiError extends Error {
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

// Create an Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: token injection + logging
apiClient.interceptors.request.use(
  (config) => {
    if (config.token) {
      config.headers['Authorization'] = `Bearer ${config.token}`;
    }
    logger.api(
      (config.method || 'GET').toUpperCase(),
      config.url,
      'REQ',
      config.params || undefined,
    );
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: logging + error handling
apiClient.interceptors.response.use(
  (response) => {
    logger.api(
      (response.config.method || 'GET').toUpperCase(),
      response.config.url,
      response.status,
    );
    return response;
  },
  (error) => {
    if (error.response) {
      const message = error.response.data?.message || 'Something went wrong';
      const apiErr = new ApiError(message, error.response.status);
      logger.error('API', `${error.config?.method?.toUpperCase()} ${error.config?.url} → ${error.response.status}: ${message}`);
      reportApiError(apiErr, {
        method: error.config?.method?.toUpperCase(),
        path: error.config?.url,
        status: error.response.status,
        body: error.response.data
      });
      return Promise.reject(apiErr);
    } else if (error.request) {
      const apiErr = new ApiError('Unable to reach server. Please check your connection.', 0);
      logger.error('API', `${error.config?.method?.toUpperCase()} ${error.config?.url} → no response (network error)`);
      reportApiError(apiErr, {
        method: error.config?.method?.toUpperCase(),
        path: error.config?.url,
        status: 0,
        body: null
      });
      return Promise.reject(apiErr);
    }
    return Promise.reject(error);
  }
);

// Helper for multipart forms
async function multipart(path, formData, token, { timeoutMs, extraHeaders = {} } = {}) {
  try {
    const config = {
      headers: { 'Content-Type': 'multipart/form-data', ...extraHeaders },
      token, // custom property handled by interceptor
    };
    if (timeoutMs) config.timeout = timeoutMs;

    const response = await apiClient.post(path, formData, config);
    return response.data?.data ?? response.data;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      const apiErr = new ApiError('Request timed out. Please try again.', 408);
      reportApiError(apiErr, { method: 'POST', path, status: 408, body: null });
      throw apiErr;
    }
    // other errors are already reported by the response interceptor
    throw error;
  }
}

function buildFileForm(file, fields = {}) {
  const fd = new FormData();
  fd.append('file', { uri: file.uri, name: file.name, type: file.type });
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

// ── Auth ───────────────────────────────────────────────────────────────

export async function requestDriverOtp(mobileNumber) {
  const res = await apiClient.post('/auth/driver/request-otp', { mobileNumber });
  return res.data;
}

export async function verifyDriverOtp(mobileNumber, otp) {
  const res = await apiClient.post('/auth/driver/verify-otp', { mobileNumber, otp });
  return res.data?.data;
}

// Phone/email + password login (all roles). Backend: POST /auth/login
// → { status, data: { user, token, organization } }
export async function loginWithPassword(emailOrMobile, password) {
  const res = await apiClient.post('/auth/login', { emailOrMobile, password });
  return res.data?.data ?? res.data;
}

// ── Vehicles ───────────────────────────────────────────────────────────

export async function fetchVehicles(token, limit = 100) {
  const res = await apiClient.get(`/vehicles?limit=${limit}`, { token });
  return res.data?.data;
}

// Vehicles across all orgs a field agent belongs to
export async function fetchFieldAgentVehicles(token) {
  const res = await apiClient.get('/field-agent/fuel-logs/all-vehicles', { token });
  return res.data?.data ?? [];
}

// ── Employees / Drivers ────────────────────────────────────────────────

export async function fetchDrivers(token, limit = 100) {
  const res = await apiClient.get(`/employees?role=DRIVER&limit=${limit}`, { token });
  return res.data?.data;
}

// Drivers across all orgs a field agent belongs to
export async function fetchFieldAgentDrivers(token) {
  const res = await apiClient.get('/field-agent/fuel-logs/all-drivers', { token });
  return res.data?.data ?? [];
}

// ── Mileage ────────────────────────────────────────────────────────────

export async function fetchLastOdometer(token, vehicleId, orgId = null) {
  const config = { token };
  if (orgId) config.headers = { 'X-Org-Id': orgId };
  const res = await apiClient.get(`/mileage/last-odometer/${vehicleId}`, config);
  return res.data?.data;
}

export async function submitFuelLog(token, payload, orgId = null) {
  const config = { token };
  if (orgId) config.headers = { 'X-Org-Id': orgId };
  const res = await apiClient.post('/mileage/fuel-log', payload, config);
  return res.data?.data;
}

export async function fetchMileageIntervals(token, page = 1, limit = 50) {
  const res = await apiClient.get(`/mileage/intervals?page=${page}&limit=${limit}`, { token });
  return res.data;
}

export async function fetchMyFuelLogs(token, driverId, page = 1, limit = 50) {
  const res = await apiClient.get(`/fuel-logs?driverId=${driverId}&page=${page}&limit=${limit}`, { token });
  return res.data;
}

// Field agent cross-org fuel log history (uses loggedBy filter server-side)
export async function fetchFieldAgentFuelLogs(token, page = 1, limit = 50) {
  const res = await apiClient.get(`/field-agent/fuel-logs/all-fuel-logs?page=${page}&limit=${limit}`, { token });
  return res.data;
}

// ── Driver Location ───────────────────────────────────────────────────

export async function sendDriverLocation(token, { locationPermission, latitude, longitude }) {
  const body = { locationPermission };
  if (locationPermission && latitude != null && longitude != null) {
    body.latitude = latitude;
    body.longitude = longitude;
  }
  const res = await apiClient.post('/driver/location', body, { token });
  return res.data?.data;
}

// ── OCR / Documents ────────────────────────────────────────────────────

export async function scanDocument(token, file, docType, orgId = null) {
  const extraHeaders = orgId ? { 'X-Org-Id': orgId } : {};
  return multipart('/ocr/scan', buildFileForm(file, { docType }), token, { timeoutMs: 60000, extraHeaders });
}

export async function uploadDocument(token, file, entityId, docType, ocrData = null, orgId = null) {
  const fields = { entityType: 'VEHICLE', entityId, docType };
  if (ocrData) fields.ocrData = JSON.stringify(ocrData);
  const extraHeaders = orgId ? { 'X-Org-Id': orgId } : {};
  return multipart('/documents', buildFileForm(file, fields), token, { extraHeaders });
}

export async function fetchDocuments(token, entityType, entityId) {
  const res = await apiClient.get(`/documents?entityType=${entityType}&entityId=${entityId}`, { token });
  return res.data?.data || res.data || [];
}

export async function fetchVehicleDocuments(token, vehicleId) {
  const res = await apiClient.get(`/vehicles/${vehicleId}/documents`, { token });
  return res.data?.data || res.data || [];
}

// ── Maintenance / Repairs ──────────────────────────────────────────────

export async function submitRepair(token, payload, photos = []) {
  try {
    if (photos.length === 0) {
      const res = await apiClient.post('/maintenance', payload, { token });
      return res.data?.data;
    }
    
    const fd = new FormData();
    for (const [k, v] of Object.entries(payload)) {
      if (v !== undefined && v !== null && v !== '') {
        fd.append(k, v);
      }
    }
    for (const photo of photos) {
      fd.append('files', {
        uri: photo.uri,
        name: photo.uri.split('/').pop() || 'photo.jpg',
        type: 'image/jpeg',
      });
    }
    return await multipart('/maintenance', fd, token);
  } catch (error) {
    logger.error('API', `submitRepair failed: ${error.response?.data?.message || error.message}`);
    throw error;
  }
}

export async function fetchRepairLogs(token, search = '') {
  try {
    // Assuming the backend supports recordType=REPAIR
    const query = search ? `&search=${encodeURIComponent(search)}` : '';
    const res = await apiClient.get(`/maintenance?recordType=REPAIR${query}`, { token });
    return res.data?.data || res.data || [];
  } catch (error) {
    logger.error('API', `fetchRepairLogs failed: ${error.response?.data?.message || error.message}`);
    throw error;
  }
}
