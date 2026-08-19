/** Owner + Ops demo data (UI-only). Companion to mock.js. */

// ── O4 Owner dashboard ──
export const ownerDashboard = {
  name: 'Suresh Patil', company: 'Sahayak Roadlines',
  needs: { bills: '12 bills', waiting: '₹18,410 waiting for confirmation', items: '4 items', advances: '3 advance requests', pods: '2 PODs to review' },
  stats: [
    { label: 'Trucks running', value: '14', sub: 'of 18' },
    { label: 'Idle over 24 h', value: '3', sub: 'trucks', color: 'warning' },
    { label: 'Owed to drivers', value: '₹64,280' },
    { label: 'Receivable', value: '₹4.2 L' },
  ],
  fleetNow: [
    { label: 'In transit', percent: 78, count: '14', color: '#4469F0' },
    { label: 'Loading', percent: 12, count: '2', color: '#6D8AF3' },
    { label: 'Workshop', percent: 10, count: '2', color: '#F0AA48' },
  ],
  week: ['9 trips closed', '₹1.84 L fuel spend', '₹42,180 bills confirmed'],
};

// ── O5 Money ──
export const ownerMoney = {
  owed: '₹64,280', drivers: 'across 11 drivers', confirmed: 'Confirmed bills ₹52,410', adjustments: 'Adjustments ₹11,870',
  list: [
    { initials: 'RY', name: 'Ramesh Yadav', meta: '1 pending · last settled 19 Jul', amount: '₹6,070' },
    { initials: 'IS', name: 'Imran Shaikh', meta: '2 pending · last settled 02 Aug', amount: '₹12,940' },
    { initials: 'BS', name: 'Balbir Singh', meta: '1 pending · last settled 28 Jul', amount: '₹8,310' },
    { initials: 'KL', name: 'Kartar Lal', meta: '1 pending · last settled 11 Aug', amount: '₹3,480' },
  ],
};

// ── O6 Driver account ──
export const ownerDriver = {
  name: 'Ramesh Yadav', plate: 'MH 12 AB 3421 · since Mar 2023', owe: '₹6,070',
  breakdown: [
    { label: 'Confirmed bills', value: '+₹9,820', color: 'success' },
    { label: 'Advances paid', value: '−₹5,000', color: 'error' },
    { label: 'Pending confirmation', value: '₹1,250', color: 'warning' },
  ],
  ledger: [
    { title: 'Toll bill confirmed', meta: '03 Aug · by you', delta: '+₹340', dir: 'credit', balance: '₹4,820' },
    { title: 'Advance paid', meta: '01 Aug · UPI · ADV-1192', delta: '−₹5,000', dir: 'debit', balance: '₹4,480' },
    { title: 'Repair bill confirmed', meta: '31 Jul · by you', delta: '+₹2,600', dir: 'credit', balance: '₹9,480' },
  ],
};

// ── O7 Sale bills ──
export const saleBills = [
  { id: 'INV-2026-118', status: 'overdue', badge: '42 days late', amount: '₹1,84,000', customer: 'Reliance Depot, Indore', meta: '4 trips · Jun–Jul' },
  { id: 'INV-2026-131', status: 'pending', badge: 'Due in 6 d', amount: '₹1,42,500', customer: 'Tata Motors, Chakan', meta: '3 trips · Aug' },
  { id: 'INV-2026-134', status: 'in_transit', badge: 'Sent', amount: '₹93,200', customer: 'Ultratech, Solapur', meta: '2 trips · Aug' },
  { id: 'INV-2026-127', status: 'paid', badge: 'Paid', amount: '₹76,400', customer: 'JSW Steel, Dolvi', meta: 'Received 09 Aug · RTGS' },
];

