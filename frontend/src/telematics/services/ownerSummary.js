const fields = ['trucks', 'moving', 'offline', 'unknown', 'unlinked', 'drivers', 'issues', 'pendingReviews', 'fuelLitres', 'fuelAmount', 'adblueLitres', 'adblueAmount', 'distanceKm'];
export function summarizeOwner(data) {
  const summary = Object.fromEntries(fields.map((key) => [key, data?.summary?.[key] ?? '—']));
  return { ...summary, alerts: data?.alertFeed?.unacknowledgedCount ?? '—', critical: data?.errors?.alerts || !data?.alertFeed ? '—' : data.alerts.filter((a) => !a.acknowledged && a.severity === 'critical').length, from: data?.summary?.from, to: data?.summary?.to };
}
