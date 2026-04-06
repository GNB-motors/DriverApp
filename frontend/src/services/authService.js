/**
 * Auth service — login / OTP flows
 */
import { request } from './api';

export async function requestDriverOtp(mobileNumber) {
  return request('POST', '/auth/driver/request-otp', { mobileNumber });
}

export async function verifyDriverOtp(mobileNumber, otp) {
  const res = await request('POST', '/auth/driver/verify-otp', { mobileNumber, otp });
  return res.data; // { user, token, organization }
}
