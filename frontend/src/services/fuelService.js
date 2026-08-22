import client, { postForm } from './client';

/**
 * Fuel + mileage. Backend: /api/fuel-logs, /api/mileage/*, /api/ocr/scan/*.
 */

// Fields the /mileage/fuel-log create endpoint accepts (strict Joi rejects
// unknown keys). `totalAmount` is computed server-side from litres*rate, and
// there is no backend field for `paidBy`, so neither is sent.
const FUEL_LOG_FIELDS = [
  'vehicleId', 'driverId', 'fuelType', 'fillingType',
  'litres', 'rate', 'odometerReading', 'location',
  'routeSource', 'routeDestination', 'refuelTime',
];
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

/**
 * Create a standalone fuel log. `photo` is an RN file part { uri, name, type }
 * (the captured fuel bill); it is uploaded as multipart `fuelPhoto` and stored
 * as the log's FUEL_SLIP document — not dropped into the JSON body.
 */
export async function submitFuelLog({ photo, ...fields } = {}) {
  const fd = new FormData();
  FUEL_LOG_FIELDS.forEach((k) => {
    if (fields[k] != null && fields[k] !== '') fd.append(k, String(fields[k]));
  });
  if (photo) fd.append('fuelPhoto', photo);
  return postForm('/mileage/fuel-log', fd);
}

export default { listFuelLogs, getMileageIntervals, getLastOdometer, submitFuelLog };
