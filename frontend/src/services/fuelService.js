import client from './client';

/**
 * Fuel + mileage. Backend: /api/fuel-logs, /api/mileage/*, /api/ocr/scan/*.
 */
export async function listFuelLogs(params = {}) {
  const res = await client.get('/fuel-logs', { params });
  return res.data?.data ?? res.data;
}

export async function getMileageIntervals(params = {}) {
  const res = await client.get('/mileage/intervals', { params });
  return res.data?.data ?? res.data;
}

export async function getLastOdometer(vehicleId) {
  const res = await client.get(`/mileage/last-odometer/${vehicleId}`);
  return res.data?.data ?? res.data;
}

export async function submitFuelLog(payload) {
  const res = await client.post('/mileage/fuel-log', payload);
  return res.data?.data ?? res.data;
}

export default { listFuelLogs, getMileageIntervals, getLastOdometer, submitFuelLog };
