// Synthetic data only. Dates are anchored at creation so freshness is reproducible.
export function createFixtures(now = Date.now()) {
  const ago = (minutes) => new Date(now - minutes * 60000).toISOString();
  return {
    vehicles: [
      { id: 'truck-01', branchId: 'pune', plate: 'MH 12 AB 4821', model: 'Tata Prima 5530.S', status: 'moving', speed: 62, location: 'NH 48 · Near Satara', updatedAt: ago(4), source: 'truck', driverId: 'driver-01', odometerKm: 128460 },
      { id: 'truck-02', branchId: 'pune', plate: 'MH 14 CX 9032', model: 'Ashok Leyland AVTR', status: 'stopped', speed: 0, location: 'Pune transport yard', updatedAt: ago(8), source: 'truck', driverId: 'driver-02', odometerKm: 86420 },
      { id: 'truck-03', branchId: 'mumbai', plate: 'MH 04 JK 2176', model: 'Tata Signa 4825.TK', status: 'offline', speed: null, location: 'Bhiwandi depot', updatedAt: ago(95), source: 'lastKnown', driverId: null, odometerKm: 203810 },
    ],
    drivers: [
      { id: 'driver-01', branchId: 'pune', name: 'Arjun Sharma', initials: 'AS', vehicleId: 'truck-01', state: 'Driving', drivingMinutes: 255, limitMinutes: 540 },
      { id: 'driver-02', branchId: 'pune', name: 'Ravi Kumar', initials: 'RK', vehicleId: 'truck-02', state: 'Resting', drivingMinutes: 180, limitMinutes: 540 },
    ],
    trips: [{ id: 'trip-01', vehicleId: 'truck-01', driverId: 'driver-01', from: 'Pune', to: 'Kolhapur', distanceKm: 232, status: 'In progress', startedAt: ago(255) }],
    alerts: [
      { id: 'alert-01', vehicleId: 'truck-01', severity: 'caution', title: 'Rest stop coming up', description: 'Plan a safe stop before your next driving break.', createdAt: ago(12), acknowledged: false },
      { id: 'alert-02', vehicleId: 'truck-03', severity: 'info', title: 'Truck GPS unavailable', description: 'Last known position is shown. Check the GPS connection.', createdAt: ago(95), acknowledged: false },
    ],
    fuel: [{ id: 'fuel-01', vehicleId: 'truck-01', driverId: 'driver-01', litres: 180, amountInr: 16740, station: 'Highway fuel station', createdAt: ago(140), status: 'Pending review' }],
    bills: [],
    support: [],
    stopNotes: [],
    stops: [{ id: 'stop-01', tripId: 'trip-01', vehicleId: 'truck-01', location: 'Shirwal rest area', durationMinutes: 25, reason: 'Rest break', createdAt: ago(180) }],
    documents: [{ id: 'doc-personal', driverId: 'driver-01', title: 'Driving licence', status: 'Valid', expiresAt: new Date(now + 240 * 86400000).toISOString() }, { id: 'doc-01', vehicleId: 'truck-01', title: 'Vehicle insurance', status: 'Valid', expiresAt: new Date(now + 120 * 86400000).toISOString() }],
    issues: [{ id: 'issue-01', vehicleId: 'truck-02', title: 'Left headlight needs attention', status: 'Open', createdAt: ago(60) }],
  };
}

export const DEMO_SCENARIOS = ['ready', 'loading', 'empty', 'error', 'staleGps', 'phoneFallback', 'unassigned'];


export const DEMO_BRANCHES = [{ id: 'pune', name: 'Pune' }, { id: 'mumbai', name: 'Mumbai' }];
export function createManagerFixtures(now = Date.now()) {
  const data = createFixtures(now);
  data.vehicles[0].coordinates = { latitude: 17.68, longitude: 74.01 };
  data.vehicles[1].coordinates = { latitude: 18.52, longitude: 73.86 };
  data.vehicles[2].coordinates = { latitude: 19.30, longitude: 73.06 };
  data.vehicles[2].driverId = 'driver-03';
  data.vehicles.push(
    { id: 'truck-04', branchId: 'mumbai', plate: 'MH 43 PQ 6084', model: 'BharatBenz 2823C', status: 'idling', speed: 0, location: 'Navi Mumbai loading yard', updatedAt: new Date(now - 6 * 60000).toISOString(), source: 'truck', driverId: null, odometerKm: 74210, coordinates: { latitude: 19.03, longitude: 73.02 } },
    { id: 'truck-05', branchId: 'pune', plate: 'MH 12 RT 3190', model: 'Tata Signa 3523.TK', status: 'stopped', speed: 0, location: 'Pune service yard', updatedAt: new Date(now - 9 * 60000).toISOString(), source: 'truck', driverId: null, odometerKm: 112340, coordinates: { latitude: 18.46, longitude: 73.91 } },
  );
  data.drivers.push({ id: 'driver-03', branchId: 'mumbai', name: 'Imran Shaikh', initials: 'IS', vehicleId: 'truck-03', state: 'Resting', drivingMinutes: 310, limitMinutes: 540 });
  data.alerts.push({ id: 'alert-03', vehicleId: 'truck-02', severity: 'critical', title: 'Workshop attention required', description: 'Sample headlight issue needs review before the next journey.', createdAt: new Date(now - 20 * 60000).toISOString(), acknowledged: false });
  data.fuel.push({ id: 'fuel-02', vehicleId: 'truck-03', driverId: 'driver-03', litres: 120, amountInr: 11220, station: 'Bhiwandi fuel station', createdAt: new Date(now - 180 * 60000).toISOString(), status: 'Pending review' });
  data.bills.push({ id: 'bill-01', vehicleId: 'truck-02', driverId: 'driver-02', title: 'Headlight assembly replacement', amountInr: 2450, evidence: 'sample-image-only', createdAt: new Date(now - 60 * 60000).toISOString(), status: 'Pending review' });
  data.issues.push({ id: 'issue-02', vehicleId: 'truck-03', title: 'GPS connection inspection', status: 'Open', createdAt: new Date(now - 90 * 60000).toISOString() });
  data.documents.push({ id: 'doc-02', vehicleId: 'truck-03', title: 'Pollution certificate', status: 'Expiring soon', expiresAt: new Date(now + 12 * 86400000).toISOString() });
  data.adblue = [
    { id: 'def-01', vehicleId: 'truck-01', litres: 18, amountInr: 1170, createdAt: new Date(now - 140 * 60000).toISOString() },
    { id: 'def-02', vehicleId: 'truck-03', litres: 12, amountInr: 780, createdAt: new Date(now - 180 * 60000).toISOString() },
  ];
  return data;
}
