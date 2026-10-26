import React from 'react';
import { View, StyleSheet } from 'react-native';
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
  return <ManagerPage navigation={navigation} title="Owner essentials" subtitle="The tools behind the bigger picture.">{[['Drivers', 'people-outline'], ['Digest', 'sparkles-outline'], ['Fuel & AdBlue', 'water-outline'], ['Duty board', 'time-outline'], ['Fleet trips', 'navigate-outline'], ['Maintenance', 'construct-outline'], ['Fleet documents', 'document-text-outline'], ['Team & access', 'person-add-outline'], ['Owner settings', 'settings-outline']].map(([title, icon]) => <MenuRow key={title} title={title === 'Owner settings' ? 'Settings & support' : title} icon={icon} onPress={() => navigation.navigate(title)} />)}</ManagerPage>;
}
export function DeferredTeam({ navigation }) {
  return <ManagerPage navigation={navigation} title="Team & access" subtitle="Planned for a later integration."><Card style={s.digest}><Ionicons name="people-outline" size={42} color={colors.primary} /><AppText variant="h2">Team management is coming later.</AppText><AppText muted>Creating users, invitations and permission changes are not available in this build. You can explore driver profiles from More → Drivers.</AppText></Card><Button label="View drivers" variant="secondary" onPress={() => navigation.navigate('Drivers')} /></ManagerPage>;
}
const s = StyleSheet.create({ hero: { padding: 24, gap: 12, borderRadius: radius.xl }, heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, cost: { padding: 24, gap: 12, borderColor: colors.border }, digest: { padding: 24, gap: 16, borderColor: colors.border }, digestIcon: { backgroundColor: colors.blueTint, width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' } });
