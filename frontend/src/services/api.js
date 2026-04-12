/**
 * API service for FleetEdge DriverApp
 */

const API_BASE_URL = "https://3.6.86.184.nip.io/v1/api"; // 👈 replace with your machine IP

const DEBUG = true; // 🔥 toggle logs ON/OFF

class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function request(method, path, body = null, token = null) {
  const url = `${API_BASE_URL}${path}`;

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  // 🚀 REQUEST LOG
  if (DEBUG) {
    console.group(`🚀 ${method} ${path}`);
    console.log("URL:", url);
    console.log("Headers:", headers);
    console.log("Body:", body);
  }

  const start = Date.now();

  let response;

  try {
    response = await fetch(url, options);
  } catch (error) {
    if (DEBUG) {
      console.log("❌ NETWORK ERROR:", error);
      console.groupEnd();
    }
    throw error;
  }

  const duration = Date.now() - start;

  if (response.status === 304) {
    if (DEBUG) {
      console.log("⚡ CACHE HIT (304)");
      console.groupEnd();
    }
    return null;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    if (DEBUG) {
      console.log("❌ PARSE ERROR:", response.status);
      console.groupEnd();
    }
    throw new ApiError(
      'Unable to reach server. Please check your connection.',
      response.status
    );
  }

  // ✅ RESPONSE LOG
  if (DEBUG) {
    console.log("✅ RESPONSE STATUS:", response.status);
    console.log("⏱️ TIME:", `${duration}ms`);
    console.log("📦 DATA:", data);
  }

  if (!response.ok) {
    if (DEBUG) {
      console.log("⚠️ API FAILED:", data.message);
      console.groupEnd();
    }
    throw new ApiError(data.message || 'Something went wrong', response.status);
  }

  if (DEBUG) {
    console.groupEnd();
  }

  return data;
}

// ── Auth ─────────────────────────────────────────

export async function requestDriverOtp(mobileNumber) {
  return request('POST', '/auth/driver/request-otp', { mobileNumber });
}

export async function verifyDriverOtp(mobileNumber, otp) {
  const res = await request('POST', '/auth/driver/verify-otp', { mobileNumber, otp });
  return res.data;
}

// ── Vehicles ─────────────────────────────────────

export async function fetchVehicles(token, limit = 100) {
  const res = await request('GET', `/vehicles?limit=${limit}`, null, token);
  return res.data;
}

// ── Drivers ──────────────────────────────────────

export async function fetchDrivers(token, limit = 100) {
  const res = await request('GET', `/employees?role=DRIVER&limit=${limit}`, null, token);
  return res.data;
}

// ── Mileage ──────────────────────────────────────

export async function fetchLastOdometer(token, vehicleId) {
  const res = await request('GET', `/mileage/last-odometer/${vehicleId}`, null, token);
  return res.data;
}

export async function submitFuelLog(token, payload) {
  const res = await request('POST', '/mileage/fuel-log', payload, token);
  return res.data;
}

export async function fetchMileageIntervals(token, page = 1, limit = 50) {
  const res = await request(
    'GET',
    `/mileage/intervals?page=${page}&limit=${limit}`,
    null,
    token
  );
  return res;
}

export async function fetchMyFuelLogs(token, driverId, page = 1, limit = 50) {
  const res = await request(
    'GET',
    `/mileage/intervals?driverId=${driverId}&page=${page}&limit=${limit}`,
    null,
    token
  );
  return res;
}

// ── OCR ──────────────────────────────────────────

export async function scanDocument(token, file, docType) {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  });
  formData.append('docType', docType);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);

  let response;

  try {
    response = await fetch(`${API_BASE_URL}/ocr/scan`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError('OCR timed out. Please try again.', 408);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const data = await response.json();

  if (DEBUG) {
    console.log("📄 OCR RESPONSE:", data);
  }

  if (!response.ok) {
    throw new ApiError(data.message || 'OCR failed', response.status);
  }

  return data.data;
}

export async function uploadDocument(token, file, entityId, docType) {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  });
  formData.append('entityType', 'VEHICLE');
  formData.append('entityId', entityId);
  formData.append('docType', docType);

  const response = await fetch(`${API_BASE_URL}/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await response.json();

  if (DEBUG) {
    console.log("📤 UPLOAD RESPONSE:", data);
  }

  if (!response.ok) {
    throw new ApiError(data.message || 'Upload failed', response.status);
  }

  return data.data || data;
}