// Navigation choice only; server authorization remains independent.
export function selectAppShell(user) {
  if (!user) return 'login';
  if (user.role === 'FIELD_AGENT') return 'field-agent';
  const shells = { DRIVER: 'driver', MANAGER: 'manager', OWNER: 'owner' };
  if (!Object.prototype.hasOwnProperty.call(shells, user.role)) return 'unsupported';
  return shells[user.role];
}
