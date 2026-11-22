const DAY = 86400000;
export const istDay = (now = new Date()) =>
  new Date(+now + 19800000).toISOString().slice(0, 10);
export const yesterday = () => istDay(new Date(Date.now() - DAY));
export const shiftDay = (date, delta) =>
  istDay(new Date(+new Date(`${date}T00:00:00+05:30`) + delta * DAY));
export const validBusinessDay = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00+05:30`);
  return Number.isFinite(+parsed) && istDay(parsed) === value;
};
const knownNumber = (v) =>
  v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v);

/** Driver bills of the day: waiting + approved + recorded (rejected left out); null when none were read. */
export function driverBillsInr(money = {}) {
  const parts = [money.expensePendingInr, money.expenseApprovedInr, money.expenseRecordedInr].map(knownNumber);
  return parts.every((v) => v == null) ? null : parts.reduce((total, v) => total + (v ?? 0), 0);
}

/**
 * The four "Aaj ka hisab" boxes, built from GET /owner-report — the same report the
 * web Daily Digest page reads (yesterdaysWork / moneyOut) — so owner, manager and web
 * all show the same numbers under the same words.
 * `trips` counts trips that LEFT a pickup in the day (web: "Trips started today");
 * how many of those are complete is in the caption, like the web's separate figure.
 */
export function hisabTiles(report, { today = false } = {}) {
  const byId = {};
  if (Array.isArray(report?.sections)) {
    for (const section of report.sections) {
      if (section?.id) byId[section.id] = section;
    }
  } else if (report?.sections && typeof report.sections === "object") {
    for (const [key, section] of Object.entries(report.sections)) {
      if (section && typeof section === "object") {
        byId[section.id || key] = section;
      }
    }
  }
  const work = byId.yesterdaysWork?.numbers || {};
  const tripsMetrics = byId.trips?.metrics || {};
  const started = knownNumber(work.trips ?? tripsMetrics.started?.value ?? tripsMetrics.count?.value);
  const completed = knownNumber(work.completedTrips ?? tripsMetrics.count?.value);
  const open = knownNumber(work.openTrips);
  const kmVal = knownNumber(work.km ?? tripsMetrics.ladenKm?.value ?? byId.distance?.metrics?.observedKm?.value);

  const money = byId.moneyOut?.numbers || {};
  const dieselMetrics = byId.diesel?.metrics || {};
  const expensesMetrics = byId.expenses?.metrics || {};
  const dieselVal = knownNumber(money.dieselBillInr ?? dieselMetrics.amount?.value);
  const pendingCount = knownNumber(money.expensePendingCount ?? expensesMetrics.pending?.value);
  const billsVal = driverBillsInr(money) ?? knownNumber(expensesMetrics.amount?.value);

  const inr = (v) => `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  return [
    {
      key: "trips",
      label: today ? "Trips started today" : "Trips started",
      icon: "navigate-outline",
      unit: "records",
      value: started,
      caption:
        completed == null
          ? today
            ? "Includes trips still on the road"
            : "Left a pickup this day"
          : `${completed} completed${open ? ` · ${open} still open` : ""}`,
      section: "trips",
      route: "Fleet trips",
    },
    {
      key: "km",
      label: today ? "Loaded km today" : "Loaded km",
      icon: "speedometer-outline",
      unit: "km",
      value: kmVal,
      caption: work.kmPartial ? "Loaded trip distance · partial" : "Loaded trip distance",
      section: "trips",
      route: "Fleet trips",
    },
    {
      key: "diesel",
      label: "Diesel billed",
      icon: "water-outline",
      unit: "INR",
      value: dieselVal,
      caption: "Bills handed in, not paid",
      section: "diesel",
      route: "Fuel logs",
    },
    {
      key: "bills",
      label: "Driver bills",
      icon: "receipt-outline",
      unit: "INR",
      value: billsVal,
      caption: pendingCount
        ? `${pendingCount} waiting · ${inr(knownNumber(money.expensePendingInr ?? billsVal) ?? 0)}`
        : "Submitted, rejected left out",
      section: "expenses",
      route: "Manager approvals",
    },
  ];
}

export const displayMetric = (metric) =>
  metric?.value == null
    ? "Unavailable"
    : `${metric.unit === "INR" ? "₹" : ""}${Number(metric.value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}${metric.unit === "INR" ? "" : ` ${metric.unit}`}`;
