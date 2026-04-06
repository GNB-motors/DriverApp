/**
 * Mileage service — odometer check, fuel log submission, history
 */
import { request } from './api';

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