// ── O8 Fleet ──
export const fleet = [
  { plate: 'MH 12 AB 3421', status: 'in_transit', badge: 'In transit', route: ['Pune', 'Nagpur'], driver: 'Ramesh Yadav · 3/8', metric: '3.8 km/L' },
  { plate: 'GJ 05 CJ 7712', status: 'pending', badge: 'Workshop', route: ['Surat', 'clutch plate, 2 days'], driver: 'Imran Shaikh · idle 28 h', metric: '₹8,400 bill', metricColor: 'warning' },
  { plate: 'PB 11 AK 2290', status: 'in_transit', badge: 'In transit', route: ['Ludhiana', 'Delhi'], driver: 'Balbir Singh · 6/8', metric: '4.1 km/L' },
  { plate: 'RJ 14 GD 8043', status: 'neutral', badge: 'Idle', route: ['Jaipur yard', 'awaiting load'], driver: 'Kartar Lal · idle 41 h', action: 'Assign trip' },
];

// ── O9 ERP overview ──
export const erp = {
  margin: '₹6.84 L', marginPct: '22.4%', delta: 'Up 4 pts', revenue: 'Revenue ₹30.5 L', cost: 'Cost ₹23.7 L',
  months: [{ label: 'Feb', value: 46 }, { label: 'Mar', value: 58 }, { label: 'Apr', value: 42 }, { label: 'May', value: 64 }, { label: 'Jun', value: 72 }, { label: 'Jul', value: 90 }],
  costBreak: [{ label: 'Diesel', percent: 74, value: '₹17.6 L', color: '#4469F0' }, { label: 'Driver', percent: 16, value: '₹3.8 L', color: '#6D8AF3' }, { label: 'Repairs', percent: 9, value: '₹2.3 L', color: '#829BF5' }],
  perUnit: [{ value: '₹18,300', label: 'margin per trip' }, { value: '₹38.60', label: 'cost per km' }, { value: '3.9 km/L', label: 'mileage' }, { value: '78%', label: 'utilisation', color: 'success' }],
};

// ── O10 Company ledger ──
export const companyLedger = {
  closing: '₹8,42,160', moneyIn: 'In ₹14.2 L', moneyOut: 'Out ₹9.6 L',
  week: [
    { title: 'Customer payment', meta: '18 Aug · JSW Steel · RTGS', delta: '+₹76,400', dir: 'credit', balance: '₹8,42,160' },
    { title: 'Driver settlement', meta: '17 Aug · Kartar Lal', delta: '−₹3,480', dir: 'debit', balance: '₹7,65,760' },
    { title: 'Fuel spend', meta: '16 Aug · 4 fills', delta: '−₹15,860', dir: 'debit', balance: '₹7,69,240' },
    { title: 'Freight invoiced', meta: '14 Aug · INV-2026-134', delta: '+₹93,200', dir: 'credit', balance: '₹7,85,100' },
  ],
  earlier: [{ title: 'Repair paid', meta: '09 Aug · Sai Auto Works', delta: '−₹8,400', dir: 'debit', balance: '₹6,94,900' }],
};

// ── M1 Ops home ──
export const opsHome = {
  name: 'Priya Deshmukh', desk: 'Ops desk · Pune hub', shift: '06–14',
  blocked: { trips: '3 trips', caption: 'waiting on a document or approval', items: '7 items', inline: ['3 advances', '2 PODs', '2 CNs'] },
  stats: [
    { label: 'Loads to place', value: '5' },
    { label: 'Trucks free', value: '4', sub: 'of 18' },
    { label: 'Running late', value: '2 trips', color: 'warning' },
    { label: 'Closed today', value: '3 trips' },
  ],
  decisions: [
    { icon: 'wallet', tone: 'warning', title: '3 advance requests', meta: '₹9,500 asked for today', to: 'OpsAdvances' },
    { icon: 'cloud-upload', tone: 'error', title: '2 PODs to review', meta: 'TR-4802 is 3 days late', to: 'OpsApprovals' },
  ],
};

