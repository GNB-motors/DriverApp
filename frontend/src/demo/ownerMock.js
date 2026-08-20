/** Owner demo data (UI-only). Companion to mock.js. See managerMock.js for Ops. */

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
