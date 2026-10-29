// Display language for the owner workspace. API field names stay in the service contract.
export const reportGroups = {
  Money: [
    "diesel",
    "adblue",
    "expenses",
    "advances",
    "tolls",
    "finance",
    "register",
    "sensorReconciliation",
    "tripMargin",
    "fuelReviews",
    "expenseReviews",
    "workshopReviews",
  ],
  People: ["people", "pairedDrivers", "crew", "driverTrends"],
};
export const reportMeta = {
  fleet: ["Fleet right now", "bus-outline", "moving"],
  trips: ["Completed trips", "navigate-outline", "count"],
  distance: ["Distance recorded", "speedometer-outline", "observedKm"],
  diesel: ["Diesel purchases", "water-outline", "amount"],
  adblue: ["AdBlue purchases", "flask-outline", "amount"],
  expenses: ["Driver bills submitted", "receipt-outline", "amount"],
  advances: ["Advances paid", "wallet-outline", "amount"],
  tolls: ["Toll crossings", "card-outline", "knownSubtotal"],
  finance: ["Billing & cash flow", "cash-outline", "billed"],
  fuelReviews: ["Fuel captures", "water-outline", "count"],
  expenseReviews: ["Driver bill approvals", "receipt-outline", "count"],
  workshopReviews: ["Workshop extractions", "construct-outline", "count"],
  documents: ["Papers due for renewal", "document-text-outline", "count"],
  issues: ["Open incidents", "warning-outline", "count"],
  issuesRaised: ["Incidents reported", "warning-outline", "count"],
  inbox: ["Alert inbox", "notifications-outline", "count"],
  challans: ["Open challans", "document-outline", "amount"],
  deviations: ["Route deviations", "git-branch-outline", "count"],
  deviationsRaised: ["New route deviations", "git-branch-outline", "count"],
  register: ["Fuel register", "book-outline", "litres"],
  sensorReconciliation: [
    "Fuel reconciliation",
    "swap-horizontal-outline",
    "alignedVehicles",
  ],
  dataHealth: ["Data health", "pulse-outline", "fresh"],
  people: ["Driver roster", "people-outline", "count"],
  pairedDrivers: ["Drivers paired", "link-outline", "count"],
  crew: ["Crew & driving", "people-outline", "declaredDrivingMinutes"],
  onTime: ["Arrival performance", "time-outline", "onTime"],
  turnaround: ["Plant turnaround", "timer-outline", "averageMinutes"],
  navigation: ["Navigation coverage", "compass-outline", "share"],
  tripMargin: ["Trip revenue & costs", "stats-chart-outline", "settledMargin"],
  driverTrends: [
    "Driver performance",
    "trending-up-outline",
    "consistencyScore",
  ],
  etaRisks: ["Arrival risks", "time-outline", "promiseRisks"],
  ewbRisks: ["E-way bill validity", "document-text-outline", "count"],
};
export const metricLabels = {
  count: "Recorded entries",
  total: "Registered trucks",
  moving: "Moving",
  idling: "Engine-on idle",
  parked: "Parked",
  offline: "Offline",
  unknown: "Unknown",
  atPlant: "At plant",
  ladenKm: "Completed-trip laden distance",
  observedKm: "Observed distance",
  litres: "Recorded litres",
  amount: "Recorded amount",
  knownSubtotal: "Known toll charges",
  unpriced: "Crossings with unknown charges",
  averageMinutes: "Average completed visit",
  pending: "Pending",
  confirmed: "Confirmed",
  rejected: "Rejected",
  ongoingPairings: "Drivers paired now",
  billed: "Freight billed",
  directCost: "Billed direct costs",
  billedMargin: "Billed margin",
  cashIn: "Cash received",
  cashOut: "Cash paid",
  receivablesNow: "Receivables outstanding now",
  fresh: "Fresh truck observations",
  stale: "Stale observations",
  registered: "Registered trucks",
  declaredDrivingMinutes: "Declared driving",
  declaredRestMinutes: "Declared rest",
  onTime: "On-time arrivals",
  late: "Late arrivals",
  assessed: "Arrivals with a promise",
  missingPromise: "Missing agreed promise",
  postedRevenue: "Posted trip revenue",
  postedHireCost: "Posted hire charges",
  contribution: "Contribution before other costs",
  settledMargin: "Owner-attested settled margin",
  settledCost: "Settled costs",
  actualProfit: "Audited net profit",
};
export const friendlyLabel = (value) =>
  metricLabels[value] ||
  String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (s) => s.toUpperCase());
export function metricValue(section, key) {
  if (
    !section ||
    section.status === "error" ||
    section.availability === "unavailable"
  )
    return null;
  const value = section.metrics?.[key]?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
export function shortNumber(value, currency = false) {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const prefix = currency ? "₹" : "";
  if (currency && abs >= 10000000)
    return `${prefix}${(value / 10000000).toLocaleString("en-IN", { maximumFractionDigits: 1 })} Cr`;
  if (currency && abs >= 100000)
    return `${prefix}${(value / 100000).toLocaleString("en-IN", { maximumFractionDigits: 1 })} L`;
  return `${prefix}${value.toLocaleString("en-IN", { maximumFractionDigits: 1 })}`;
}
export function sectionState(section) {
  if (section?.status === "error")
    return { label: "Could not load", tone: "expired" };
  if (!section || section.availability === "unavailable")
    return {
      label:
        section?.reasonCode === "NOT_ENABLED" ? "Not enabled" : "Not available",
      tone: "neutral",
    };
  if (section.coverage === "partial" || section.coverage === "unknown")
    return { label: "Partial data", tone: "pending" };
  return {
    label: section.status === "empty" ? "No records" : "Available",
    tone: "neutral",
  };
}
export function groupSections(sections, group) {
  return Object.keys(sections || {}).filter((name) =>
    group === "Work"
      ? !Object.values(reportGroups).flat().includes(name)
      : (reportGroups[group] || []).includes(name),
  );
}
