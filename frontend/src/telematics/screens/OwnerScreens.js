import { useExperienceCopy } from '../experience/ExperienceUI';
import { OwnerScreen, OwnerGroupRow } from '../components/OwnerReportView';
import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText, Card, Button, colors, radius } from '../../components/ui';
import { useManagerData } from '../context/ManagerDataContext';
import { summarizeOwner } from '../services/ownerSummary';
import { ManagerPage, RecentTrips } from './ManagerScreens';
import { MenuRow } from './DriverScreens';
import { KpiCard, SectionHeading, DataState } from '../components';
import { formatLitres } from '../../utils/format';
const money = (value) => typeof value === 'number' ? `₹${value.toLocaleString('en-IN')}` : '—';

export function Today({ navigation }) {
  const { data, branchId, branches } = useManagerData(); const summary = summarizeOwner(data);
  return <ManagerPage navigation={navigation} title="The bigger picture." subtitle="Your fleet. Your priorities. One clear view.">
    <LinearGradient colors={colors.heroGradient} style={s.hero}><View style={s.heroTop}><AppText variant="caption" color={colors.onPrimaryMuted}>{branchId === 'all' ? 'ORGANIZATION OVERVIEW' : `${branchId.toUpperCase()} OVERVIEW`}</AppText><Ionicons name="pulse-outline" size={23} color={colors.white} /></View><AppText variant="display" color={colors.white}>{summary.trucks} trucks.</AppText><AppText color={colors.onPrimaryMuted}>{summary.moving} moving · {summary.drivers} drivers · {summary.unknown} telemetry unavailable</AppText><Button label="Explore your fleet" variant="secondary" onPress={() => navigation.navigate('Fleet')} style={{ marginTop: 10 }} /></LinearGradient>
    <View style={s.metrics}><KpiCard label="Open alerts" value={summary.alerts} icon="notifications-outline" caption={`${summary.critical} critical on loaded page`} /><KpiCard label="Pending reviews" value={summary.pendingReviews} icon="receipt-outline" caption="Fuel and workshop bills" /></View>
    <MenuRow title="Your fleet digest" detail="Exceptions, activity and next steps" icon="sparkles-outline" onPress={() => navigation.navigate('Digest')} />
    <RecentTrips navigation={navigation} data={data} />
    <SectionHeading title="Operational overview" />
    <MenuRow title="Fuel & AdBlue" detail={`${formatLitres(summary.fuelLitres)} L fuel · ${formatLitres(summary.adblueLitres)} L AdBlue · last 30 days`} icon="water-outline" onPress={() => navigation.navigate('Fuel & AdBlue')} />
    <MenuRow title="Maintenance" detail={`${summary.issues} open issues`} icon="construct-outline" onPress={() => navigation.navigate('Maintenance')} />
    <SectionHeading title={branchId === 'all' ? 'Across your branches' : 'Selected branch'} caption="Loaded records in the selected branch." />
    {branches.filter((branch) => branch.id !== 'all' && (branchId === 'all' || branch.id === branchId)).map((branch) => {
      const vehicles = data?.vehicles.filter((v) => v.branchId === branch.id) || [];
      return <MenuRow key={branch.id} title={branch.name} detail={`${vehicles.length} trucks · ${vehicles.filter((v) => v.status === 'moving').length} moving`} icon="business-outline" onPress={() => navigation.navigate('Branch overview', { id: branch.id })} />;
    })}
  </ManagerPage>;
}
export function FuelAdblue({ navigation }) {
  const { data } = useManagerData(); const summary = summarizeOwner(data);
  return <ManagerPage navigation={navigation} title="Fuel & AdBlue" subtitle="Recorded quantities. Clear costs."><View style={s.metrics}><KpiCard label="Fuel recorded" value={formatLitres(summary.fuelLitres)} unit="L" caption="last 30 days" icon="water-outline" /><KpiCard label="AdBlue recorded" value={formatLitres(summary.adblueLitres)} unit="L" caption="last 30 days" icon="flask-outline" /></View><Card style={s.cost}><AppText variant="caption" muted>{data?.summary?.asOf ? `Analytics as of ${new Date(data.summary.asOf).toLocaleString()}${data.summary.stale ? " · stale" : ""}` : "Analytics freshness unavailable"}</AppText><AppText variant="label" muted>RECORDED COST</AppText><AppText variant="h1" mono>{money(typeof summary.fuelAmount === 'number' && typeof summary.adblueAmount === 'number' ? summary.fuelAmount + summary.adblueAmount : null)}</AppText><AppText variant="small" muted>Fuel {money(summary.fuelAmount)} · AdBlue {money(summary.adblueAmount)}</AppText><AppText variant="caption" muted>Last 30 days, all record statuses. Warehouse capture totals; not consumption or ledger values.</AppText></Card><Button label="Review fuel slips" variant="secondary" onPress={() => navigation.navigate('Fuel review')} /><SectionHeading title="By vehicle" caption="Entries on the loaded page; headline totals cover the full period." />{data?.vehicles.map((vehicle) => {
    const fuel = data.fuel.filter((item) => item.vehicleId === vehicle.id); const adblue = data.adblue.filter((item) => item.vehicleId === vehicle.id);
    if (!fuel.length && !adblue.length) return null;
    const fuelLitres = fuel.reduce((sum, item) => sum + item.litres, 0); const adblueLitres = adblue.reduce((sum, item) => sum + item.litres, 0);
    return <MenuRow key={vehicle.id} title={vehicle.plate} detail={`${formatLitres(fuelLitres)} L fuel · ${formatLitres(adblueLitres)} L AdBlue`} icon="bus-outline" onPress={() => navigation.navigate('Vehicle detail', { id: vehicle.id })} />;
  })}{!summary.fuelLitres && !summary.adblueLitres && <DataState state="empty" />}<SectionHeading title="AdBlue entries" />{data?.adblue.map((item) => <MenuRow key={item.id} title={data.vehicles.find((v) => v.id === item.vehicleId)?.plate || 'truck'} detail={`${formatLitres(item.litres)} L · ${money(item.amountInr)} · entry`} icon="flask-outline" />)}</ManagerPage>;
}
export function Digest({ navigation }) {
  const { data } = useManagerData(); const summary = summarizeOwner(data);
  return <ManagerPage navigation={navigation} title="Your fleet digest" subtitle="Complete branch totals and the last 30 days of activity."><Card style={s.digest}><View style={s.digestIcon}><Ionicons name="sparkles-outline" size={28} color={colors.primary} /></View><AppText variant="h2">Here’s what stands out.</AppText><AppText muted>{summary.moving} of {summary.trucks} trucks are moving. {summary.offline} have stale/offline telemetry, and {summary.unlinked} have no driver link.</AppText><AppText variant="caption" muted>Complete fleet counts. Fuel and trip aggregates cover the last 30 days.</AppText></Card><MenuRow title={`${summary.alerts} alerts to review`} detail={`${summary.critical} marked critical in this view`} icon="notifications-outline" onPress={() => navigation.navigate('Owner tabs', { screen: 'Alerts' })} /><MenuRow title={`${summary.pendingReviews} pending reviews`} detail="Fuel slips and workshop bills" icon="receipt-outline" onPress={() => navigation.navigate('Fuel review')} /><MenuRow title={`${summary.issues} open issues`} detail="Resolve vehicle maintenance needs" icon="construct-outline" onPress={() => navigation.navigate('Maintenance')} /><MenuRow title={`${summary.distanceKm} km in trips`} detail="GPS-detected journey records" icon="navigate-outline" onPress={() => navigation.navigate('Fleet trips')} /><MenuRow title="View the duty board" detail={`${summary.drivers} drivers in this view`} icon="people-outline" onPress={() => navigation.navigate('Duty board')} /></ManagerPage>;
}
export function BranchOverview({ navigation, route }) {
  const { data, selectBranch, branchId, branches } = useManagerData(); const branch = branches.find((b) => b.id === route.params?.id);
  const visible = branch && (branchId === 'all' || branch.id === branchId);
  const vehicles = visible ? data?.vehicles.filter((v) => v.branchId === branch.id) || [] : [];
  return <ManagerPage navigation={navigation} title={branch?.name || 'Branch overview'} subtitle="Loaded branch records.">{visible ? <><View style={s.metrics}><KpiCard label="Trucks" value={vehicles.length} icon="bus-outline" /><KpiCard label="Drivers" value={data?.drivers.filter((d) => d.branchId === branch.id).length || 0} icon="people-outline" /></View>{vehicles.map((v) => <MenuRow key={v.id} title={v.plate} detail={`${v.model} · ${v.status}`} icon="bus-outline" onPress={() => navigation.navigate('Vehicle detail', { id: v.id })} />)}{!vehicles.length && <DataState state="empty" />}<Button label={`Filter to ${branch.name}`} variant="secondary" onPress={() => selectBranch(branch.id)} /></> : <Card><AppText muted>This branch is outside the selected view. Choose All branches above to see its records.</AppText></Card>}</ManagerPage>;
}
export function More({ navigation }) {
  const c = useExperienceCopy();
  const groups = [
    [c('previewTitle'), [['Driver papers review', c('reviewPapers'), 'documents-outline'], ['Crew messages', c('crewMessages'), 'chatbubbles-outline'], ['New preview broadcast', c('broadcasts'), 'megaphone-outline'], ['Experience truth', c('truth'), 'pulse-outline'], ['Experience settings', c('settings'), 'settings-outline']]],
    ['Fleet & people', [['Drivers', 'Driver roster', 'people-outline'], ['Crew & driving', 'Crew & driving', 'swap-horizontal-outline'], ['Fleet trips', 'Trip history', 'navigate-outline'], ['Fuel & AdBlue', 'Fuel & AdBlue', 'water-outline'], ['Maintenance', 'Maintenance', 'construct-outline']]],
    ['Money & records', [['Capture reviews', 'Capture reviews', 'scan-outline'], ['Owner finance', 'Billing & cash flow', 'wallet-outline'], ['Fleet documents', 'Fleet documents', 'document-text-outline']]],
    ['Conversations', [['Messages', 'Messages & broadcasts', 'chatbubbles-outline'], ['Owner calls', 'Calls & follow-ups', 'call-outline'], ['Owner escalations', 'Owner inbox', 'notifications-outline']]],
    ['Your workspace', [['Owner home', 'Fleet home summary', 'home-outline'], ['Aaj ka hisaab', "Today's business report", 'document-text-outline'], ['Owner trends', 'Reports & trends', 'trending-up-outline'], ['Report settings', 'Morning report', 'sunny-outline'], ['Team & access', 'Team & access', 'person-add-outline'], ['Owner settings', 'Settings & support', 'settings-outline']]],
  ];
  return <OwnerScreen navigation={navigation} title="Your workspace" subtitle="Fleet, finances and your team.">
    {groups.map(([label, links]) => <View key={label} style={{ gap: 10 }}><AppText variant="label" muted>{label}</AppText><Card padding={0}>{links.map(([route, title, icon], index) => <OwnerGroupRow key={route} title={title} icon={icon} last={index === links.length - 1} onPress={() => navigation.navigate(route)} />)}</Card></View>)}
  </OwnerScreen>;
}
// ─── Owner Home Summary (O-01) ────────────────────────────────────────────────

