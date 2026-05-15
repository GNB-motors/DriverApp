import * as Sentry from '@sentry/react-native';
import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.app.gnbedge.in/v1/api';

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

// Request Interceptor: Logging & dynamic token
apiClient.interceptors.request.use(
  (config) => {
    // If we passed a token via config.token (custom property), attach it
    if (config.token) {
      config.headers['Authorization'] = `Bearer ${config.token}`;
    }
    console.log(`\n[API] >>> ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    if (config.data && !(config.data instanceof FormData)) {
      console.log(`[API] Request body:`, JSON.stringify(config.data));
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Error handling & logging
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API] <<< Status: ${response.status} ${response.statusText}`);
    // Only log small responses or omit this in prod later
    if (response.data && typeof response.data === 'object') {
      console.log(`[API] Response body snippet...`); 
    }
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(`[API] ERROR ${error.response.status} from ${error.config?.url}:`, error.response.data);
      const message = error.response.data?.message || 'Something went wrong';
      const apiErr = new ApiError(message, error.response.status);
      reportApiError(apiErr, { 
        method: error.config?.method?.toUpperCase(), 
        path: error.config?.url, 
        status: error.response.status, 
        body: error.response.data 
      });
      return Promise.reject(apiErr);
    } else if (error.request) {
      console.error(`[API] NETWORK ERROR — could not reach ${error.config?.url}:`, error.message);
      const apiErr = new ApiError('Unable to reach server. Please check your connection.', 0);
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
async function multipart(path, formData, token, { timeoutMs } = {}) {
  try {
    const config = {
      headers: { 'Content-Type': 'multipart/form-data' },
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

// ── Vehicles ───────────────────────────────────────────────────────────

export async function fetchVehicles(token, limit = 100) {
  const res = await apiClient.get(`/vehicles?limit=${limit}`, { token });
  return res.data?.data;
}

// ── Employees / Drivers ────────────────────────────────────────────────

export async function fetchDrivers(token, limit = 100) {
  const res = await apiClient.get(`/employees?role=DRIVER&limit=${limit}`, { token });
  return res.data?.data;
}

// ── Mileage ────────────────────────────────────────────────────────────

export async function fetchLastOdometer(token, vehicleId) {
  const res = await apiClient.get(`/mileage/last-odometer/${vehicleId}`, { token });
  return res.data?.data;
}

export async function submitFuelLog(token, payload) {
  const res = await apiClient.post('/mileage/fuel-log', payload, { token });
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

export async function scanDocument(token, file, docType) {
  return multipart('/ocr/scan', buildFileForm(file, { docType }), token, { timeoutMs: 60000 });
}

export async function uploadDocument(token, file, entityId, docType, ocrData = null) {
  const fields = { entityType: 'VEHICLE', entityId, docType };
  if (ocrData) fields.ocrData = JSON.stringify(ocrData);
  return multipart('/documents', buildFileForm(file, fields), token);
}
