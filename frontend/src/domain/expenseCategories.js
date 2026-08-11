/**
 * expenseCategories.js
 *
 * The expense category enum, transcribed from the backend's
 * `expense.validation.js` CATEGORIES list. Sending anything not in this list is
 * a hard 400 — the validator runs without stripUnknown.
 *
 * Only the categories a driver can plausibly incur on the road are offered in
 * the app's picker (`DRIVER_CATEGORIES`); the payroll and compliance ones
 * (DRIVER_SALARY, INSURANCE, PERMIT…) are office entries. The full list is
 * still exported so any category coming back from the server renders with a
 * proper label and icon rather than a raw enum string.
 */

export const EXPENSE_CATEGORIES = [
  'FUEL',
  'TOLL',
  'MAINTENANCE',
  'REPAIR',
  'DRIVER_SALARY',
  'DRIVER_ALLOWANCE',
  'DRIVER_MEAL',
  'INSURANCE',
  'PERMIT',
  'FINE',
  'TYRE',
  'LOADING_UNLOADING',
  'MISCELLANEOUS',
];

/** What a driver can log from the road. */
export const DRIVER_CATEGORIES = [
  'FUEL',
  'TOLL',
  'DRIVER_MEAL',
  'REPAIR',
  'TYRE',
  'LOADING_UNLOADING',
  'FINE',
  'MISCELLANEOUS',
];

export const CATEGORY_LABELS = {
  FUEL: 'Fuel',
  TOLL: 'Toll',
  MAINTENANCE: 'Maintenance',
  REPAIR: 'Repair',
  DRIVER_SALARY: 'Driver salary',
  DRIVER_ALLOWANCE: 'Allowance',
  DRIVER_MEAL: 'Food',
  INSURANCE: 'Insurance',
  PERMIT: 'Permit',
  FINE: 'Fine',
  TYRE: 'Tyre',
  LOADING_UNLOADING: 'Loading / unloading',
  MISCELLANEOUS: 'Other',
};

export const CATEGORY_ICONS = {
  FUEL: 'water-outline',
  TOLL: 'card-outline',
  MAINTENANCE: 'build-outline',
  REPAIR: 'construct-outline',
  DRIVER_SALARY: 'cash-outline',
  DRIVER_ALLOWANCE: 'wallet-outline',
  DRIVER_MEAL: 'fast-food-outline',
  INSURANCE: 'shield-checkmark-outline',
  PERMIT: 'document-text-outline',
  FINE: 'alert-circle-outline',
  TYRE: 'ellipse-outline',
  LOADING_UNLOADING: 'swap-vertical-outline',
  MISCELLANEOUS: 'ellipsis-horizontal-circle-outline',
};

export const categoryLabel = (key) =>
  CATEGORY_LABELS[key] ||
  String(key || '').toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export const categoryIcon = (key) =>
  CATEGORY_ICONS[key] || CATEGORY_ICONS.MISCELLANEOUS;
