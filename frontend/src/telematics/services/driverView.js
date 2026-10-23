// Synthetic driver identity stays separate from the authenticated account.
export const DEMO_DRIVER_ID = 'driver-01';
export const DRIVER_RESOURCES = ['vehicles', 'drivers', 'trips', 'alerts', 'fuel', 'documents', 'issues', 'bills', 'support', 'stops', 'stopNotes'];
export function selectDriverView(records) {
  const driver = records.drivers.find((item) => item.id === DEMO_DRIVER_ID) || null;
  const vehicle = records.vehicles.find((item) => item.driverId === DEMO_DRIVER_ID && item.id === driver?.vehicleId) || null;
  return {
    ...records, driver, vehicle,
    trips: records.trips.filter((item) => item.driverId === DEMO_DRIVER_ID),
    alerts: records.alerts.filter((item) => item.vehicleId === vehicle?.id),
    fuel: records.fuel.filter((item) => item.driverId === DEMO_DRIVER_ID),
    documents: records.documents.filter((item) => item.driverId === DEMO_DRIVER_ID || item.vehicleId === vehicle?.id),
    issues: records.issues.filter((item) => item.driverId === DEMO_DRIVER_ID || item.vehicleId === vehicle?.id),
    bills: records.bills.filter((item) => item.driverId === DEMO_DRIVER_ID),
  };
}
