import axios from 'axios';

/**
 * Central API client — the single place base URL, headers and error handling
 * are configured. Every feature service (authService, billService, …) imports
 * this `client`; none of them re-configure axios.
 *
 * Base URL comes from env: EXPO_PUBLIC_API_URL (e.g. https://host/v1). All
 * backend paths live under `/api`, so the instance baseURL is `<env>/api` and
 * services call paths like `/app/v1/auth/login`.
 */
const RAW = (process.env.EXPO_PUBLIC_API_URL || '').trim().replace(/\/+$/, '');
export const API_BASE = RAW ? `${RAW}/api` : '';

/** True when a backend URL is configured; false → app runs on demo fallback. */
export const apiConfigured = () => !!RAW;

// In-memory session used by the request interceptor (set by AuthContext on
// login / session-restore / logout). Kept in sync with persisted storage there.
let session = { token: null, orgId: null, branchId: null };
export const setSession = (patch) => { session = { ...session, ...patch }; };
export const clearSession = () => { session = { token: null, orgId: null, branchId: null }; };

let onUnauthorized = null;
/** Register a callback fired on any 401 (AuthContext wires this to logout). */
export const setOnUnauthorized = (fn) => { onUnauthorized = fn; };

const client = axios.create({
  baseURL: API_BASE || undefined,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach auth + tenant headers on every request.
client.interceptors.request.use((config) => {
  if (session.token) config.headers.Authorization = `Bearer ${session.token}`;
  if (session.orgId && !config.headers['X-Org-Id']) config.headers['X-Org-Id'] = session.orgId;
  if (session.branchId && !config.headers['X-Branch-Id']) config.headers['X-Branch-Id'] = session.branchId;
  return config;
});

// Normalise errors to `Error(message){status,data,code,userMessage}` and fire
// the 401 hook.
client.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    if (status === 401 && onUnauthorized) onUnauthorized();

    // No response at all, or an axios network/timeout code → the request never
    // reached the server (offline, DNS, TLS, timed out). axios uses
    // 'ERR_NETWORK' for connection failures and 'ECONNABORTED' for timeouts.
    const isNetworkError =
      !error.response ||
      error.code === 'ERR_NETWORK' ||
      error.code === 'ECONNABORTED';

    const friendly = "Can't reach the server. Check your connection.";

    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      (isNetworkError ? friendly : null) ||
      error.message ||
      'Something went wrong';

    const normalised = Object.assign(new Error(message), {
      status,
      data: error.response?.data,
      code: error.code,
      // Always safe to show to the user; friendly copy for network/timeouts.
      userMessage: isNetworkError ? friendly : message,
    });
    return Promise.reject(normalised);
  },
);

/**
 * Multipart POST helper for file uploads (fuel receipt, CN pages, POD, docs).
 * Pass a FormData; RN needs the multipart Content-Type set explicitly.
 * File parts look like: fd.append('file', { uri, name, type }).
 *
 * Pass `config.onUploadProgress` (an axios ProgressEvent handler) to drive an
 * upload progress UI:
 *   postForm('/docs', fd, { onUploadProgress: (e) => setPct(e.progress) });
 */
export async function postForm(path, formData, config = {}) {
  const { onUploadProgress, ...rest } = config;
  const res = await client.post(path, formData, {
    ...rest,
    headers: { ...(rest.headers || {}), 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
    ...(onUploadProgress ? { onUploadProgress } : {}),
  });
  return res.data?.data ?? res.data;
}

export default client;