export const sectionNames = {
  people: "Drivers and pairing status now",
  register: "Imported fuel register",
  sensorReconciliation: "Bill / register / sensor reconciliation",
  documents: "Captured papers expired or due soon",
  challans: "Open or disputed challans now",
  deviations: "Route deviations needing review now",
  fleet: "Fleet now",
  trips: "Trips marked complete",
  diesel: "Recorded diesel purchases",
  adblue: "Recorded AdBlue purchases",
  expenses: "Driver bills submitted",
  advances: "Advances paid",
  tolls: "Recorded toll charges",
  fuelReviews: "Fuel captures needing review now",
  workshopReviews: "Workshop extraction reviews now",
  expenseReviews: "Financial bill approvals now",
  issues: "Open incidents now",
  inbox: "Full alert inbox now",
  dataHealth: "Truck data health",
  finance: "Billing and cash movement",
  onTime: "On-time arrivals",
  turnaround: "Plant turnaround",
  crew: "At-wheel and rest",
  navigation: "Navigation coverage",
  tripMargin: "Actual per-trip margin",
  issuesRaised: "Incidents raised in the day",
  deviationsRaised: "Route deviations detected in the day",
  pairedDrivers: "Drivers paired during the day",
};
export const trendSections = [
  "trips",
  "diesel",
  "adblue",
  "expenses",
  "advances",
  "tolls",
  "register",
  "turnaround",
  "issuesRaised",
  "deviationsRaised",
  "pairedDrivers",
];
export const trendPointText = (point, unit) =>
  point.status === "empty" && point.value == null
    ? "No records"
    : displayMetric({ value: point.value, unit });
export function comparisonNotes(comparison) {
  if (!comparison) return [];
  const missing = comparison.previousSevenDays?.missingDays || [];
  return (comparison.reasons || []).map((reason) =>
    reason === "SELECTED_PARTIAL_DAY"
      ? "The selected day is still in progress."
      : missing.length
        ? `Missing inputs on ${missing.join(", ")}; no average is shown.`
        : "The selected day has missing inputs.",
  );
}

