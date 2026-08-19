/**
 * Demo mock data (UI-only prototype — NO backend).
 * A single coherent source so the wallet balance, trip id, bills, ledger and
 * alerts all line up across screens.
 */

export const driver = {
  name: 'Ramesh Yadav',
  phone: '+91 98220 41188',
  role: 'Driver',
  initials: 'R',
  plate: 'MH 12 AB 3421',
  tripsThisMonth: 6,
  distance: '4,180 km',
};

export const wallet = {
  balance: '₹4,820',
  confirmed: '+₹9,820 confirmed',
  advancesPaid: '−₹5,000 advances',
  pendingCount: 1,
  confirmedCount: 4,
  walletAfterConfirm: '₹6,070',
};

export const activeTrip = {
  id: 'TR-4821',
  status: 'in_transit',
  from: 'Pune',
  to: 'Nagpur',
  stage: 3,
  totalStages: 8,
  stageLabel: 'Loading done',
  next: 'gate out',
  weight: '24.2 t',
  advance: '₹5,000',
};

export const lastRefuel = {
  litres: '42.5 L',
  meta: '2 Aug · Karad',
  amount: '₹4,012',
};

// Wallet · Bills
export const bills = [
  { id: 'b1', category: 'Other', status: 'pending', date: '04 Aug', trip: 'TR-4821', amount: '₹1,250', note: 'Tyre air fill and wheel balance' },
  { id: 'b2', category: 'Toll', status: 'confirmed', date: '03 Aug', by: 'confirmed by owner', amount: '+₹340' },
  {
    id: 'b3', category: 'Food', status: 'rejected', date: '02 Aug', trip: 'TR-4818', amount: '₹210',
    reason: 'Bill photo is blurred, amount not readable. Please re-upload a clear photo.',
  },
];

// Wallet · Ledger (running balance)
export const ledger = [
  { id: 'l1', title: 'Toll bill confirmed', meta: '03 Aug · by Suresh (Owner)', delta: '+₹340', dir: 'credit', balance: '₹4,820' },
  { id: 'l2', title: 'Advance paid', meta: '01 Aug · UPI · ADV-1192', delta: '−₹5,000', dir: 'debit', balance: '₹4,480' },
  { id: 'l3', title: 'Repair bill confirmed', meta: '31 Jul · by Suresh (Owner)', delta: '+₹2,600', dir: 'credit', balance: '₹9,480' },
  { id: 'l4', title: 'Adjustment', meta: '28 Jul · rounding correction', delta: '+₹80', dir: 'credit', balance: '₹6,880' },
];

export const spendByCategory = [
  { label: 'Toll', percent: 72, value: '₹4,220' },
  { label: 'Repair', percent: 44, value: '₹2,600' },
  { label: 'Other', percent: 26, value: '₹1,540' },
];

// My advances
export const advances = [
  {
    id: 'ADV-1192', status: 'paid', meta: '01 Aug · TR-4821', amount: '₹5,000', featured: true,
    requested: '₹5,500', deductions: '−₹500', net: '₹5,000', method: 'UPI · ramesh@okbank · 01 Aug 14:22',
  },
  { id: 'ADV-1174', status: 'approved', meta: '28 Jul · payout scheduled', amount: '₹3,000' },
  { id: 'ADV-1150', status: 'paid', meta: '19 Jul · cash', amount: '₹2,000' },
  { id: 'ADV-1131', status: 'rejected', meta: '11 Jul · limit exceeded', amount: '₹6,000' },
];

// My trips
export const trips = [
  { id: 'TR-4821', status: 'in_transit', from: 'Pune', to: 'Nagpur', meta: '04 Aug · 24.2 t · 3 / 8', tab: 'active', action: 'Open' },
  { id: 'TR-4802', status: 'late', label: 'POD pending', from: 'Nashik', to: 'Indore', meta: '31 Jul · 21.0 t · delivered', tab: 'active', action: 'Upload POD' },
  { id: 'TR-4788', status: 'closed', from: 'Pune', to: 'Surat', meta: '24 Jul · 18.4 t · settled', earning: '₹2,400 earned', tab: 'completed' },
  { id: 'TR-4771', status: 'closed', from: 'Bhiwandi', to: 'Hyderabad', meta: '17 Jul · 25.0 t · settled', earning: '₹3,100 earned', tab: 'completed' },
];