// ── M2 Trips board ──
export const opsTrips = [
  { id: 'TR-4802', status: 'error', badge: 'POD 3 d late', route: ['Nashik', 'Indore'], foot: 'Imran Shaikh · delivered 31 Jul', action: 'Chase POD', actionTone: 'error' },
  { id: 'TR-4821', status: 'pending', badge: 'CN pending', route: ['Pune', 'Nagpur'], foot: 'Ramesh Yadav · stage 3/8', action: 'Open', actionTone: 'primary' },
  { id: 'TR-4818', status: 'in_transit', badge: 'In transit', route: ['Ludhiana', 'Delhi'], foot: 'Balbir Singh · stage 6/8', meta: 'ETA 19:30' },
  { id: 'TR-4816', status: 'in_transit', badge: 'In transit', route: ['Bhiwandi', 'Hyderabad'], foot: 'Kartar Lal · stage 4/8', meta: '2 h behind', metaColor: 'warning' },
];

// ── M3 Trip detail ops ──
export const opsTripDetail = {
  id: 'TR-4821', route: 'Pune → Nagpur · MH 12 AB 3421', stage: '3/8',
  driver: { initials: 'RY', name: 'Ramesh Yadav', phone: '+91 98220 41188 · on duty' },
  stages: [
    { title: 'Reached loading point', meta: '04 Aug · 05:55', status: 'done' },
    { title: 'Loading done · 24.2 t', meta: '04 Aug · 09:20', status: 'current' },
    { title: 'Gate out · blocked on CN', status: 'todo' },
  ],
  paperwork: [
    { label: 'Consignment note', status: 'pending', badge: 'Pending' },
    { label: 'E-way bill', status: 'confirmed', badge: 'On file' },
    { label: 'POD', status: 'neutral', badge: 'Not due' },
  ],
  money: [
    { label: 'Advance paid', value: '₹5,000' },
    { label: 'Bills raised', value: '₹1,250 pending', color: 'warning' },
    { label: 'Freight', value: '₹48,000' },
  ],
};

// ── M4 Approvals ──
export const opsApprovals = {
  featured: { title: 'Advance', badge: '2 d old', name: 'Imran Shaikh · TR-4802', amount: '₹4,000', desc: 'Diesel and toll for the return leg. Limit left this month ₹6,000.' },
  rows: [
    { icon: 'document', tone: 'error', title: 'POD review', badge: '3 d late', meta: 'TR-4802 · Reliance Depot' },
    { icon: 'document-text', tone: 'warning', title: 'Consignment note', badge: 'Blocking', meta: 'TR-4821 · gate out held' },
    { icon: 'construct', tone: 'info', title: 'Repair estimate', badge: 'New', meta: 'GJ 05 CJ 7712 · ₹8,400' },
  ],
};

// ── M5 Loads ──
export const opsLoads = {
  primary: {
    id: 'DO-2026-0912', badge: 'Pickup today', route: ['Chakan', 'Hyderabad'],
    facts: [['Material', 'Auto parts'], ['Weight', '22 t'], ['Freight', '₹52,000']],
    trucks: [
      { plate: 'RJ 14 GD 8043', meta: 'Kartar Lal · free 41 h · 24 km away', selected: true },
      { plate: 'MH 04 EQ 5518', meta: 'no driver · 62 km away', selected: false },
    ],
  },
  secondary: { id: 'DO-2026-0913', badge: 'Tomorrow', route: ['Bhiwandi', 'Surat'], meta: 'Cement · 25 t · ₹31,000' },
};

// ── M6 Close trip ──
export const opsClose = {
  id: 'TR-4788', route: 'Pune → Surat · 24 Jul',
  checklist: [
    { label: 'POD on file', meta: '1 page' },
    { label: 'All bills confirmed', meta: '4 bills' },
    { label: 'Sale bill raised', meta: 'INV-2026-127' },
  ],
  account: [
    { label: 'Freight billed', value: '₹76,400' },
    { label: 'Diesel', value: '−₹15,860', color: 'error' },
    { label: 'Driver bills', value: '−₹1,880', color: 'error' },
    { label: 'Driver earning', value: '−₹2,400', color: 'error' },
  ],
  margin: '₹56,260', km: '612 km',
};