const OWNER_HOME_MOCK = {
  orgName: "Patil Transport Pvt. Ltd.",
  date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
  fleet: { total: 18, driving: 7, idle: 3, plant: 4, offline: 4 },
  topAlerts: [
    { id: "a1", type: "sos", title: "SOS — Mohan Sharma", vehicle: "MP 09 IJ 7890", severity: "high", ago: "12m" },
    { id: "a2", type: "idle", title: "Idle >2h — Sunil Patil", vehicle: "MH 12 CD 5678", severity: "medium", ago: "38m" },
    { id: "a3", type: "papers", title: "Insurance expiring — GJ 01 EF 9012", vehicle: "GJ 01 EF 9012", severity: "low", ago: "3h" },
  ],
  reportReady: true,
};

const ALERT_SEVERITY_CFG = {
  high:   { tone: colors.error, bg: colors.expiredBg, icon: "alert-circle-outline" },
  medium: { tone: colors.warning, bg: colors.pendingBg, icon: "warning-outline" },
  low:    { tone: colors.textMuted, bg: colors.background, icon: "information-circle-outline" },
};

export function OwnerHomeSummary({ navigation }) {
  const { fleet, topAlerts, orgName, date, reportReady } = OWNER_HOME_MOCK;
  const insets = { top: 48 }; // fallback — real code should use useSafeAreaInsets

  return (
    <ManagerPage navigation={navigation} title="Good morning" subtitle={orgName} allowEmpty>
      {/* Date line */}
      <AppText variant="small" muted style={{ marginTop: -8 }}>{date}</AppText>

      {/* Fleet state tiles */}
      <Card>
        <AppText weight="semibold" style={{ marginBottom: 10 }}>Fleet right now</AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {[
            { label: "Driving", value: fleet.driving, bg: colors.infoBg, tone: colors.primary, icon: "car-outline" },
            { label: "Idle", value: fleet.idle, bg: colors.pendingBg, tone: colors.warning, icon: "time-outline" },
            { label: "At plant", value: fleet.plant, bg: colors.validBg, tone: colors.success, icon: "business-outline" },
            { label: "Offline", value: fleet.offline, bg: colors.background, tone: colors.textMuted, icon: "wifi-outline" },
          ].map((item) => (
            <View key={item.label} style={{ flex: 1, minWidth: 70, backgroundColor: item.bg, borderRadius: radius.md, padding: 12, alignItems: "center", gap: 4, borderWidth: 1, borderColor: colors.border }}>
              <Ionicons name={item.icon} size={18} color={item.tone} />
              <AppText style={{ fontSize: 22, fontWeight: "800" }} color={item.tone}>{item.value}</AppText>
              <AppText variant="small" muted style={{ textAlign: "center" }}>{item.label}</AppText>
            </View>
          ))}
        </View>
        <AppText variant="small" muted style={{ marginTop: 8 }}>
          {fleet.total} trucks total · {fleet.driving + fleet.idle + fleet.plant} active today
        </AppText>
      </Card>

      {/* Today's report CTA */}
      <View style={{ borderRadius: radius.lg, overflow: "hidden" }}>
        <LinearGradient
          colors={colors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 16, flexDirection: "row", alignItems: "center", gap: 14 }}
        >
          <Ionicons name="document-text-outline" size={26} color={colors.white} />
          <View style={{ flex: 1 }}>
            <AppText weight="semibold" color={colors.white}>
              {reportReady ? "Today's report is ready" : "Report preparing…"}
            </AppText>
            <AppText variant="small" color={colors.onPrimaryMuted}>Fuel, trips, exceptions, driver scores</AppText>
          </View>
          <Button
            label="Open report"
            size="small"
            onPress={() => navigation.navigate("Aaj ka hisaab")}
            style={{ backgroundColor: "rgba(255,255,255,0.18)", borderColor: "rgba(255,255,255,0.3)" }}
          />
        </LinearGradient>
      </View>

      {/* Top 3 alerts */}
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <AppText weight="semibold">Top alerts</AppText>
          <Button
            label="View all"
            size="small"
            variant="secondary"
            onPress={() => navigation.navigate("Owner escalations")}
          />
        </View>
        {topAlerts.map((alert) => {
          const cfg = ALERT_SEVERITY_CFG[alert.severity] || ALERT_SEVERITY_CFG.low;
          return (
            <Card key={alert.id} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: cfg.bg, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={cfg.icon} size={18} color={cfg.tone} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="small" weight="semibold" numberOfLines={1}>{alert.title}</AppText>
                <AppText variant="small" muted>{alert.vehicle} · {alert.ago} ago</AppText>
              </View>
            </Card>
          );
        })}
      </View>

      <AppText variant="small" muted style={{ textAlign: "center", marginTop: 4 }}>
        Mock data · O-01 backend endpoint not built yet
      </AppText>
    </ManagerPage>
  );
}

