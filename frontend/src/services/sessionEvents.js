let onExpired = null;
export function subscribeSessionExpiry(listener) {
  onExpired = listener;
  return () => { if (onExpired === listener) onExpired = null; };
}
export function notifySessionExpired(token) { onExpired?.(token); }
