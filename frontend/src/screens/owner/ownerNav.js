/** Sidebar navigation config for the Owner + Ops demo surface. */
export const OWNER_NAV = [
  {
    group: 'Owner',
    items: [
      { key: 'OwnerApprovals', label: 'Approvals', icon: 'checkmark-done-outline', badge: 12 },
      { key: 'OwnerDashboard', label: 'Dashboard', icon: 'grid-outline' },
      { key: 'OwnerMoney', label: 'Money', icon: 'cash-outline' },
      { key: 'OwnerDriver', label: 'Drivers', icon: 'people-outline' },
      { key: 'OwnerSaleBills', label: 'Sale bills', icon: 'document-text-outline' },
      { key: 'OwnerFleet', label: 'Fleet', icon: 'bus-outline' },
      { key: 'OwnerErp', label: 'ERP overview', icon: 'analytics-outline' },
      { key: 'OwnerLedger', label: 'Company ledger', icon: 'book-outline' },
    ],
  },
  {
    group: 'Ops',
    items: [
      { key: 'OpsHome', label: 'Ops home', icon: 'home-outline' },
      { key: 'OpsTrips', label: 'Trips board', icon: 'navigate-outline' },
      { key: 'OpsApprovals', label: 'Approvals', icon: 'checkmark-circle-outline' },
      { key: 'OpsLoads', label: 'Loads', icon: 'cube-outline' },
      { key: 'OpsPlacements', label: 'Placements', icon: 'swap-horizontal-outline' },
      { key: 'OpsAdvances', label: 'Advances', icon: 'wallet-outline' },
    ],
  },
];