// ── M7 Unloading ──
export const opsUnload = {
  id: 'TR-4788', place: 'Hazira, Surat',
  weight: { loaded: '18.40 t', received: '18.28 t', short: '−0.12 t', tolerance: 'No · 0.65%' },
  details: [['Started', '25 Jul · 14:10'], ['Finished', '25 Jul · 16:35'], ['Detention', '2 h 25 m · free'], ['Received by', 'A. Kulkarni']],
  evidence: ['Weighbridge', 'Signed POD', 'Cargo'],
  remark: 'Two cartons short on count, noted on the POD and countersigned by the driver.',
};

// ── M8 Delivery order ──
export const opsDo = {
  id: 'DO-2026-0912', route: 'Chakan → Hyderabad · pickup today',
  stops: [
    { place: 'Tata Motors, Chakan', meta: 'Pickup 20 Aug · 06:00–10:00', status: 'done' },
    { place: 'Depot, Hyderabad', meta: 'Deliver by 22 Aug · 18:00', status: 'current' },
  ],
  km: '712 km',
  load: [['Auto components', 'material'], ['22 t', 'weight'], ['₹52,000', 'freight'], ['₹2,364 / t', 'rate']],
};

// ── M9 Placements ──
export const placements = {
  stats: [{ label: 'On time', value: '8', color: 'success' }, { label: 'Late', value: '3', color: 'warning' }, { label: 'Failed', value: '2', color: 'error' }],
  today: [
    { id: 'DO-2026-0912', status: 'confirmed', badge: 'On time', route: 'Chakan → Hyderabad', meta: 'RJ 14 GD 8043 · Kartar Lal', right: '09:12' },
    { id: 'DO-2026-0908', status: 'confirmed', badge: 'On time', route: 'Pune → Nagpur', meta: 'MH 12 AB 3421 · Ramesh Yadav', right: '06:40' },
  ],
  yesterday: [
    { id: 'DO-2026-0905', status: 'error', badge: 'Failed', route: 'Bhiwandi → Surat', meta: 'GJ 05 CJ 7712 · Imran Shaikh', right: 'no truck' },
    { id: 'DO-2026-0901', status: 'pending', badge: 'Late', route: 'Ludhiana → Delhi', meta: 'PB 11 AK 2290 · Balbir Singh', right: '+4 h' },
  ],
};

// ── M10 Advances ──
export const opsAdvances = {
  out: '₹42,000', limit: 'limit ₹60,000', percent: 70,
  waiting: [
    { initials: 'IS', id: 'ADV-1198', status: 'pending', badge: 'Pending', meta: 'Imran Shaikh · TR-4802 · 2 d old', amount: '₹4,000' },
    { initials: 'KL', id: 'ADV-1197', status: 'pending', badge: 'Pending', meta: 'Kartar Lal · DO-0912 · 1 d old', amount: '₹3,500' },
    { initials: 'BS', id: 'ADV-1196', status: 'pending', badge: 'Pending', meta: 'Balbir Singh · TR-4818 · today', amount: '₹2,000' },
  ],
  recent: [
    { initials: 'RY', id: 'ADV-1192', status: 'paid', badge: 'Paid', meta: 'Ramesh Yadav · UPI · 01 Aug', amount: '₹5,000' },
    { initials: 'IS', id: 'ADV-1174', status: 'in_transit', badge: 'Approved', meta: 'Imran Shaikh · payout queued', amount: '₹3,000' },
    { initials: 'KL', id: 'ADV-1131', status: 'error', badge: 'Rejected', meta: 'Kartar Lal · limit exceeded', amount: '₹6,000', strike: true },
  ],
};
