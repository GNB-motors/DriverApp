import React, { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, RefreshControl, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText, Card, Button, TextField, colors, radius } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useManagerData } from '../context/ManagerDataContext';
import { VehicleRow, DriverRow, AlertRow, KpiCard, SectionHeading, DataState, DutyCard } from '../components';
import FleetMap from '../components/FleetMap';
import { MenuRow } from './DriverScreens';

const money = (value) => `₹${Number(value).toLocaleString('en-IN')}`;
const date = (value) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
export function ManagerPage({ navigation, title, subtitle, children }) {
  const { data, loading, error, refresh, service, branchId, branches, roleLabel, selectBranch } = useManagerData();
  return <SafeAreaView edges={['top', 'left', 'right']} style={s.safe}><KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page} refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={refresh} tintColor={colors.primary} />}>
    <View style={s.header}>{navigation.getState().type === 'stack' && navigation.canGoBack() && <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={s.back}><Ionicons name="arrow-back" size={22} color={colors.text} /></Pressable>}<View style={s.flex}><AppText variant="label" color={colors.primary}>{roleLabel}</AppText><AppText variant="h1" style={s.title}>{title}</AppText>{subtitle && <AppText variant="small" muted>{subtitle}</AppText>}</View></View>
    <View style={s.branchRow}><Ionicons name="business-outline" size={17} color={colors.textMuted} />{branches.map((branch) => <Pressable key={branch.id} accessibilityRole="button" accessibilityState={{ selected: branchId === branch.id }} style={[s.branch, branchId === branch.id && s.branchSelected]} onPress={() => selectBranch(branch.id)}><AppText variant="small" weight="semibold" color={branchId === branch.id ? colors.white : colors.textMuted}>{branch.name}</AppText></Pressable>)}</View><AppText variant="caption" muted style={s.branchNote}>Branch access is enforced by the server</AppText>
    <View style={s.content}>{error ? <DataState state="error" onRetry={refresh} /> : !data ? <DataState state="loading" /> : <>{Object.entries(data.errors || {}).map(([key, message]) => <Card key={key}><AppText color={colors.error}>{key}: {message}</AppText></Card>)}{!!data.unavailable?.length && <AppText muted>Not connected yet: {data.unavailable.join(', ')}. Totals cover connected resources only.</AppText>}{children}</>}</View>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
