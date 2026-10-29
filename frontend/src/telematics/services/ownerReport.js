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
export const displayMetric = (metric) =>
  metric?.value == null
    ? "Unavailable"
    : `${metric.unit === "INR" ? "₹" : ""}${Number(metric.value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}${metric.unit === "INR" ? "" : ` ${metric.unit}`}`;
export const sectionNames = {
  distance: "Observed daily distance",
  etaRisks: "Current measured ETA risks",
  ewbRisks: "Linked e-way bills expired or due within 24 hours",
  driverTrends: "Latest sampled driver trends",
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
  crew: "Declared crew driving and rest",
  navigation: "Navigation coverage",
  tripMargin: "Linked trip revenue and hire contribution",
};
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
  const read = (section, metric) =>
    report.sections[section]?.metrics[metric]?.value ?? words.unavailable;
  return `${words.intro} ${report.date}. ${words.fleet}: ${read("fleet", "total")}. ${words.moving}: ${read("fleet", "moving")}. ${words.offline}: ${read("fleet", "offline")}. ${words.trips}: ${read("trips", "count")}. ${words.diesel}: ${read("diesel", "amount")}. ${words.adblue}: ${read("adblue", "amount")}. ${words.advances}: ${read("advances", "amount")}. ${words.tolls}: ${read("tolls", "knownSubtotal")}. ${words.unpriced}: ${read("tolls", "unpriced")}. ${words.fuelReviews}: ${read("fuelReviews", "count")}. ${words.expenseReviews}: ${read("expenseReviews", "count")}. ${Object.values(report.sections).some((s) => s.coverage !== "complete") ? words.partial : ""} ${words.evidence} ${words.end}`;
}
