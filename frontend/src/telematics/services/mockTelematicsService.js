import { createFixtures, createManagerFixtures, DEMO_SCENARIOS } from '../data/fixtures.js';

// One service per authenticated identity. Never imports the API client or location SDK.
export function createMockTelematicsService({ identity, now = Date.now(), delayMs = 250, audience = 'driver' } = {}) {
  if (!identity) throw new Error('A demo session identity is required');
  const seed = () => ['manager', 'owner'].includes(audience) ? createManagerFixtures(now) : createFixtures(now);
  let data = seed();
  let scenario = 'ready';
  let disposed = false;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  async function request(action) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    if (disposed) throw new Error('Demo session has ended');
    if (scenario === 'error') throw new Error('Demo connection interrupted. Try again.');
    return clone(action());
  }
  function vehicleView(vehicle) {
    if (scenario === 'staleGps') return { ...vehicle, source: 'lastKnown', status: 'offline', speed: null, updatedAt: new Date(now - 95 * 60000).toISOString() };
    if (scenario === 'phoneFallback') return { ...vehicle, source: 'phone', updatedAt: new Date(now - 2 * 60000).toISOString() };
    if (scenario === 'unassigned' && vehicle.driverId === 'driver-01') return { ...vehicle, driverId: null };
    return vehicle;
  }
  return {
    setScenario(value) {
      if (!DEMO_SCENARIOS.includes(value)) throw new Error('Unknown demo scenario');
      scenario = value;
    },
    list(resource, { branchId } = {}) {
      return request(() => {
        if (!Array.isArray(data[resource])) throw new Error('Unknown demo resource');
        if (scenario === 'empty') return [];
        const vehicles = data.vehicles.filter((v) => !branchId || v.branchId === branchId);
        const allowedVehicles = new Set(vehicles.map((v) => v.id));
        const allowedDrivers = new Set(data.drivers.filter((d) => !branchId || d.branchId === branchId).map((d) => d.id));
        let rows = data[resource].filter((row) => !branchId || row.branchId === branchId || allowedVehicles.has(row.vehicleId) || (!row.vehicleId && allowedDrivers.has(row.driverId)));
        if (resource === 'vehicles') rows = vehicles.map(vehicleView);
        if (resource === 'drivers' && scenario === 'unassigned') rows = rows.map((d) => d.id === 'driver-01' ? { ...d, vehicleId: null } : d);
        return rows;
      });
    },
    acknowledgeAlert(id, { branchId } = {}) {
      return request(() => {
        const alert = data.alerts.find((item) => item.id === id);
        if (!alert || (branchId && !data.vehicles.some((v) => v.id === alert.vehicleId && v.branchId === branchId))) throw new Error('Demo alert not found in this branch');
        alert.acknowledged = true;
        return alert;
      });
    },
    assignTruck(driverId, vehicleId) {
      return request(() => {
        const driver = data.drivers.find((item) => item.id === driverId);
        const vehicle = data.vehicles.find((item) => item.id === vehicleId);
        if (!driver || !vehicle) throw new Error('Demo driver or truck not found');
        if (vehicle.driverId && vehicle.driverId !== driverId) throw new Error('This demo truck is already assigned');
        data.vehicles.forEach((item) => { if (item.driverId === driverId) item.driverId = null; });
        vehicle.driverId = driverId;
        driver.vehicleId = vehicleId;
        scenario = 'ready';
        return vehicle;
      });
    },
    submit(resource, values) {
      return request(() => {
        if (!['fuel', 'issues', 'bills', 'support', 'stopNotes'].includes(resource)) throw new Error('Unsupported demo submission');
        const vehicle = data.vehicles.find((item) => item.id === values.vehicleId);
        if (resource !== 'support' && !vehicle) throw new Error('Choose a demo truck');
        if (resource === 'fuel' && (!Number.isFinite(values.litres) || !Number.isFinite(values.amountInr) || !(values.litres > 0) || !(values.amountInr > 0))) throw new Error('Enter a positive fuel quantity and amount');
        if (['issues', 'support', 'bills', 'stopNotes'].includes(resource) && !values.title?.trim()) throw new Error('Add a description');
        if (resource === 'bills' && (!Number.isFinite(values.amountInr) || values.amountInr <= 0)) throw new Error('Enter a positive bill amount');
        if (resource === 'bills' && !values.evidence) throw new Error('Attach the sample workshop bill');
        if (resource === 'stopNotes' && !data.stops.some((stop) => stop.id === values.stopId && stop.vehicleId === values.vehicleId)) throw new Error('Choose a valid demo stop');
        const record = { ...values, id: `${resource}-${data[resource].length + 1}`, createdAt: new Date(now).toISOString(), status: ['fuel', 'bills'].includes(resource) ? 'Pending review' : 'Open' };
        data[resource].push(record);
        return record;
      });
    },
    handoverTruck(driverId, vehicleId, { branchId, confirmDisplacement = false } = {}) {
      return request(() => {
        const driver = data.drivers.find((item) => item.id === driverId && (item.branchId === branchId || (!branchId && audience === 'owner')));
        const vehicle = data.vehicles.find((item) => item.id === vehicleId && (item.branchId === branchId || (!branchId && audience === 'owner')));
        if (!driver || !vehicle || driver.branchId !== vehicle.branchId) throw new Error('Choose a driver and truck from the same demo branch');
        const displaced = vehicle.driverId && vehicle.driverId !== driverId ? data.drivers.find((item) => item.id === vehicle.driverId) : null;
        if (displaced && !confirmDisplacement) throw new Error('Confirm the handover to unlink the current driver');
        data.vehicles.forEach((item) => { if (item.driverId === driverId) item.driverId = null; });
        if (displaced) displaced.vehicleId = null;
        vehicle.driverId = driverId; driver.vehicleId = vehicleId;
        scenario = 'ready';
        return { vehicle, displacedDriverId: displaced?.id || null };
      });
    },
    review(resource, id, status, { branchId, note = '' } = {}) {
      return request(() => {
        const statuses = { fuel: ['Approved', 'Rejected'], bills: ['Approved', 'Rejected'], issues: ['In progress', 'Resolved'] };
        if (!statuses[resource]?.includes(status)) throw new Error('Invalid demo review action');
        const item = data[resource].find((row) => row.id === id);
        if (!item || !data.vehicles.some((v) => v.id === item.vehicleId && (v.branchId === branchId || (!branchId && audience === 'owner')))) throw new Error('Record not found in this demo branch');
        if (resource !== 'issues' && item.status !== 'Pending review') throw new Error('This sample record has already been reviewed');
        if (resource === 'issues' && (item.status === 'Resolved' || (item.status === 'In progress' && status === 'In progress'))) throw new Error('This issue already has that status or is resolved');
        if (status === 'Rejected' && !note.trim()) throw new Error('Add a reason for rejection');
        item.status = status; item.reviewNote = note.trim();
        return item;
      });
    },
    reset() { data = seed(); scenario = 'ready'; },
    dispose() { disposed = true; data = {}; },
  };
}
