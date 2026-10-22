import client from './client';

/**
 * Auth service — talks to the app auth namespace `/api/app/v1/auth/*`
 * (separate mobile controller on the backend, same underlying AuthService).
 */

/**
 * Log in with email OR mobile + password (all roles: driver / owner / manager).
 * @returns {{ user, token, organization, permissions }}
 */
export async function login(emailOrMobile, password) {
  const res = await client.post('/app/v1/auth/login', { emailOrMobile, password });
  return res.data?.data ?? res.data;
}

/** Current user profile + organization + permissions (validates the token). */
export async function getMe() {
  const res = await client.get('/app/v1/auth/me');
  return res.data?.data ?? res.data;
}

export default { login, getMe };
