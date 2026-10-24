import React, { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, RefreshControl, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { AppText, Card, Button, TextField, colors, radius, spacing } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useDriverData } from '../context/DriverDataContext';
import { DutyCard, KpiCard, SectionHeading, VehicleRow, AlertRow, DataState } from '../components';

const money = (value) => `₹${Number(value).toLocaleString('en-IN')}`;
const date = (value) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export function Page({ navigation, title, subtitle, children, action, allowEmpty = false }) {
  const { data, loading, error, refresh } = useDriverData();
  const { logout } = useAuth();
  return <SafeAreaView edges={['top', 'left', 'right']} style={s.safe}><KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page} refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={refresh} tintColor={colors.primary} />}>
    <View style={s.header}>{navigation.getState().type === 'stack' && navigation.canGoBack() && <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back" style={s.back}><Ionicons name="arrow-back" size={22} color={colors.text} /></Pressable>}<View style={s.flex}><AppText variant="label" color={colors.primary}>HIGHWAY SAHAYAK</AppText><AppText variant="h1" style={s.title}>{title}</AppText>{subtitle && <AppText variant="small" muted>{subtitle}</AppText>}</View>{action}</View>

    {error && !allowEmpty ? <><AppText color={colors.error}>{error}</AppText><DataState state="error" onRetry={refresh} /><Button label="Sign out" variant="secondary" onPress={logout} /></> : !data && !allowEmpty ? <DataState state="loading" /> : !allowEmpty && !data.driver ? <DataState state="empty" /> : <View style={s.content}>
      {data?.errors && Object.entries(data.errors).map(([key, message]) => <Card key={key}><AppText color={colors.error}>{key}: {message}</AppText></Card>)}
      {!!data?.unavailable?.length && <AppText variant="caption" muted>Not connected yet: {data.unavailable.join(', ')}.</AppText>}
      {children}</View>}
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
export function MenuRow({ title, detail, icon = 'chevron-forward', onPress, danger = false }) {
  return <Card onPress={onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={title} style={s.menu}><View style={[s.menuIcon, danger && { backgroundColor: colors.expiredBg }]}><Ionicons name={icon} size={21} color={danger ? colors.error : colors.primary} /></View><View style={s.flex}><AppText weight="semibold" color={danger ? colors.error : colors.text}>{title}</AppText>{detail && <AppText variant="small" muted style={s.detail}>{detail}</AppText>}</View>{onPress && <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />}</Card>;
}
function Empty({ title, description, action }) {
  return <Card style={s.empty}><Ionicons name="file-tray-outline" size={28} color={colors.primary} /><AppText variant="h3" center>{title}</AppText><AppText muted center>{description}</AppText>{action}</Card>;
}
function SosAction({ navigation }) { return <Pressable onPress={() => navigation.navigate('SOS')} style={s.sos} accessibilityRole="button" accessibilityLabel="Open emergency help"><Ionicons name="shield-outline" size={18} color={colors.error} /><AppText variant="small" weight="bold" color={colors.error}>SOS</AppText></Pressable>; }

export function DriverHome({ navigation }) {
  const { data, preferences } = useDriverData();
  const { user } = useAuth();
  const firstName = (preferences.nickname || user?.name || user?.firstName || 'Driver').split(' ')[0];
  return <Page navigation={navigation} title={`Hello, ${firstName}.`} subtitle="A clear view of the road ahead." action={<SosAction navigation={navigation} />}>
    {data?.duty && <DutyCard driver={data.driver} />}

    <SectionHeading title="Your truck" caption="Vehicle details and location source." />
    {data?.vehicle ? <VehicleRow vehicle={data.vehicle} onPress={() => navigation.navigate('My truck')} /> : <Empty title="No truck linked" description="Ask your manager, or choose a truck." action={<Button label="Change truck" onPress={() => navigation.navigate('Change truck')} />} />}
    <View style={s.quickGrid}>{[['Add fuel', 'water-outline'], ['Report issue', 'construct-outline'], ['Documents', 'document-text-outline']].map(([title, icon]) => <Pressable key={title} style={s.quick} accessibilityRole="button" onPress={() => navigation.navigate(title)}><View style={s.quickIcon}><Ionicons name={icon} size={23} color={colors.primary} /></View><AppText variant="small" weight="semibold" center>{title}</AppText></Pressable>)}</View>
    <SectionHeading title="On your route" caption="Your latest GPS-detected trip." />
    {data?.trips[0] ? <TripCard trip={data.trips[0]} onPress={() => navigation.navigate('Trip detail', { id: data.trips[0].id })} /> : <Empty title="No trips yet" description="Your journeys will appear here." />}
    <SectionHeading title="Needs attention" />
    {data?.alerts.filter((item) => !item.acknowledged).map((alert) => <AlertRow key={alert.id} alert={alert} onPress={() => navigation.navigate('Alert detail', { id: alert.id })} />)}
<AppText muted>Driver alerts are not connected yet.</AppText>
  </Page>;
}
function TripCard({ trip, onPress }) {
  return <Card onPress={onPress} accessibilityRole="button" accessibilityLabel={`${trip.from} to ${trip.to}`} style={s.trip}>
    <View style={s.between}><AppText variant="caption" color={colors.primary} weight="semibold">{trip.status.toUpperCase()}</AppText><AppText variant="caption" muted>{date(trip.startedAt)}</AppText></View>
    <View style={s.route}><View style={s.routeLine}><View style={s.routeDot} /><View style={s.routeStem} /><View style={[s.routeDot, { backgroundColor: colors.primary }]} /></View><View style={s.flex}><AppText variant="h3">{trip.from}</AppText><AppText variant="h3" style={s.destination}>{trip.to}</AppText></View><Ionicons name="arrow-forward" size={22} color={colors.primary} /></View>
    <AppText mono muted>{trip.distanceKm} km · GPS-detected</AppText>
  </Card>;
}
export function DriverTrips({ navigation }) {
  const { data } = useDriverData();
  return <Page navigation={navigation} title="Your journeys" subtitle="Every route has a story." action={<SosAction navigation={navigation} />}>{data?.trips.length ? data.trips.map((trip) => <TripCard key={trip.id} trip={trip} onPress={() => navigation.navigate('Trip detail', { id: trip.id })} />) : <Empty title="No trips to show" description="GPS-detected trips appear here. ERP trips are separate." />}</Page>;
}
export function TripDetail({ navigation, route }) {
  const { data } = useDriverData();
  const trip = data?.trips.find((item) => item.id === route.params?.id);
  return <Page navigation={navigation} title="Trip details" subtitle="A journey, from start to finish.">{trip ? <>
    <TripCard trip={trip} />
    <Button label="Add fuel" icon="water-outline" onPress={() => navigation.navigate('Add fuel', { tripId: trip.id })} />
    {data.fuel.some((entry) => entry.tripId === trip.id) && <SectionHeading title="Fuel for this trip" />}
    {data.fuel.filter((entry) => entry.tripId === trip.id).map((entry) => <MenuRow key={entry.id} title={entry.station || entry.title} detail={`${entry.litres} L · ${money(entry.amountInr)} · ${entry.status}`} icon="water-outline" />)}
    <Card><AppText muted>Route map and stop notes are not connected yet.</AppText></Card>
  </> : <Empty title="Trip unavailable" description="Return to Trips and choose a journey." />}</Page>;
}
export function DriverInbox({ navigation }) {
  const { data } = useDriverData();
  const [filter, setFilter] = useState('All');
  const alerts = data?.alerts.filter((item) => filter === 'All' || !item.acknowledged) || [];
  return <Page navigation={navigation} title="Your inbox" subtitle="Only the updates that matter."><View style={s.filters}>{['All', 'Unread'].map((item) => <Pressable key={item} style={[s.filter, filter === item && s.activeFilter]} accessibilityRole="button" accessibilityState={{ selected: filter === item }} onPress={() => setFilter(item)}><AppText weight="semibold" color={filter === item ? colors.white : colors.textMuted}>{item}</AppText></Pressable>)}</View>{alerts.map((alert) => <AlertRow key={alert.id} alert={alert} onPress={() => navigation.navigate('Alert detail', { id: alert.id })} />)}{!alerts.length && <Empty title="All caught up" description="There are no alerts in this view." />}</Page>;
}
export function AlertDetail({ navigation, route }) {
  const { data, mutate } = useDriverData();
  const alert = data?.alerts.find((item) => item.id === route.params?.id);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function acknowledge() { setBusy(true); setError(''); try { await mutate((service) => service.acknowledgeAlert(alert.id)); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <Page navigation={navigation} title="Alert details">{alert ? <><AlertRow alert={alert} /><Card><AppText muted>Driver alerts are not connected yet.</AppText></Card>{error ? <AppText accessibilityRole="alert" color={colors.error}>{error}</AppText> : null}<Button label={alert.acknowledged ? 'Acknowledged' : 'Acknowledge'} disabled={alert.acknowledged} loading={busy} onPress={acknowledge} /></> : <Empty title="Alert unavailable" description="Return to your inbox." />}</Page>;
}
export function MyTruck({ navigation }) {
  const { data } = useDriverData();
  return <Page navigation={navigation} title="My truck" subtitle="Your vehicle. Your working day.">{data?.vehicle ? <><VehicleRow vehicle={data.vehicle} /><MenuRow title="Odometer" detail={`${data.vehicle.odometerKm == null ? "Unavailable" : `${data.vehicle.odometerKm.toLocaleString('en-IN')} km`}`} icon="speedometer-outline" /><MenuRow title="Location sharing" detail="Understand where this position comes from" icon="location-outline" onPress={() => navigation.navigate('Location sharing')} /></> : <Empty title="No truck linked" description="Ask your manager to update your truck assignment." />}<Button label="Change truck" icon="swap-horizontal" onPress={() => navigation.navigate('Change truck')} /></Page>;
}
export function ChangeTruck({ navigation }) {
  return <Page navigation={navigation} title="Change truck"><Empty title="Truck pairing is not connected yet" description="Ask your manager to update your assignment. Trucks cannot be linked without verified location evidence." /></Page>;
}
const actions = [['Add fuel', 'water-outline', 'Record litres and a receipt'], ['Report issue', 'construct-outline', 'Tell your manager what needs attention'], ['Workshop bill', 'receipt-outline', 'Simulate a workshop bill scan'], ['Explain a stop', 'pause-circle-outline', 'Add context to a stop'], ['SOS', 'shield-outline', 'Emergency flow simulation only']];
export function QuickAdd({ navigation }) {
  return <Page navigation={navigation} title="What would you like to add?" subtitle="Simple steps. Back to the road.">{actions.map(([title, icon, detail]) => <MenuRow key={title} title={title} icon={icon} detail={detail} danger={title === 'SOS'} onPress={() => navigation.replace(title)} />)}</Page>;
}
export function DriverMore({ navigation }) {
  const items = [['My truck', 'bus-outline'], ['Location sharing', 'location-outline'], ['Documents', 'document-text-outline'], ['Fuel history', 'water-outline'], ['My issues', 'construct-outline'], ['Workshop bills', 'receipt-outline'], ['Support', 'help-circle-outline'], ['Profile', 'person-outline']];
  return <Page navigation={navigation} title="Everything else" subtitle="Your essentials, in one place.">{items.map(([title, icon]) => <MenuRow key={title} title={title} icon={icon} onPress={() => navigation.navigate(title)} />)}</Page>;
}
function Success({ title, description, onDone }) {
  return <Card style={s.empty}><View style={s.successIcon}><Ionicons name="checkmark" size={32} color={colors.success} /></View><AppText variant="h2" center>{title}</AppText><AppText muted center>{description}</AppText><Button label="Done" onPress={onDone} /></Card>;
}
export function CaptureForm({ navigation, route }) {
  const { data, mutate } = useDriverData();
  const kind = route.name;
  const isFuel = kind === 'Add fuel'; const isBill = kind === 'Workshop bill'; const isSupport = kind === 'Support'; const isStop = kind === 'Explain a stop';
  const [title, setTitle] = useState(''); const [amount, setAmount] = useState(''); const [litres, setLitres] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  const stops = data?.stops.filter((stop) => data.trips.some((trip) => trip.id === stop.tripId)) || [];
  const [chosenStop, setChosenStop] = useState(route.params?.stopId || null);
  const stop = stops.find((item) => item.id === chosenStop);
  const trip = isFuel ? data?.trips.find((item) => item.id === route.params?.tripId) : null;
  const invalidTrip = isFuel && !!route.params?.tripId && !trip;
  const fuelVehicle = trip ? data?.vehicles.find((item) => item.id === trip.vehicleId) : data?.vehicle;
  const vehicleId = isStop ? stop?.vehicleId : isFuel ? fuelVehicle?.id : data?.vehicle?.id;
  const linked = !invalidTrip && (isSupport || kind === 'Report issue' || !!vehicleId);
  async function submit() {
    setError('');
    if (invalidTrip) { setError('This trip is unavailable. Return to Trips and choose it again.'); return; }
    if (!linked) { setError(isStop ? 'Choose a stop.' : 'Link a truck first.'); return; }
    const quantity = Number(litres); const cost = Number(amount);
    if (isSupport && title.trim().length < 10) { setError('Describe the request in at least 10 characters.'); return; }
    if (!title.trim()) { setError(isFuel ? 'Enter the fuel station.' : 'Add a short description.'); return; }
    if ((isFuel || isBill) && (!Number.isFinite(cost) || cost <= 0)) { setError('Enter a valid positive amount.'); return; }
    if (isFuel && (!Number.isFinite(quantity) || quantity <= 0)) { setError('Enter a valid positive fuel quantity.'); return; }
    setBusy(true);
    try {
      await mutate((service) => service.submit(isFuel ? 'fuel' : isBill ? 'bills' : isSupport ? 'support' : isStop ? 'stopNotes' : 'issues', { vehicleId, tripId: isFuel ? trip?.id : undefined, driverId: data?.driver?.id, title: title.trim(), station: isFuel ? title.trim() : undefined, litres: isFuel ? quantity : undefined, amountInr: isFuel || isBill ? cost : undefined, stopId: isStop ? stop.id : undefined }));
      setDone(true);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  if (isBill || isStop) return <Page navigation={navigation} title={kind}><Empty title="Submission is not connected yet" description="This action will be enabled after assignment validation and upload integration are complete. Nothing has been saved." />{trip && <MenuRow title={`${trip.from} → ${trip.to}`} detail="Selected trip" icon="navigate-outline" />}</Page>;
  return <Page navigation={navigation} title={kind} subtitle="Record an update. Your entry is sent to your organization.">{done ? <Success title="Saved" description={isBill ? 'OCR completed. The bill is pending review in Workshop bills.' : isSupport ? 'Your support ticket was submitted to the server.' : 'Your entry was saved to the server.'} onDone={() => navigation.goBack()} /> : <>
    {invalidTrip && <Empty title="Trip unavailable" description="Return to Trips and choose the trip again." />}
    {trip && <MenuRow title={`${trip.from} → ${trip.to}`} detail="Fuel will be recorded for this trip" icon="navigate-outline" />}
    {!linked && !invalidTrip && !isStop && <Empty title="Link a truck first" description="A fuel, issue or bill entry needs a vehicle." action={<Button label="Choose truck" onPress={() => navigation.navigate('Change truck')} />} />}
    {(isFuel ? fuelVehicle : data?.vehicle) && !isSupport && !isStop && <MenuRow title={(isFuel ? fuelVehicle : data.vehicle).plate} detail="vehicle" icon="bus-outline" />}
    {isStop && <><AppText variant="label" muted>CHOOSE A STOP</AppText>{stops.map((item) => <MenuRow key={item.id} title={item.location} detail={`${item.durationMinutes} minutes${chosenStop === item.id ? ' · Selected' : ''}`} icon={chosenStop === item.id ? 'radio-button-on' : 'radio-button-off'} onPress={() => setChosenStop(item.id)} />)}{!stops.length && <DataState state="empty" />}</>}
    <Card style={s.form} padding={spacing.lg}>
      <TextField label={isFuel ? 'Fuel station' : isBill ? 'Workshop / description' : 'What happened?'} accessibilityLabel={isFuel ? 'Fuel station' : 'Description'} placeholder={isFuel ? 'e.g. Highway fuel station' : 'Add a short description'} value={title} onChangeText={setTitle} multiline={!isFuel} maxLength={500} />
      {isFuel && <TextField label="Fuel quantity" accessibilityLabel="Fuel quantity in litres" value={litres} onChangeText={setLitres} placeholder="0.00" keyboardType="decimal-pad" unit="L" mono />}
      {(isFuel || isBill) && <TextField label="Total amount" accessibilityLabel="Amount in rupees" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" unit="₹" mono />}

    </Card>
    {error ? <AppText accessibilityRole="alert" color={colors.error}>{error}</AppText> : null}
    <Button label={isBill ? 'Save bill' : 'Save entry'} loading={busy} disabled={!linked} onPress={submit} />
    {isSupport && <><SectionHeading title="support tickets" />{data?.support.map((ticket) => <MenuRow key={ticket.id} title={ticket.title} detail={`${ticket.status} · ${date(ticket.createdAt)}`} icon="chatbubble-outline" />)}{!data?.support.length && <AppText muted>No tickets yet.</AppText>}</>}
  </>}</Page>;
}
export function RecordsScreen({ navigation, route }) {
  const { data } = useDriverData(); const kind = route.name;
  const resource = kind === 'Fuel history' ? 'fuel' : kind === 'My issues' ? 'issues' : 'bills';
  const rows = data?.[resource] || [];
  return <Page navigation={navigation} title={kind} subtitle="entries from this session."><Button label={resource === 'fuel' ? 'Add fuel' : resource === 'issues' ? 'Report issue' : 'Add workshop bill'} variant="secondary" icon="add" onPress={() => navigation.navigate(resource === 'fuel' ? 'Add fuel' : resource === 'issues' ? 'Report issue' : 'Workshop bill')} />{rows.map((item) => <MenuRow key={item.id} title={item.station || item.title} detail={`${item.litres ? `${item.litres} L · ` : ''}${item.amountInr ? `${money(item.amountInr)} · ` : ''}${item.status} · ${date(item.createdAt)}`} icon={resource === 'fuel' ? 'water-outline' : resource === 'issues' ? 'construct-outline' : 'receipt-outline'} />)}{!rows.length && <Empty title="No entries yet" description="Add a entry to see it here." />}</Page>;
}
export function Documents({ navigation }) {
  const { data } = useDriverData(); const [scope, setScope] = useState('Personal');
  const documents = data?.documents.filter((item) => scope === 'Personal' ? !!item.driverId : !!item.vehicleId) || [];
  return <Page navigation={navigation} title="Your documents" subtitle="Personal and vehicle essentials."><View style={s.filters}>{['Personal', 'Vehicle'].map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: item === scope }} style={[s.filter, scope === item && s.activeFilter]} onPress={() => setScope(item)}><AppText color={scope === item ? colors.white : colors.textMuted}>{item}</AppText></Pressable>)}</View>{documents.map((item) => <MenuRow key={item.id} title={item.title} detail={`${item.status} · Expires ${date(item.expiresAt)}`} icon="document-text-outline" onPress={() => navigation.navigate('Document detail', { id: item.id })} />)}{!documents.length && <DataState state="empty" />}</Page>;
}
export function DocumentDetail({ navigation, route }) {
  const { data } = useDriverData(); const doc = data?.documents.find((item) => item.id === route.params?.id);
  return <Page navigation={navigation} title="Document details">{doc ? <><Card style={s.empty}><Ionicons name="document-text-outline" size={56} color={colors.primary} /><AppText variant="h2" center>{doc.title}</AppText><AppText color={colors.success}>{doc.status}</AppText><AppText muted>Expires {date(doc.expiresAt)}</AppText></Card><Card><AppText muted>This is a document record. No real file is attached or downloaded.</AppText></Card></> : <DataState state="empty" />}</Page>;
}
export function LocationSharing({ navigation }) {
  return <Page navigation={navigation} title="Location sharing"><MenuRow title="Phone tracking is not enabled yet" detail="Truck location, when available, is read from your assigned truck. This build does not send phone location updates." icon="location-outline" /></Page>;
}
export function Profile({ navigation }) {
  const { user, organization, logout } = useAuth();
  const { preferences, setPreferences } = useDriverData();
  const [name, setName] = useState(preferences.nickname); const [saved, setSaved] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function signOut() { setBusy(true); try { await logout(); } catch (err) { setError(err.message); setBusy(false); } }
  return <Page navigation={navigation} title="Your profile" subtitle="Your account and local preferences." allowEmpty><MenuRow title={user?.name || user?.firstName || 'Driver'} detail={`${user?.role || 'DRIVER'} · Signed-in account`} icon="person-outline" /><MenuRow title="Organization" detail={organization?.name || 'Your signed-in organization'} icon="business-outline" /><Card style={s.form}><TextField label="display preference" accessibilityLabel="display preference" placeholder="Optional nickname for this session" value={name} onChangeText={(value) => { setName(value); setSaved(false); }} maxLength={50} /><Button label={saved ? 'Preference saved locally' : 'Save preference'} variant="secondary" onPress={() => { setPreferences({ nickname: name.trim() }); setSaved(true); }} /><AppText variant="caption" muted>This preference stays for this session and updates your Home greeting. Your account name is unchanged.</AppText></Card><MenuRow title="Language" detail="English" icon="language-outline" /><MenuRow title="Appearance" detail="Nova light · Current theme" icon="sunny-outline" />{error ? <AppText color={colors.error}>{error}</AppText> : null}<Button label="Log out" variant="secondary" loading={busy} onPress={() => Alert.alert('Log out?', 'Sign out of your account on this device?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', onPress: signOut }])} /></Page>;
}
export function SosUnavailable({ navigation }) {
  return <Page navigation={navigation} title="Emergency help" allowEmpty><Empty title="SOS escalation is not connected yet" description="This app cannot notify your fleet or emergency services yet. Contact emergency services directly if you need immediate help." /><Button label="Go back" variant="secondary" onPress={() => navigation.goBack()} /></Page>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 }, page: { padding: 24, paddingBottom: 32, maxWidth: 640, width: '100%', alignSelf: 'center' }, content: { gap: 14 }, header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, paddingBottom: 8 }, title: { marginTop: 8, marginBottom: 4 }, back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: radius.full },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, sos: { minHeight: 48, paddingHorizontal: 12, borderRadius: radius.full, backgroundColor: colors.expiredBg, flexDirection: 'row', alignItems: 'center', gap: 6 }, menu: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 76, borderColor: colors.border }, menuIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center' }, detail: { marginTop: 4 }, empty: { alignItems: 'center', padding: 24, gap: 16 }, selected: { borderColor: colors.primary, backgroundColor: colors.blueTint },
  quickGrid: { flexDirection: 'row', gap: 10 }, quick: { flex: 1, minHeight: 100, alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 4, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, quickIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  trip: { gap: 18, padding: 24, borderColor: colors.border }, between: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }, route: { flexDirection: 'row', alignItems: 'center', gap: 14 }, routeLine: { alignItems: 'center' }, routeDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.primary }, routeStem: { height: 28, width: 2, backgroundColor: colors.border }, destination: { marginTop: 16 }, map: { overflow: 'hidden', borderRadius: radius.lg }, mapCaption: { padding: 16 },
  filters: { flexDirection: 'row', gap: 8 }, filter: { minHeight: 48, paddingHorizontal: 22, justifyContent: 'center', backgroundColor: colors.surface, borderRadius: radius.full }, activeFilter: { backgroundColor: colors.primary }, form: { gap: 20, borderColor: colors.border }, attachment: { minHeight: 130, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 10 }, successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.validBg, alignItems: 'center', justifyContent: 'center' }, sosSymbol: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.expiredBg, alignItems: 'center', justifyContent: 'center' },
});