// Alerts
export const alerts = [
  { id: 'a1', tone: 'error', icon: 'close-circle', title: 'Bill rejected', time: '2 h', message: 'Food · ₹210. Photo is blurred, amount not readable.', actionLabel: 'Re-submit bill', group: 'action' },
  { id: 'a2', tone: 'warning', icon: 'document-text', title: 'Licence expiring', time: '1 d', message: 'Expires 12 Sep 2026 · 24 days left.', actionLabel: 'Upload renewal', group: 'action' },
  { id: 'a3', tone: 'warning', icon: 'cloud-upload', title: 'POD pending', time: '3 d', message: 'TR-4802 Nashik → Indore was delivered 31 Jul.', actionLabel: 'Upload POD', group: 'action' },
  { id: 'a4', tone: 'success', icon: 'checkmark-circle', title: 'Toll bill confirmed · +₹340', time: '03 Aug', message: 'Suresh (Owner)', group: 'earlier' },
  { id: 'a5', tone: 'info', icon: 'cube', title: 'New trip assigned · TR-4821', time: '03 Aug', message: 'Pune → Nagpur', group: 'earlier' },
];
export const alertCount = alerts.filter((a) => a.group === 'action').length;

// Vehicle
export const vehicle = {
  plate: 'MH 12 AB 3421',
  spec: 'Tata Signa 4225 · 25 t · 2021',
  odometer: '482,610',
  mileage: '3.8 km/L',
  fastag: '₹2,140',
  papers: [
    { label: 'Insurance', date: '14 Mar 2027', ok: true },
    { label: 'Fitness certificate', date: '02 Nov 2026', ok: true },
    { label: 'PUC', date: '31 Aug 2026', ok: false },
    { label: 'National permit', date: '19 Jan 2027', ok: true },
  ],
  serviceDueKm: '2,390 km',
  servicePercent: 76,
};

export const documents = [
  { id: 'd1', title: 'Driving licence', status: 'expiring', badge: '24 days', meta: 'MH1420110045678 · valid to 12 Sep 2026', ok: false },
  { id: 'd2', title: 'Aadhaar', status: 'verified', meta: 'XXXX XXXX 4412 · no expiry', ok: true },
  { id: 'd3', title: 'PAN card', status: 'verified', meta: 'ABCPY1234K · no expiry', ok: true },
  { id: 'd4', title: 'Police verification', status: 'valid', meta: 'Issued 04 Feb 2026 · valid to 03 Feb 2028', ok: true },
];

export const billCategories = ['Toll', 'Food', 'Parking', 'Repair', 'Loading', 'Other'];

// ── M4: Trips + trip documents ──────────────────────────────
export const tripStages = [
  { title: 'Trip assigned', meta: '03 Aug · 16:20', status: 'done' },
  { title: 'Reported to loading', meta: '03 Aug · 18:40', status: 'done' },
  { title: 'Loading done', meta: '04 Aug · 09:20 · 24.2 t', status: 'current' },
  { title: 'Gate out', meta: '4 stages remaining', status: 'todo' },
  { title: 'In transit', status: 'todo' },
  { title: 'Reached destination', status: 'todo' },
  { title: 'Unloading', status: 'todo' },
  { title: 'POD & close', status: 'todo' },
];

export const tripDetail = {
  id: 'TR-4788',
  route: 'Pune → Surat · 24 Jul',
  status: 'closed',
  timeline: [
    { title: 'Chakan, Pune', meta: '24 Jul · 07:10 · loaded 18.4 t', status: 'done' },
    { title: 'Hazira, Surat', meta: '25 Jul · 16:35 · POD recorded', status: 'done' },
  ],
  summary: [
    { label: 'Distance', value: '612 km' },
    { label: 'Diesel filled', value: '168 L' },
    { label: 'Advance taken', value: '₹4,000' },
    { label: 'Bills confirmed', value: '₹1,880', color: 'success' },
  ],
  earning: '₹2,400',
  docs: [{ label: 'CN', sub: '2 files' }, { label: 'POD', sub: '1 file' }, { label: 'Bills', sub: '4' }],
};

export const consignment = {
  trip: 'TR-4821',
  stage: 'stage 4 of 8',
  consignor: 'Tata Motors, Chakan',
  material: 'Auto components',
  weight: '24.2 t',
  noteNumber: 'CN-2026-08-4471',
  pages: [{ name: 'Page 1', quality: 'ok' }, { name: 'Page 2', quality: 'warn' }],
};

export const pod = {
  trip: 'TR-4802',
  route: 'Nashik → Indore',
  late: '3 days late',
  consignee: 'Reliance Depot, Indore',
  unloaded: '31 Jul · 16:35',
  weight: '21.0 t',
  receiver: 'A. Kulkarni · store in-charge',
};

// ── M8: Owner + Ops (demo) ──────────────────────────────────
export const owner = {
  name: 'Suresh Kulkarni',
  company: 'Kulkarni Transport',
  pendingCount: 12,
  pendingTotal: '₹18,410',
};

