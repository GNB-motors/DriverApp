export function appLoginUrl(base) {
  if (!base) throw new Error('Configure EXPO_PUBLIC_API_URL before signing in.');
  const url = new URL(base);
  url.search = ''; url.hash = '';
  const root = url.pathname.replace(/\/+$/, '').replace(/\/app\/v1$/, '');
  url.pathname = `${root.endsWith('/api') ? root : `${root}/api`}/app/v1/auth/login`;
  return url.toString();
}