export function adaptWebOwnerReport(webReport) {
  if (!webReport) return null;
  const sectionsList = Array.isArray(webReport.sections) ? webReport.sections : [];
  const byId = {};
  for (const s of sectionsList) {
    if (s?.id) byId[s.id] = s;
  }
  const work = byId.yesterdaysWork?.numbers || {};
  const money = byId.moneyOut?.numbers || {};
  const exceptions = byId.exceptions?.numbers || {};
  const people = byId.people?.numbers || {};
  const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const metric = (value, unit) => ({ value, unit });
  const bills = driverBillsInr(money);

  return {
    generatedAt: webReport.generatedAt || new Date().toISOString(),
    sections: {
      trips: {
        status: work.trips != null ? 'ok' : 'empty',
        metrics: {
          count: metric(num(work.completedTrips), 'records'),
          started: metric(num(work.trips), 'records'),
          ladenKm: metric(num(work.km), 'km'),
        },
      },
      distance: {
        status: work.km != null ? 'ok' : 'empty',
        metrics: {
          observedKm: metric(num(work.km), 'km'),
        },
      },
      diesel: {
        status: money.dieselBillInr != null ? 'ok' : 'empty',
        metrics: {
          amount: metric(num(money.dieselBillInr), 'INR'),
          litres: metric(num(money.dieselBillLitres), 'L'),
        },
      },
      expenses: {
        status: bills != null ? 'ok' : 'empty',
        metrics: {
          amount: metric(bills, 'INR'),
          pending: metric(num(money.expensePendingCount), 'records'),
        },
      },
      fuelReviews: {
        status: exceptions.moneyTheft != null ? 'ok' : 'empty',
        metrics: {
          count: metric(num(exceptions.moneyTheft) ?? 0, 'records'),
        },
      },
      expenseReviews: {
        status: money.expensePendingCount != null ? 'ok' : 'empty',
        metrics: {
          count: metric(num(money.expensePendingCount) ?? num(exceptions.papersWaiting) ?? 0, 'records'),
        },
      },
      documents: {
        status: exceptions.documentsExpiring != null ? 'ok' : 'empty',
        metrics: {
          count: metric(num(exceptions.documentsExpiring) ?? 0, 'records'),
        },
      },
      issues: {
        status: exceptions.sos != null ? 'ok' : 'empty',
        metrics: {
          count: metric(num(exceptions.sos) ?? 0, 'records'),
        },
      },
      deviations: {
        status: exceptions.routeDeviations != null ? 'ok' : 'empty',
        metrics: {
          count: metric(num(exceptions.routeDeviations) ?? 0, 'records'),
        },
      },
      people: {
        status: people.driversCount != null ? 'ok' : 'empty',
        metrics: {
          count: metric(num(people.driversCount), 'records'),
        },
      },
      ...byId,
    },
  };
}
export function reportSpeech(report, language = "en") {
  const words = {
    en: {
      intro: "Your fleet report for",
      fleet: "Registered vehicles",
      trips: "Trips marked complete",
      diesel: "Recorded diesel purchase rupees",
      moving: "Trucks moving now",
      offline: "Trucks with stale or offline telemetry now",
      adblue: "Recorded AdBlue purchase rupees",
      advances: "Advances actually marked paid, rupees",
      tolls: "Known recorded toll charges, rupees",
      unpriced: "Toll records whose charge is unknown",
      fuelReviews: "Fuel captures still needing review now",
      expenseReviews: "Driver bills awaiting financial confirmation now",
      evidence:
        "The selected business day uses Indian Standard Time. Fleet state and review backlogs describe now. Recorded purchases are not measured consumption. Billed margin excludes overheads and is not actual trip profit. Open the matching records for the selected date and branch to see the evidence.",
      unavailable: "Unavailable",
      partial: "Partial coverage. Review the evidence.",
      end: "Purchases, approved bills, advances and cash movement are different measures. Unknown sections are not zero.",
    },
    hi: {
      intro: "आपकी फ़्लीट रिपोर्ट",
      fleet: "पंजीकृत वाहन",
      trips: "पूर्ण दर्ज यात्राएं",
      diesel: "दर्ज डीज़ल खरीद रुपये",
      moving: "अभी चल रहे ट्रक",
      offline: "अभी पुराना या बंद ट्रक डेटा",
      adblue: "दर्ज एडब्लू खरीद रुपये",
      advances: "भुगतान दर्ज अग्रिम रुपये",
      tolls: "ज्ञात दर्ज टोल रुपये",
      unpriced: "अज्ञात राशि वाले टोल",
      fuelReviews: "अभी समीक्षा की जरूरत वाले ईंधन रिकॉर्ड",
      expenseReviews: "अभी वित्तीय पुष्टि की प्रतीक्षा वाले चालक बिल",
      evidence:
        "दिन भारतीय मानक समय के अनुसार है। फ़्लीट और लंबित समीक्षा वर्तमान स्थिति हैं। दर्ज खरीद वास्तविक खपत नहीं है। बिल का मार्जिन सभी खर्चों के बाद का लाभ नहीं है। चुनी तारीख और शाखा के संबंधित रिकॉर्ड में प्रमाण देखें।",
      unavailable: "जानकारी उपलब्ध नहीं",
      partial: "डेटा अधूरा है। प्रमाण देखें।",
      end: "खरीद, स्वीकृत बिल, अग्रिम और नकद भुगतान अलग आंकड़े हैं। अज्ञात का अर्थ शून्य नहीं है।",
    },
    bn: {
      intro: "আপনার ফ্লিট রিপোর্ট",
      fleet: "নিবন্ধিত গাড়ি",
      trips: "সম্পূর্ণ হিসেবে নথিভুক্ত যাত্রা",
      diesel: "নথিভুক্ত ডিজেল ক্রয় টাকা",
      moving: "এখন চলমান ট্রাক",
      offline: "এখন পুরোনো বা অফলাইন ট্রাক তথ্য",
      adblue: "নথিভুক্ত অ্যাডব্লু ক্রয় টাকা",
      advances: "পরিশোধ হিসেবে নথিভুক্ত অগ্রিম টাকা",
      tolls: "জানা নথিভুক্ত টোল টাকা",
      unpriced: "যেসব টোলের পরিমাণ অজানা",
      fuelReviews: "এখন পর্যালোচনার অপেক্ষায় জ্বালানি রেকর্ড",
      expenseReviews: "এখন আর্থিক নিশ্চিতকরণের অপেক্ষায় চালকের বিল",
      evidence:
        "দিন ভারতীয় সময় অনুসারে গণনা করা হয়। ফ্লিট এবং অপেক্ষমাণ পর্যালোচনা বর্তমান অবস্থা। নথিভুক্ত ক্রয় প্রকৃত খরচ নয়। বিলের মার্জিন সব খরচের পরের লাভ নয়। নির্বাচিত তারিখ ও শাখার সংশ্লিষ্ট রেকর্ডে প্রমাণ দেখুন।",
      unavailable: "তথ্য নেই",
      partial: "তথ্য আংশিক। প্রমাণ দেখুন।",
      end: "ক্রয়, অনুমোদিত বিল, অগ্রিম ও নগদ লেনদেন আলাদা হিসাব। অজানা মানে শূন্য নয়।",
    },
  }[language];
  const sectionsObj = Array.isArray(report?.sections)
    ? Object.fromEntries(report.sections.filter((s) => s?.id).map((s) => [s.id, s]))
    : (report?.sections || {});
  const read = (section, metric) =>
    sectionsObj[section]?.metrics?.[metric]?.value ?? words.unavailable;
  return `${words.intro} ${report?.date || ''}. ${words.fleet}: ${read("fleet", "total")}. ${words.moving}: ${read("fleet", "moving")}. ${words.offline}: ${read("fleet", "offline")}. ${words.trips}: ${read("trips", "count")}. ${words.diesel}: ${read("diesel", "amount")}. ${words.adblue}: ${read("adblue", "amount")}. ${words.advances}: ${read("advances", "amount")}. ${words.tolls}: ${read("tolls", "knownSubtotal")}. ${words.unpriced}: ${read("tolls", "unpriced")}. ${words.fuelReviews}: ${read("fuelReviews", "count")}. ${words.expenseReviews}: ${read("expenseReviews", "count")}. ${Object.values(sectionsObj).some((s) => s?.coverage !== "complete") ? words.partial : ""} ${words.evidence} ${words.end}`;
}