// ─── Owner Daily Report "Aaj ka hisaab" (O-02) ───────────────────────────────

const _yesterday = new Date(Date.now() - 86400000).toLocaleDateString("en-IN", {
  weekday: "long", day: "numeric", month: "long",
});

const DAILY_REPORT_MOCK = {
  generatedAt: "5:30 AM",
  date: _yesterday,
  sections: [
    {
      id: "fleetNow", title: "Fleet right now", icon: "bus-outline", state: "ok",
      source: "TruckState · visits · iALERT", freshSince: "2 min ago",
      rows: [
        { label: "Driving", value: "7 trucks", tone: colors.primary },
        { label: "At plant", value: "4 trucks", tone: colors.success },
        { label: "Parked / resting", value: "3 trucks" },
        { label: "Engine-on idle (verified)", value: "1 truck", tone: colors.warning },
        { label: "Dark (no data >2h)", value: "3 trucks", tone: colors.error },
      ],
    },
    {
      id: "yesterdaysWork", title: "Yesterday's work", icon: "navigate-outline", state: "ok",
      source: "AutoTrip · ERP · roadArrival", freshSince: "5:30 AM",
      rows: [
        { label: "Trips completed", value: "23" },
        { label: "Kilometres driven", value: "4,120 km" },
        { label: "On-time arrivals", value: "18 of 23 (78%)", tone: colors.success },
        { label: "Late arrivals", value: "5", tone: colors.warning },
        { label: "Avg plant turnaround", value: "47 min" },
      ],
    },
    {
      id: "moneyOut", title: "Money out", icon: "wallet-outline", state: "ok",
      source: "fuelLog · register · tollLedger · expense", freshSince: "5:30 AM",
      rows: [
        { label: "Diesel (bills)", value: "₹1,42,000 · 1,540 L" },
        { label: "Diesel (sensor)", value: "1,580 L" },
        { label: "Gap — bills vs sensor", value: "2.6% (40 L)", tone: colors.warning },
        { label: "Tolls (crossings × tariff)", value: "₹11,800" },
        { label: "Expenses submitted", value: "3 · 1 pending" },
        { label: "Advances given", value: "₹5,000" },
      ],
    },
    {
      id: "moneyIn", title: "Money in", icon: "cash-outline", state: "empty",
      source: "ERP/SAP freight — not connected", freshSince: null, rows: [],
      emptyMsg: "ERP/SAP not yet linked. Connect it in Settings to see freight and margin.",
    },
    {
      id: "people", title: "People", icon: "people-outline", state: "ok",
      source: "crew · duty · drivingDna", freshSince: "5:30 AM",
      rows: [
        { label: "Drivers on duty", value: "12" },
        { label: "At-wheel hours", value: "98 h" },
        { label: "Rest compliant", value: "10 of 12", tone: colors.success },
        { label: "Rest violation (>legal limit)", value: "2 drivers", tone: colors.error },
        { label: "Most improved this week", value: "Mohan Sharma · Amar Singh", tone: colors.success },
        { label: "Lowest score (owner only)", value: "Sunil Patil", tone: colors.warning },
      ],
    },
    {
      id: "exceptions", title: "Exceptions", icon: "alert-circle-outline", state: "ok",
      source: "fuelIntegrity · routeDeviation · idling · incident · document", freshSince: "5:30 AM",
      rows: [
        { label: "SOS", value: "1 — MP 09 IJ 7890", tone: colors.error },
        { label: "Idle >2h (engine verified)", value: "1 — MH 12 CD 5678 (52 min)", tone: colors.warning },
        { label: "Insurance expiring", value: "GJ 01 EF 9012 — 6 days", tone: colors.warning },
        { label: "Trusted-corridor deviation", value: "1 — RJ 14 GH 3456" },
        { label: "Theft alerts", value: "0", tone: colors.success },
        { label: "E-way bill at risk", value: "0", tone: colors.success },
      ],
    },
    {
      id: "trend", title: "Trend (vs last 7 days)", icon: "trending-up-outline", state: "ok",
      source: "warehouse (7-day rolling)", freshSince: "5:30 AM",
      sparkline: [19, 21, 18, 23, 22, 20, 23],
      rows: [
        { label: "Trips vs same weekday", value: "+2", tone: colors.success },
        { label: "Kilometres vs avg", value: "−180 km", tone: colors.warning },
        { label: "Fuel gap vs avg", value: "−0.4% (improving)", tone: colors.success },
        { label: "On-time rate vs avg", value: "+3%", tone: colors.success },
      ],
    },
    {
      id: "dataHealth", title: "Data health", icon: "pulse-outline", state: "ok",
      source: "sink · LEMU readiness · navMetrics", freshSince: "5 min ago",
      rows: [
        { label: "Trucks with no data (>2h)", value: "3", tone: colors.warning },
        { label: "FleetEdge feed", value: "OK", tone: colors.success },
        { label: "iALERT feed", value: "OK", tone: colors.success },
        { label: "App navigation share", value: "0% (N2 pending)", tone: colors.textMuted },
      ],
    },
  ],
};

