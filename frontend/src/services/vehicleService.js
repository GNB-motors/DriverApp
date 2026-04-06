/**
 * Vehicle service — used by RefuelDetailsScreen
 */
import { request } from './api';

export async function fetchVehicles(token, limit = 100) {
  const res = await request('GET', `/vehicles?limit=${limit}`, null, token);
  return res.data; // array of { _id, registrationNumber, vehicleType, ... }
}
