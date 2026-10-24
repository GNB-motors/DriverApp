export function summarizeOwner(data) {
  const vehicles = data?.vehicles || [];
  const fuel = data?.fuel || []; const adblue = data?.adblue || [];
  const total = (rows, key) => rows.reduce((sum, row) => sum + (Number.isFinite(row[key]) ? row[key] : 0), 0);
  return {
    trucks: vehicles.length,
    moving: vehicles.filter((v) => v.status === 'moving').length,
    offline: vehicles.filter((v) => v.status === 'offline').length,
    unlinked: vehicles.filter((v) => !v.driverId).length,
    drivers: data?.drivers.length || 0,
    alerts: data?.alertFeed?.unacknowledgedCount ?? 0,
    critical: data?.alerts.filter((a) => !a.acknowledged && a.severity === 'critical').length || 0,
    issues: data?.issues.filter((item) => item.status !== 'Resolved').length || 0,
    pendingReviews: [...fuel, ...(data?.bills || [])].filter((item) => item.status === 'Pending review').length,
    fuelLitres: total(fuel, 'litres'), fuelAmount: total(fuel, 'amountInr'),
    adblueLitres: total(adblue, 'litres'), adblueAmount: total(adblue, 'amountInr'),
    distanceKm: total(data?.trips || [], 'distanceKm'),
  };
}