export const ownerBills = [
  { id: 'ob1', name: 'Ramesh Yadav', category: 'Other', plate: 'MH 12 AB 3421', date: '04 Aug', desc: 'Tyre air fill and wheel balance', amount: '₹1,250', file: 'JPG' },
  { id: 'ob2', name: 'Imran Shaikh', category: 'Repair', plate: 'GJ 05 CJ 7712', date: '04 Aug', desc: 'Clutch plate replacement, Surat', amount: '₹8,400', file: 'PDF' },
  { id: 'ob3', name: 'Balbir Singh', category: 'Toll', plate: 'PB 11 AK 2290', date: '03 Aug', desc: 'Fastag top-up receipt', amount: '₹2,000', file: 'JPG' },
  { id: 'ob4', name: 'Sunil Patil', category: 'Loading', plate: 'MH 04 EQ 5518', date: '03 Aug', desc: 'Hamali charges, Bhiwandi godown', amount: '₹1,600', file: 'JPG' },
  { id: 'ob5', name: 'Kartar Lal', category: 'Food', plate: 'RJ 14 GD 8043', date: '02 Aug', desc: 'Dhaba meals, two nights halt', amount: '₹740', file: 'JPG' },
];

export const ownerBillDetail = {
  name: 'Ramesh Yadav', plate: 'MH 12 AB 3421', trip: 'TR-4821',
  category: 'Other · Tyre air fill', date: '04 Aug 2026',
  walletAfter: '₹6,070', amount: '₹1,250', file: 'IMG_2381.jpg · 412 KB',
};

export const rejectReasons = ['Photo not readable', 'Amount mismatch', 'Duplicate bill', 'Not company expense'];

export const ownerStats = {
  wallet: 'Owed to drivers', walletValue: '₹1,24,600',
  advances: 'Advances out', advancesValue: '₹42,000',
  trips: 'Active trips', tripsValue: '18',
  fleet: 'Trucks', fleetValue: '24',
};

// ── M7: SOS ─────────────────────────────────────────────────
export const sos = {
  location: 'NH-48, 12 km before Karad',
  time: '17:42',
  options: [
    { key: 'accident', title: 'Accident', desc: 'Alerts owner, ops and the nearest workshop', icon: 'car-sport', tone: 'error' },
    { key: 'breakdown', title: 'Breakdown', desc: 'Truck cannot move · needs mechanic', icon: 'construct', tone: 'warning' },
    { key: 'theft', title: 'Theft or threat', desc: 'Escalates to ops and police helpline', icon: 'shield-half', tone: 'purple' },
    { key: 'medical', title: 'Medical help', desc: 'Ambulance and nearest hospital', icon: 'medkit', tone: 'info' },
  ],
  checklist: [
    { title: 'Owner notified', meta: 'Suresh · 17:42', done: true },
    { title: 'Ops desk acknowledged', meta: 'Priya · 17:44', done: true },
    { title: 'Mechanic being assigned', meta: 'ETA shared once confirmed', done: false },
  ],
};

// ── M6: Repairs ─────────────────────────────────────────────
export const repairs = {
  plate: 'MH 12 AB 3421',
  count: 3,
  spendYear: '₹9,180',
  downtime: '2 days',
  logs: [
    { id: 'r1', title: 'Clutch plate', status: 'in_workshop', amount: '₹8,400', desc: 'Sai Auto Works, Surat · replacement plus labour', meta: '04 Aug · 482,540 km', photos: '2 photos', active: true },
    { id: 'r2', title: 'Tyre rotation', status: 'done', amount: '₹640', desc: 'Highway Tyres, Karad · all six wheels', meta: '18 Jul · 479,120 km', photos: '1 photo' },
    { id: 'r3', title: 'Brake service', status: 'done', amount: '₹140', desc: 'Company workshop, Pune · brake fluid top-up', meta: '02 Jul · 475,880 km', photos: 'No photo' },
  ],
};
export const repairCategories = ['Clutch', 'Brakes', 'Tyres', 'Engine', 'Electrical', 'Body'];

// ── M5: Fuel ────────────────────────────────────────────────
export const fuel = {
  odometer: '482,610',
  litres: '42.5',
  rate: '₹94.40',
  total: '4,012',
  totalFmt: '₹4,012',
  pump: 'Bharat Petroleum, Karad bypass',
  mileage: '4.0',
  fleetAvg: '3.8',
  mileageDelta: 'Up 0.2',
  mileagePercent: 66,
  walletBefore: '₹4,820',
  walletAfter: '₹8,832',
  trend: [
    { label: 'Mar', value: 52 }, { label: 'Apr', value: 44 }, { label: 'May', value: 66 },
    { label: 'Jun', value: 58 }, { label: 'Jul', value: 74 }, { label: 'Aug', value: 88 },
  ],
  kpis: [{ label: 'Litres', value: '168' }, { label: 'Spend', value: '₹15,860' }, { label: 'Fills', value: '4' }],
  history: [
    { litres: '42.5 L', status: 'pending', meta: '04 Aug · Karad · 4.0 km/L', amount: '₹4,012' },
    { litres: '38.0 L', status: 'confirmed', meta: '31 Jul · Dhule · 3.8 km/L', amount: '₹3,586' },
    { litres: '45.0 L', status: 'confirmed', meta: '24 Jul · Surat · 3.7 km/L', amount: '₹4,230' },
  ],
};