const REPORT_STATE_CFG = {
  ok:    { icon: "checkmark-circle-outline", tone: colors.success, label: "Data available" },
  empty: { icon: "remove-circle-outline",   tone: colors.textMuted, label: "No data" },
  error: { icon: "alert-circle-outline",    tone: colors.error, label: "Check failed" },
};

function ReportSection({ section, expanded, onToggle }) {
  const cfg = REPORT_STATE_CFG[section.state] || REPORT_STATE_CFG.ok;
  return (
    <Card style={{ overflow: "hidden", padding: 0 }}>
      <Pressable
        accessibilityRole="button"
        onPress={onToggle}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}
      >
        <View style={{ width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={section.icon} size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText weight="semibold">{section.title}</AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
            <Ionicons name={cfg.icon} size={13} color={cfg.tone} />
            <AppText variant="caption" color={cfg.tone}>{cfg.label}</AppText>
          </View>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
      </Pressable>
      {expanded && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
          {section.state === "empty" ? (
            <AppText variant="small" muted style={{ textAlign: "center", paddingVertical: 12 }}>
              {section.emptyMsg || "No data for this section."}
            </AppText>
          ) : section.state === "error" ? (
            <AppText variant="small" color={colors.error} style={{ textAlign: "center", paddingVertical: 12 }}>
              Check failed — tap to retry
            </AppText>
          ) : (
            <>
              {section.sparkline && (
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, height: 36, marginTop: 10, marginBottom: 4 }}>
                  {section.sparkline.map((val, i) => {
                    const h = Math.round((val / Math.max(...section.sparkline)) * 32);
                    return (
                      <View key={i} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
                        <View style={{ width: "100%", height: h, backgroundColor: i === section.sparkline.length - 1 ? colors.primary : colors.border, borderRadius: 2 }} />
                      </View>
                    );
                  })}
                </View>
              )}
              {section.rows.map((row, i) => (
                <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginTop: i === 0 ? 8 : 0 }}>
                  <AppText variant="small" muted style={{ flex: 1 }}>{row.label}</AppText>
                  <AppText variant="small" weight="semibold" color={row.tone} style={{ textAlign: "right" }}>{row.value}</AppText>
                </View>
              ))}
            </>
          )}
          <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: "row", alignItems: "flex-start", gap: 5 }}>
            <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} style={{ marginTop: 1 }} />
            <AppText variant="caption" muted style={{ flex: 1 }}>
              {`Source: ${section.source}${section.freshSince ? ` · As of ${section.freshSince}` : ""}`}
            </AppText>
          </View>
        </View>
      )}
    </Card>
  );
}