export function ManagerHome({ navigation }) {
  const { data, branchId } = useManagerData();
  const pending = data ? data.fuel.filter((item) => item.status === 'Pending review').length + data.bills.filter((item) => item.status === 'Pending review').length : 0;
  return <ManagerPage navigation={navigation} title="Your fleet, in focus." subtitle="The overview you need. The actions that matter.">
    <LinearGradient colors={colors.heroGradient} style={s.hero}><AppText variant="caption" color={colors.onPrimaryMuted}>{branchId.toUpperCase()} · LOADED RECORDS</AppText><AppText variant="display" color={colors.white}>{data?.vehicles.length || 0} trucks.</AppText><AppText color={colors.onPrimaryMuted}>{data?.vehicles.filter((v) => v.status === 'moving').length || 0} moving · {data?.vehicles.filter((v) => v.status === 'offline').length || 0} offline</AppText><Button label="Explore fleet" variant="secondary" onPress={() => navigation.navigate('Fleet')} style={s.heroButton} /></LinearGradient>
    <View style={s.metrics}><KpiCard value={data?.drivers.length || 0} label="Drivers" icon="people-outline" caption="In selected branch" /><KpiCard value={pending} label="To review" icon="receipt-outline" caption="Fuel and workshop bills" /></View>
    <SectionHeading title="Needs attention" caption="Exceptions worth a closer look." />
    {data?.alerts.filter((item) => !item.acknowledged).map((alert) => <AlertRow key={alert.id} alert={alert} onPress={() => navigation.navigate('Manager alert', { id: alert.id })} />)}
    {data && !data.errors.alerts && !data.alerts.some((item) => !item.acknowledged) && <Empty title="All caught up" detail="No pending alerts in this branch." />}
    <SectionHeading title="Keep things moving" />
    <MenuRow title="Duty board" detail="Driving, resting and truck links" icon="time-outline" onPress={() => navigation.navigate('Duty board')} />
    <MenuRow title="Review fuel slips" detail={`${pending} items across fuel and bills`} icon="water-outline" onPress={() => navigation.navigate('Fuel review')} />
    <MenuRow title="Maintenance & issues" detail="Track repairs and workshop bills" icon="construct-outline" onPress={() => navigation.navigate('Maintenance')} />
  </ManagerPage>;
}
function Empty({ title = 'Nothing to show', detail = 'No records in this branch.' }) { return <Card style={s.empty}><Ionicons name="checkmark-circle-outline" size={30} color={colors.primary} /><AppText variant="h3" center>{title}</AppText><AppText muted center>{detail}</AppText></Card>; }
export function ManagerLive({ navigation }) {
  const { data } = useManagerData();
  const [filter, setFilter] = useState('all');
  const vehicles = data?.vehicles.filter((v) => filter === 'all' || v.status === filter) || [];
  return <ManagerPage navigation={navigation} title="Fleet positions" subtitle="A view of your trucks on the road."><FleetMap vehicles={vehicles} /><Filters values={['all', 'moving', 'stopped', 'idling', 'offline']} selected={filter} onSelect={setFilter} />{vehicles.map((v, i) => <View key={v.id} style={s.content}><AppText variant="caption" muted>MARKER {i + 1}</AppText><VehicleRow vehicle={v} onPress={() => navigation.navigate('Vehicle detail', { id: v.id })} /></View>)}{!vehicles.length && <Empty />}</ManagerPage>;
}
export function Fleet({ navigation }) {
  const { data } = useManagerData(); const [search, setSearch] = useState('');
  const vehicles = data?.vehicles.filter((v) => `${v.plate} ${v.model}`.toLowerCase().includes(search.trim().toLowerCase())) || [];
  return <ManagerPage navigation={navigation} title="Your fleet" subtitle="Every truck, one clear view."><TextField accessibilityLabel="Search vehicles" label="Search vehicles" value={search} onChangeText={setSearch} placeholder="Plate or model" icon="search-outline" />{vehicles.map((v) => <VehicleRow key={v.id} vehicle={v} onPress={() => navigation.navigate('Vehicle detail', { id: v.id })} />)}{!vehicles.length && <Empty />}</ManagerPage>;
}
export function VehicleDetail({ navigation, route }) {
  const { data } = useManagerData(); const vehicle = data?.vehicles.find((v) => v.id === route.params?.id); const driver = data?.drivers.find((d) => d.id === vehicle?.driverId);
  return <ManagerPage navigation={navigation} title="Vehicle details" subtitle="Position, people and pending work.">{vehicle ? <><VehicleRow vehicle={vehicle} /><FleetMap vehicles={[vehicle]} trail /><AppText variant="caption" muted>Dashed line is a trail, not recorded travel history.</AppText><MenuRow title={driver?.name || 'No driver linked'} detail={driver ? 'Open driver details' : 'Link a driver from this branch'} icon="person-outline" onPress={() => navigation.navigate(driver ? 'Driver detail' : 'Truck handover', driver ? { id: driver.id } : { vehicleId: vehicle.id })} /><MenuRow title="Odometer" detail={`${vehicle.odometerKm == null ? 'Unavailable' : vehicle.odometerKm.toLocaleString('en-IN')} km · reading`} icon="speedometer-outline" /><Button label="Link / hand over truck" variant="secondary" onPress={() => navigation.navigate('Truck handover', { vehicleId: vehicle.id })} /><SectionHeading title="Recent trips" />{data.trips.filter((t) => t.vehicleId === vehicle.id).map((t) => <MenuRow key={t.id} title={`${t.from} → ${t.to}`} detail={`${t.distanceKm} km · ${t.status}`} icon="navigate-outline" onPress={() => navigation.navigate('Manager trip', { id: t.id })} />)}{!data.trips.some((t) => t.vehicleId === vehicle.id) && <AppText muted>No trips for this truck.</AppText>}</> : <Unavailable />}</ManagerPage>;
}
export function Drivers({ navigation, route }) {
  const { data } = useManagerData(); const duty = route.name === 'Duty board';
  const [filter, setFilter] = useState('All');
  const drivers = data?.drivers.filter((d) => filter === 'All' || (filter === 'Unlinked' ? !d.vehicleId : d.state === filter)) || [];
  return <ManagerPage navigation={navigation} title={duty ? 'Duty board' : 'Your drivers'} subtitle="People behind every kilometre."><Filters values={['All', 'Driving', 'Resting', 'Unlinked']} selected={filter} onSelect={setFilter} />{drivers.map((driver) => <Pressable key={driver.id} accessibilityRole="button" accessibilityLabel={`Open ${driver.name}`} onPress={() => navigation.navigate('Driver detail', { id: driver.id })}><DriverRow driver={driver} />{duty && <AppText variant="caption" muted style={s.dutyCaption}>{Math.floor(driver.drivingMinutes / 60)}h {driver.drivingMinutes % 60}m driving</AppText>}</Pressable>)}{!drivers.length && <Empty />}<Button label="Link a driver to a truck" variant="secondary" onPress={() => navigation.navigate('Truck handover')} /></ManagerPage>;
}
export function DriverDetail({ navigation, route }) {
  const { data } = useManagerData(); const driver = data?.drivers.find((d) => d.id === route.params?.id); const vehicle = data?.vehicles.find((v) => v.id === driver?.vehicleId);
  return <ManagerPage navigation={navigation} title="Driver details">{driver ? <><DriverRow driver={driver} /><DutyCard driver={driver} />{vehicle ? <VehicleRow vehicle={vehicle} onPress={() => navigation.navigate('Vehicle detail', { id: vehicle.id })} /> : <Empty title="No truck linked" detail="Choose a truck below to request an assignment." />}<Button label="Link / change truck" onPress={() => navigation.navigate('Truck handover', { driverId: driver.id })} /></> : <Unavailable />}</ManagerPage>;
}
export function Handover({ navigation }) {
  return <ManagerPage navigation={navigation} title="Truck handover"><Card><AppText muted>Truck handover is not connected yet. Use the web dashboard to change assignments.</AppText></Card></ManagerPage>;
}
export function Alerts({ navigation }) {
  const { data } = useManagerData(); const [filter, setFilter] = useState('Pending');
  const alerts = data?.alerts.filter((item) => filter === 'All' || !item.acknowledged) || [];
  return <ManagerPage navigation={navigation} title="Fleet alerts" subtitle="From exceptions to clear next steps."><Filters values={['Pending', 'All']} selected={filter} onSelect={setFilter} />{alerts.map((alert) => <AlertRow key={alert.id} alert={alert} onPress={() => navigation.navigate('Manager alert', { id: alert.id })} />)}{!alerts.length && <Empty title="All caught up" />}</ManagerPage>;
}
export function AlertDetail({ navigation, route }) {
  const { data, mutate } = useManagerData(); const alert = data?.alerts.find((a) => a.id === route.params?.id); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function acknowledge() { setBusy(true); setError(''); try { await mutate((service, branchId) => service.acknowledgeAlert(alert.id, { branchId })); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <ManagerPage navigation={navigation} title="Alert details">{alert ? <><AlertRow alert={alert} /><MenuRow title="Related truck" detail={data.vehicles.find((v) => v.id === alert.vehicleId)?.plate} icon="bus-outline" onPress={() => navigation.navigate('Vehicle detail', { id: alert.vehicleId })} /><AppText muted>Acknowledgement is saved to the server.</AppText>{error ? <AppText color={colors.error}>{error}</AppText> : null}<Button label={alert.acknowledged ? 'Acknowledged' : 'Acknowledge'} loading={busy} disabled={alert.acknowledged} onPress={acknowledge} /></> : <Unavailable />}</ManagerPage>;
}
export function Reviews({ navigation, route }) {
  const { data } = useManagerData(); const isFuel = route.name === 'Fuel review'; const [filter, setFilter] = useState('Pending');
  const resources = isFuel ? ['fuel'] : ['issues', 'bills'];
  return <ManagerPage navigation={navigation} title={isFuel ? 'Fuel slip review' : 'Maintenance & issues'} subtitle="Review evidence. Record a clear decision."><Filters values={['Pending', 'All']} selected={filter} onSelect={setFilter} />{resources.map((resource) => { const rows = data?.[resource].filter((item) => filter === 'All' || (resource === 'issues' ? item.status !== 'Resolved' : item.status === 'Pending review')) || []; return <View key={resource} style={s.content}>{!isFuel && <SectionHeading title={resource === 'issues' ? 'Vehicle issues' : 'Workshop bills'} />}{rows.map((item) => <MenuRow key={item.id} title={item.title || item.station} detail={`${item.amountInr ? `${money(item.amountInr)} · ` : ''}${item.status}`} icon={resource === 'fuel' ? 'water-outline' : resource === 'issues' ? 'construct-outline' : 'receipt-outline'} onPress={() => navigation.navigate('Review detail', { resource, id: item.id })} />)}{!rows.length && <Empty title={isFuel ? 'No fuel slips in this view' : 'No records in this view'} />}</View>; })}</ManagerPage>;
}
export function ReviewDetail({ navigation }) {
  return <ManagerPage navigation={navigation} title="Review details"><Card><AppText muted>Review submission and receipt uploads are not connected yet. Use the web dashboard for approvals.</AppText></Card></ManagerPage>;
}
export function Documents({ navigation }) {
  const { data } = useManagerData();
  return <ManagerPage navigation={navigation} title="Fleet documents" subtitle="A little preparation keeps things moving.">{data?.documents.map((doc) => <MenuRow key={doc.id} title={doc.title} detail={`${doc.status} · ${date(doc.expiresAt)}`} icon="document-text-outline" onPress={() => navigation.navigate('Manager document', { id: doc.id })} />)}{!data?.documents.length && <Empty />}</ManagerPage>;
}
export function DocumentDetail({ navigation, route }) {
  const { data } = useManagerData(); const doc = data?.documents.find((item) => item.id === route.params?.id);
  return <ManagerPage navigation={navigation} title="Document details">{doc ? <Card style={s.empty}><Ionicons name="document-text-outline" size={46} color={colors.primary} /><AppText variant="h2" center>{doc.title}</AppText><AppText>{doc.status} · Expires {date(doc.expiresAt)}</AppText><AppText muted center>record only. No document file is attached.</AppText></Card> : <Unavailable />}</ManagerPage>;
}
export function Trips({ navigation, route }) {
  const { data } = useManagerData(); const detail = route.name === 'Manager trip'; const trips = data?.trips.filter((t) => !detail || t.id === route.params?.id) || [];
  return <ManagerPage navigation={navigation} title={detail ? 'Trip details' : 'Fleet trips'} subtitle="GPS-detected journeys. No ERP trips.">{trips.map((trip) => <View key={trip.id} style={s.content}><MenuRow title={`${trip.from} → ${trip.to}`} detail={`${trip.distanceKm} km · ${trip.status}`} icon="navigate-outline" onPress={detail ? undefined : () => navigation.navigate('Manager trip', { id: trip.id })} />{detail && <><FleetMap vehicles={data.vehicles.filter((v) => v.id === trip.vehicleId)} trail />{data.stops.filter((stop) => stop.tripId === trip.id).map((stop) => <MenuRow key={stop.id} title={stop.location} detail={`${stop.durationMinutes} min · ${stop.reason}`} icon="pause-circle-outline" />)}</>}</View>)}{!trips.length && <Unavailable />}</ManagerPage>;
}
export function More({ navigation }) {
  return <ManagerPage navigation={navigation} title="Fleet essentials" subtitle="The rest of your working toolkit.">{[['Fleet', 'bus-outline'], ['Duty board', 'time-outline'], ['Fleet trips', 'navigate-outline'], ['Maintenance', 'construct-outline'], ['Fuel review', 'water-outline'], ['Fleet documents', 'document-text-outline'], ['Manager settings', 'settings-outline']].map(([name, icon]) => <MenuRow key={name} title={name === 'Manager settings' ? 'Settings & support' : name} icon={icon} onPress={() => navigation.navigate(name)} />)}</ManagerPage>;
}
export function Settings({ navigation }) {
  const { user, logout } = useAuth();
  const [error, setError] = useState('');
  return <ManagerPage navigation={navigation} title="Settings & support"><MenuRow title={user?.name || user?.firstName || 'Account'} detail={user?.role} icon="person-outline" />{error ? <AppText color={colors.error}>{error}</AppText> : null}<Button label="Log out" variant="secondary" onPress={async () => { try { await logout(); } catch (err) { setError(err.message); } }} /></ManagerPage>;
}

const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 }, page: { padding: 24, paddingBottom: 36, width: '100%', maxWidth: 680, alignSelf: 'center' }, header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, marginBottom: 8 }, title: { marginTop: 8, marginBottom: 4 }, back: { width: 48, height: 48, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, branchRow: { flexWrap: 'wrap', flexDirection: 'row', alignItems: 'center', gap: 8 }, branch: { minHeight: 48, paddingHorizontal: 20, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, branchSelected: { backgroundColor: colors.primary }, branchNote: { marginTop: 8, marginBottom: 20 }, content: { gap: 14 }, hero: { borderRadius: radius.xl, padding: 24, gap: 12 }, heroButton: { marginTop: 10 }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, empty: { padding: 24, alignItems: 'center', gap: 14 }, filters: { flexDirection: 'row', gap: 8, paddingBottom: 4 }, dutyCaption: { marginTop: 6, marginLeft: 16 } });