export function OwnerDailyReport({ navigation }) {
  const [expanded, setExpanded] = React.useState(() => new Set(["fleetNow", "exceptions"]));
  const toggle = (id) => setExpanded((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const { generatedAt, date, sections } = DAILY_REPORT_MOCK;

  return (
    <ManagerPage navigation={navigation} title="Aaj ka hisaab" subtitle={`${date} · Generated ${generatedAt}`} allowEmpty>
      <Card style={{ backgroundColor: colors.infoBg, borderColor: colors.border }}>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.primaryDeep} style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <AppText variant="small" weight="semibold" color={colors.primaryDeep}>Honesty contract</AppText>
            <AppText variant="small" muted style={{ marginTop: 2 }}>
              Every number comes from a named source. Missing result = "no data", never a silent zero. Where two sources disagree, both are shown with the gap.
            </AppText>
          </View>
        </View>
      </Card>

      {sections.map((section) => (
        <ReportSection
          key={section.id}
          section={section}
          expanded={expanded.has(section.id)}
          onToggle={() => toggle(section.id)}
        />
      ))}

      <AppText variant="small" muted style={{ textAlign: "center", marginTop: 4 }}>
        Mock data · O-02 backend endpoint not built yet
      </AppText>
    </ManagerPage>
  );
}

export function DeferredTeam({ navigation }) {
  return <ManagerPage navigation={navigation} title="Team & access" subtitle="Planned for a later integration."><Card style={s.digest}><Ionicons name="people-outline" size={42} color={colors.primary} /><AppText variant="h2">Team management is coming later.</AppText><AppText muted>Creating users, invitations and permission changes are not available in this build. You can explore driver profiles from More → Drivers.</AppText></Card><Button label="View drivers" variant="secondary" onPress={() => navigation.navigate('Drivers')} /></ManagerPage>;
}
const s = StyleSheet.create({ hero: { padding: 24, gap: 12, borderRadius: radius.xl }, heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, cost: { padding: 24, gap: 12, borderColor: colors.border }, digest: { padding: 24, gap: 16, borderColor: colors.border }, digestIcon: { backgroundColor: colors.blueTint, width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' } });
