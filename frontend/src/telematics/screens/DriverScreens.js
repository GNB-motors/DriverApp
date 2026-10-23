import React, { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, RefreshControl, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { AppText, Card, Button, TextField, colors, radius, spacing } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useDriverData } from '../context/DriverDataContext';
import { DEMO_DRIVER_ID } from '../services/driverView';
import { DEMO_SCENARIOS } from '../data/fixtures';
import { DemoIndicator, DutyCard, KpiCard, SectionHeading, VehicleRow, AlertRow, DataState } from '../components';

const money = (value) => `₹${Number(value).toLocaleString('en-IN')}`;
const date = (value) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export function Page({ navigation, title, subtitle, children, action, allowEmpty = false }) {
  const { data, loading, error, refresh, service } = useDriverData();
  return <SafeAreaView edges={['top', 'left', 'right']} style={s.safe}><KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page} refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={refresh} tintColor={colors.primary} />}>
    <View style={s.header}>{navigation.getState().type === 'stack' && navigation.canGoBack() && <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back" style={s.back}><Ionicons name="arrow-back" size={22} color={colors.text} /></Pressable>}<View style={s.flex}><AppText variant="label" color={colors.primary}>HIGHWAY SAHAYAK</AppText><AppText variant="h1" style={s.title}>{title}</AppText>{subtitle && <AppText variant="small" muted>{subtitle}</AppText>}</View>{action}</View>
    <DemoIndicator />
    {error && !allowEmpty ? <DataState state="error" onRetry={() => { service.setScenario('ready'); refresh(); }} /> : !data && !allowEmpty ? <DataState state="loading" /> : !allowEmpty && !data.driver ? <DataState state="empty" /> : <View style={s.content}>{children}</View>}
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
export function MenuRow({ title, detail, icon = 'chevron-forward', onPress, danger = false }) {
  return <Card onPress={onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={title} style={s.menu}><View style={[s.menuIcon, danger && { backgroundColor: colors.expiredBg }]}><Ionicons name={icon} size={21} color={danger ? colors.error : colors.primary} /></View><View style={s.flex}><AppText weight="semibold" color={danger ? colors.error : colors.text}>{title}</AppText>{detail && <AppText variant="small" muted style={s.detail}>{detail}</AppText>}</View>{onPress && <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />}</Card>;
}
function Empty({ title, description, action }) {
  return <Card style={s.empty}><Ionicons name="file-tray-outline" size={28} color={colors.primary} /><AppText variant="h3" center>{title}</AppText><AppText muted center>{description}</AppText>{action}</Card>;
}
function SosAction({ navigation }) { return <Pressable onPress={() => navigation.navigate('SOS')} style={s.sos} accessibilityRole="button" accessibilityLabel="Open simulated SOS"><Ionicons name="shield-outline" size={18} color={colors.error} /><AppText variant="small" weight="bold" color={colors.error}>SOS</AppText></Pressable>; }

export function DriverHome({ navigation }) {
  const { data, preferences } = useDriverData();
  const { user } = useAuth();
  const firstName = (preferences.nickname || user?.name || user?.firstName || 'Driver').split(' ')[0];
  return <Page navigation={navigation} title={`Hello, ${firstName}.`} subtitle="A clear view of the road ahead." action={<SosAction navigation={navigation} />}>
    {data?.driver && <DutyCard driver={data.driver} />}
    <View style={s.metrics}><KpiCard label="Distance today" value="184" unit="km" icon="navigate-outline" caption="Sample trip distance" /><KpiCard label="Fuel efficiency" value="3.8" unit="km/L" icon="water-outline" caption="Sample trip average" /></View>
    <SectionHeading title="Your truck" caption="Vehicle details and location source." />
    {data?.vehicle ? <VehicleRow vehicle={data.vehicle} onPress={() => navigation.navigate('My truck')} /> : <Empty title="No truck linked" description="Ask your manager, or choose a sample truck." action={<Button label="Change truck" onPress={() => navigation.navigate('Change truck')} />} />}
    <View style={s.quickGrid}>{[['Add fuel', 'water-outline'], ['Report issue', 'construct-outline'], ['Documents', 'document-text-outline']].map(([title, icon]) => <Pressable key={title} style={s.quick} accessibilityRole="button" onPress={() => navigation.navigate(title)}><View style={s.quickIcon}><Ionicons name={icon} size={23} color={colors.primary} /></View><AppText variant="small" weight="semibold" center>{title}</AppText></Pressable>)}</View>
    <SectionHeading title="On your route" caption="Your latest GPS-detected sample trip." />
    {data?.trips[0] ? <TripCard trip={data.trips[0]} onPress={() => navigation.navigate('Trip detail', { id: data.trips[0].id })} /> : <Empty title="No trips yet" description="Your sample journeys will appear here." />}
    <SectionHeading title="Needs attention" />
    {data?.alerts.filter((item) => !item.acknowledged).map((alert) => <AlertRow key={alert.id} alert={alert} onPress={() => navigation.navigate('Alert detail', { id: alert.id })} />)}
    {!data?.alerts.some((item) => !item.acknowledged) && <MenuRow title="You’re all caught up" detail="No pending sample alerts." icon="checkmark-circle-outline" />}
  </Page>;
}
function TripCard({ trip, onPress }) {
  return <Card onPress={onPress} accessibilityRole="button" accessibilityLabel={`${trip.from} to ${trip.to}`} style={s.trip}>
    <View style={s.between}><AppText variant="caption" color={colors.primary} weight="semibold">{trip.status.toUpperCase()}</AppText><AppText variant="caption" muted>{date(trip.startedAt)}</AppText></View>
    <View style={s.route}><View style={s.routeLine}><View style={s.routeDot} /><View style={s.routeStem} /><View style={[s.routeDot, { backgroundColor: colors.primary }]} /></View><View style={s.flex}><AppText variant="h3">{trip.from}</AppText><AppText variant="h3" style={s.destination}>{trip.to}</AppText></View><Ionicons name="arrow-forward" size={22} color={colors.primary} /></View>
    <AppText mono muted>{trip.distanceKm} km · GPS-detected sample</AppText>
  </Card>;
}
export function DriverTrips({ navigation }) {
  const { data } = useDriverData();
  return <Page navigation={navigation} title="Your journeys" subtitle="Every route has a story." action={<SosAction navigation={navigation} />}>{data?.trips.length ? data.trips.map((trip) => <TripCard key={trip.id} trip={trip} onPress={() => navigation.navigate('Trip detail', { id: trip.id })} />) : <Empty title="No trips to show" description="GPS-detected trips appear here. ERP trips are separate." />}</Page>;
}
export function TripDetail({ navigation, route }) {
  const { data } = useDriverData();
  const trip = data?.trips.find((item) => item.id === route.params?.id);
  return <Page navigation={navigation} title="Trip details" subtitle="A sample journey, from start to finish.">{trip ? <>
    <TripCard trip={trip} />
    <Card padding={0}><View style={s.map}><Svg width="100%" height={190} viewBox="0 0 320 190" accessibilityLabel="Illustrative sample route, not a geographic map"><Rect width="320" height="190" fill={colors.blueTint} />{[35, 85, 135].map((y) => <Path key={y} d={`M0 ${y} L320 ${y + 25}`} stroke={colors.surface} strokeWidth="12" />)}<Path d="M55 145 C95 160 110 48 160 72 S228 147 265 40" stroke={colors.primary} strokeWidth="5" fill="none" strokeLinecap="round" /><Circle cx="55" cy="145" r="7" fill={colors.surface} stroke={colors.primary} strokeWidth="3" /><Circle cx="265" cy="40" r="8" fill={colors.primary} /></Svg></View><View style={s.mapCaption}><AppText variant="caption" muted>Illustrative route · Not a geographic map</AppText></View></Card>
    <SectionHeading title="Stops on this journey" />
    {data.stops.filter((stop) => stop.tripId === trip.id).map((stop) => <MenuRow key={stop.id} title={stop.location} detail={`${stop.durationMinutes} min · ${stop.reason}`} icon="pause-circle-outline" onPress={() => navigation.navigate('Explain a stop', { stopId: stop.id })} />)}
    {data.stopNotes.filter((note) => data.stops.some((stop) => stop.tripId === trip.id && stop.id === note.stopId)).map((note) => <MenuRow key={note.id} title="Your stop note" detail={note.title} icon="chatbubble-outline" />)}
    <Button label="Explain a stop" variant="secondary" onPress={() => navigation.navigate('Explain a stop', { stopId: data.stops.find((stop) => stop.tripId === trip.id)?.id })} />
  </> : <Empty title="Trip unavailable" description="Return to Trips and choose a sample journey." />}</Page>;
}
export function DriverInbox({ navigation }) {
  const { data } = useDriverData();
  const [filter, setFilter] = useState('All');
  const alerts = data?.alerts.filter((item) => filter === 'All' || !item.acknowledged) || [];
  return <Page navigation={navigation} title="Your inbox" subtitle="Only the updates that matter."><View style={s.filters}>{['All', 'Unread'].map((item) => <Pressable key={item} style={[s.filter, filter === item && s.activeFilter]} accessibilityRole="button" accessibilityState={{ selected: filter === item }} onPress={() => setFilter(item)}><AppText weight="semibold" color={filter === item ? colors.white : colors.textMuted}>{item}</AppText></Pressable>)}</View>{alerts.map((alert) => <AlertRow key={alert.id} alert={alert} onPress={() => navigation.navigate('Alert detail', { id: alert.id })} />)}{!alerts.length && <Empty title="All caught up" description="There are no sample alerts in this view." />}</Page>;
}
export function AlertDetail({ navigation, route }) {
  const { data, mutate } = useDriverData();
  const alert = data?.alerts.find((item) => item.id === route.params?.id);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function acknowledge() { setBusy(true); setError(''); try { await mutate((service) => service.acknowledgeAlert(alert.id)); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <Page navigation={navigation} title="Alert details">{alert ? <><AlertRow alert={alert} /><Card><AppText muted>This is a sample alert. Acknowledging updates this demo only.</AppText></Card>{error ? <AppText accessibilityRole="alert" color={colors.error}>{error}</AppText> : null}<Button label={alert.acknowledged ? 'Acknowledged in demo' : 'Acknowledge · Demo'} disabled={alert.acknowledged} loading={busy} onPress={acknowledge} /></> : <Empty title="Alert unavailable" description="Return to your inbox." />}</Page>;
}
export function MyTruck({ navigation }) {
  const { data } = useDriverData();
  return <Page navigation={navigation} title="My truck" subtitle="Your vehicle. Your working day.">{data?.vehicle ? <><VehicleRow vehicle={data.vehicle} /><MenuRow title="Odometer" detail={`${data.vehicle.odometerKm.toLocaleString('en-IN')} km · Sample reading`} icon="speedometer-outline" /><MenuRow title="Location sharing" detail="Understand where this sample position comes from" icon="location-outline" onPress={() => navigation.navigate('Location sharing')} /></> : <Empty title="No truck linked" description="Choose a truck below to simulate an assignment." />}<Button label="Change truck" icon="swap-horizontal" onPress={() => navigation.navigate('Change truck')} /></Page>;
}
export function ChangeTruck({ navigation }) {
  const { data, mutate } = useDriverData();
  const [selected, setSelected] = useState(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  async function confirm() { setBusy(true); setError(''); try { await mutate((service) => service.assignTruck(DEMO_DRIVER_ID, selected)); setDone(true); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <Page navigation={navigation} title="Change truck" subtitle="A local demo assignment. No GPS check required.">{done ? <Success title="Sample truck linked" description="Your Home and My truck views now show the new assignment." onDone={() => navigation.goBack()} /> : <>{data?.vehicles.map((vehicle) => <Card key={vehicle.id} onPress={() => { setSelected(vehicle.id); setError(''); }} accessibilityRole="radio" accessibilityState={{ checked: selected === vehicle.id }} style={[s.menu, selected === vehicle.id && s.selected]}><Ionicons name={selected === vehicle.id ? 'radio-button-on' : 'radio-button-off'} size={23} color={colors.primary} /><View style={s.flex}><AppText mono weight="semibold">{vehicle.plate}</AppText><AppText variant="small" muted>{vehicle.driverId && vehicle.driverId !== DEMO_DRIVER_ID ? 'Assigned to another driver · Conflict demo' : vehicle.driverId ? 'Your current truck' : 'Available in demo'}</AppText></View></Card>)}{!data?.vehicles.length && <DataState state="empty" />}{selected && <Card variant="tinted"><AppText>Confirm linking {data?.vehicles.find((item) => item.id === selected)?.plate}? Your previous demo link will be removed.</AppText></Card>}{error ? <AppText accessibilityRole="alert" color={colors.error}>{error}</AppText> : null}<Button label="Confirm sample assignment" disabled={!selected} loading={busy} onPress={confirm} /></>}</Page>;
}
const actions = [['Add fuel', 'water-outline', 'Record litres and a sample receipt'], ['Report issue', 'construct-outline', 'Tell your manager what needs attention'], ['Workshop bill', 'receipt-outline', 'Simulate a workshop bill scan'], ['Explain a stop', 'pause-circle-outline', 'Add context to a sample stop'], ['SOS', 'shield-outline', 'Emergency flow simulation only']];
export function QuickAdd({ navigation }) {
  return <Page navigation={navigation} title="What would you like to add?" subtitle="Simple steps. Back to the road.">{actions.map(([title, icon, detail]) => <MenuRow key={title} title={title} icon={icon} detail={detail} danger={title === 'SOS'} onPress={() => navigation.replace(title)} />)}</Page>;
}
export function DriverMore({ navigation }) {
  const items = [['My truck', 'bus-outline'], ['Location sharing', 'location-outline'], ['Documents', 'document-text-outline'], ['Fuel history', 'water-outline'], ['My issues', 'construct-outline'], ['Workshop bills', 'receipt-outline'], ['Support', 'help-circle-outline'], ['Profile', 'person-outline']];
  return <Page navigation={navigation} title="Everything else" subtitle="Your essentials, in one place.">{items.map(([title, icon]) => <MenuRow key={title} title={title} icon={icon} onPress={() => navigation.navigate(title)} />)}{__DEV__ && <MenuRow title="Demo scenarios" detail="Development-only state controls" icon="flask-outline" onPress={() => navigation.navigate('Demo scenarios')} />}</Page>;
}
function Success({ title, description, onDone }) {
  return <Card style={s.empty}><View style={s.successIcon}><Ionicons name="checkmark" size={32} color={colors.success} /></View><AppText variant="h2" center>{title}</AppText><AppText muted center>{description}</AppText><Button label="Done" onPress={onDone} /></Card>;
}
export function CaptureForm({ navigation, route }) {
  const { data, mutate } = useDriverData();
  const kind = route.name;
  const isFuel = kind === 'Add fuel'; const isBill = kind === 'Workshop bill'; const isSupport = kind === 'Support'; const isStop = kind === 'Explain a stop';
  const [title, setTitle] = useState(''); const [amount, setAmount] = useState(''); const [litres, setLitres] = useState(''); const [evidence, setEvidence] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  const stops = data?.stops.filter((stop) => data.trips.some((trip) => trip.id === stop.tripId)) || [];
  const [chosenStop, setChosenStop] = useState(route.params?.stopId || null);
  const stop = stops.find((item) => item.id === chosenStop);
  const vehicleId = isStop ? stop?.vehicleId : data?.vehicle?.id;
  const linked = isSupport || !!vehicleId;
  async function submit() {
    setError('');
    if (!linked) { setError(isStop ? 'Choose a sample stop.' : 'Link a sample truck first.'); return; }
    const quantity = Number(litres); const cost = Number(amount);
    if (!title.trim()) { setError(isFuel ? 'Enter the fuel station.' : 'Add a short description.'); return; }
    if ((isFuel || isBill) && (!Number.isFinite(cost) || cost <= 0)) { setError('Enter a valid positive amount.'); return; }
    if (isFuel && (!Number.isFinite(quantity) || quantity <= 0)) { setError('Enter a valid positive fuel quantity.'); return; }
    if (isBill && !evidence) { setError('Attach the sample bill before submitting.'); return; }
    setBusy(true);
    try {
      await mutate((service) => service.submit(isFuel ? 'fuel' : isBill ? 'bills' : isSupport ? 'support' : isStop ? 'stopNotes' : 'issues', { vehicleId, driverId: DEMO_DRIVER_ID, title: title.trim(), station: isFuel ? title.trim() : undefined, litres: isFuel ? quantity : undefined, amountInr: isFuel || isBill ? cost : undefined, evidence: evidence ? 'sample-image-only' : null, stopId: isStop ? stop.id : undefined }));
      setDone(true);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <Page navigation={navigation} title={kind} subtitle="Save a sample record. Nothing is uploaded.">{done ? <Success title="Saved to your demo" description={isBill ? 'Sample OCR completed. The bill is pending review in Workshop bills.' : isSupport ? 'Your sample ticket is saved below. No support team was contacted.' : 'Your sample entry is saved for this session only.'} onDone={() => navigation.goBack()} /> : <>
    {!linked && !isStop && <Empty title="Link a truck first" description="A fuel, issue or bill entry needs a sample vehicle." action={<Button label="Choose truck" onPress={() => navigation.navigate('Change truck')} />} />}
    {data?.vehicle && !isSupport && !isStop && <MenuRow title={data.vehicle.plate} detail="Sample vehicle" icon="bus-outline" />}
    {isStop && <><AppText variant="label" muted>CHOOSE A SAMPLE STOP</AppText>{stops.map((item) => <MenuRow key={item.id} title={item.location} detail={`${item.durationMinutes} minutes${chosenStop === item.id ? ' · Selected' : ''}`} icon={chosenStop === item.id ? 'radio-button-on' : 'radio-button-off'} onPress={() => setChosenStop(item.id)} />)}{!stops.length && <DataState state="empty" />}</>}
    <Card style={s.form} padding={spacing.lg}>
      <TextField label={isFuel ? 'Fuel station' : isBill ? 'Workshop / description' : 'What happened?'} accessibilityLabel={isFuel ? 'Fuel station' : 'Description'} placeholder={isFuel ? 'e.g. Highway fuel station' : 'Add a short description'} value={title} onChangeText={setTitle} multiline={!isFuel} maxLength={500} />
      {isFuel && <TextField label="Fuel quantity" accessibilityLabel="Fuel quantity in litres" value={litres} onChangeText={setLitres} placeholder="0.00" keyboardType="decimal-pad" unit="L" mono />}
      {(isFuel || isBill) && <TextField label="Total amount" accessibilityLabel="Amount in rupees" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" unit="₹" mono />}
      {!isStop && <><Pressable accessibilityRole="button" onPress={() => setEvidence((value) => !value)} style={s.attachment}><Ionicons name={evidence ? 'checkmark-circle-outline' : 'camera-outline'} size={28} color={colors.primary} /><AppText weight="semibold" color={colors.primary}>{evidence ? 'Sample image attached · Tap to remove' : isBill ? 'Attach sample workshop bill' : 'Attach sample photo'}</AppText><AppText variant="caption" muted center>No camera access or upload. Uses a demo placeholder.</AppText></Pressable>{isBill && evidence && <AppText variant="small" muted>Sample scan ready. Enter the amount and description to simulate OCR review.</AppText>}</>}
    </Card>
    {error ? <AppText accessibilityRole="alert" color={colors.error}>{error}</AppText> : null}
    <Button label={isBill ? 'Simulate scan & save bill' : 'Save demo entry'} loading={busy} disabled={!linked} onPress={submit} />
    {isSupport && <><SectionHeading title="Sample support tickets" />{data?.support.map((ticket) => <MenuRow key={ticket.id} title={ticket.title} detail={`${ticket.status} · ${date(ticket.createdAt)} · Demo only`} icon="chatbubble-outline" />)}{!data?.support.length && <AppText muted>No sample tickets yet.</AppText>}</>}
  </>}</Page>;
}
export function RecordsScreen({ navigation, route }) {
  const { data } = useDriverData(); const kind = route.name;
  const resource = kind === 'Fuel history' ? 'fuel' : kind === 'My issues' ? 'issues' : 'bills';
  const rows = data?.[resource] || [];
  return <Page navigation={navigation} title={kind} subtitle="Sample entries from this session."><Button label={resource === 'fuel' ? 'Add fuel' : resource === 'issues' ? 'Report issue' : 'Add workshop bill'} variant="secondary" icon="add" onPress={() => navigation.navigate(resource === 'fuel' ? 'Add fuel' : resource === 'issues' ? 'Report issue' : 'Workshop bill')} />{rows.map((item) => <MenuRow key={item.id} title={item.station || item.title} detail={`${item.litres ? `${item.litres} L · ` : ''}${item.amountInr ? `${money(item.amountInr)} · ` : ''}${item.status} · ${date(item.createdAt)}`} icon={resource === 'fuel' ? 'water-outline' : resource === 'issues' ? 'construct-outline' : 'receipt-outline'} />)}{!rows.length && <Empty title="No entries yet" description="Add a sample entry to see it here." />}</Page>;
}
export function Documents({ navigation }) {
  const { data } = useDriverData(); const [scope, setScope] = useState('Personal');
  const documents = data?.documents.filter((item) => scope === 'Personal' ? !!item.driverId : !!item.vehicleId) || [];
  return <Page navigation={navigation} title="Your documents" subtitle="Personal and vehicle essentials."><View style={s.filters}>{['Personal', 'Vehicle'].map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: item === scope }} style={[s.filter, scope === item && s.activeFilter]} onPress={() => setScope(item)}><AppText color={scope === item ? colors.white : colors.textMuted}>{item}</AppText></Pressable>)}</View>{documents.map((item) => <MenuRow key={item.id} title={item.title} detail={`${item.status} · Expires ${date(item.expiresAt)}`} icon="document-text-outline" onPress={() => navigation.navigate('Document detail', { id: item.id })} />)}{!documents.length && <DataState state="empty" />}</Page>;
}
export function DocumentDetail({ navigation, route }) {
  const { data } = useDriverData(); const doc = data?.documents.find((item) => item.id === route.params?.id);
  return <Page navigation={navigation} title="Document details">{doc ? <><Card style={s.empty}><Ionicons name="document-text-outline" size={56} color={colors.primary} /><AppText variant="h2" center>{doc.title}</AppText><AppText color={colors.success}>{doc.status}</AppText><AppText muted>Expires {date(doc.expiresAt)}</AppText></Card><Card><AppText muted>This is a sample document record. No real file is attached or downloaded.</AppText></Card></> : <DataState state="empty" />}</Page>;
}
export function LocationSharing({ navigation }) {
  const { data } = useDriverData(); const source = data?.vehicle?.source;
  return <Page navigation={navigation} title="Location sharing" subtitle="Know where your position comes from."><MenuRow title="Demo mode · Tracking is off" detail="This app is showing sample positions. It does not access your phone location or send location updates." icon="shield-checkmark-outline" /><MenuRow title="Truck GPS" detail="The linked truck’s GPS is preferred when fresh." icon="bus-outline" /><MenuRow title="Driver’s phone" detail="In the future, phone GPS can be a clearly labelled fallback when truck GPS is stale." icon="phone-portrait-outline" /><MenuRow title="Last known" detail="An older sample position is shown with its update age." icon="time-outline" /><Card variant="tinted"><AppText>Current sample source: {source === 'truck' ? 'Truck GPS' : source === 'phone' ? 'Driver’s phone' : source === 'lastKnown' ? 'Last known' : 'No truck linked'}.</AppText></Card></Page>;
}
export function Profile({ navigation }) {
  const { user, organization, logout } = useAuth();
  const { preferences, setPreferences } = useDriverData();
  const [name, setName] = useState(preferences.nickname); const [saved, setSaved] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function signOut() { setBusy(true); try { await logout(); } catch (err) { setError(err.message); setBusy(false); } }
  return <Page navigation={navigation} title="Your profile" subtitle="Real account identity. Demo preferences."><MenuRow title={user?.name || user?.firstName || 'Driver'} detail={`${user?.role || 'DRIVER'} · Signed-in account`} icon="person-outline" /><MenuRow title="Organization" detail={organization?.name || 'Your signed-in organization'} icon="business-outline" /><Card style={s.form}><TextField label="Demo display preference" accessibilityLabel="Demo display preference" placeholder="Optional nickname for this session" value={name} onChangeText={(value) => { setName(value); setSaved(false); }} maxLength={50} /><Button label={saved ? 'Preference saved locally' : 'Save demo preference'} variant="secondary" onPress={() => { setPreferences({ nickname: name.trim() }); setSaved(true); }} /><AppText variant="caption" muted>This preference stays for this demo session and updates your Home greeting. Your account name is unchanged.</AppText></Card><MenuRow title="Language" detail="English · Telematics demo" icon="language-outline" /><MenuRow title="Appearance" detail="Nova light · Current demo theme" icon="sunny-outline" />{error ? <AppText color={colors.error}>{error}</AppText> : null}<Button label="Log out" variant="secondary" loading={busy} onPress={() => Alert.alert('Log out?', 'Your sample entries will be cleared. No location tracking is running in this demo.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', onPress: signOut }])} /></Page>;
}
export function DemoScenarios({ navigation }) {
  const { service, refresh } = useDriverData();
  const [selected, setSelected] = useState('ready');
  return <Page navigation={navigation} title="Demo scenarios" subtitle="Development-only sample data controls." allowEmpty>
    <AppText muted>Choose a scenario, then return to Home. Ready restores normal responses without deleting local entries. Reset clears all demo entries.</AppText>
    {DEMO_SCENARIOS.filter((item) => item !== 'loading').map((item) => <MenuRow key={item} title={item} detail={selected === item ? 'Selected' : 'Apply sample scenario'} icon={selected === item ? 'radio-button-on' : 'radio-button-off'} onPress={() => { service.setScenario(item); setSelected(item); refresh(); }} />)}
    <Button label="Reset demo data" variant="secondary" onPress={() => { service.reset(); setSelected('ready'); refresh(); }} />
  </Page>;
}
export function SosSimulation({ navigation }) {
  const [done, setDone] = useState(false);
  return <Page navigation={navigation} title="SOS simulation" subtitle="Practice the flow. No emergency is sent.">{done ? <Success title="Simulation complete" description="No manager, emergency service or contact was notified. This was a demo only." onDone={() => navigation.goBack()} /> : <><Card style={s.empty}><View style={s.sosSymbol}><Ionicons name="shield-outline" size={42} color={colors.error} /></View><AppText variant="h2" center>Try the SOS flow</AppText><AppText muted center>This screen cannot request help. It demonstrates what a future emergency flow could look like.</AppText></Card><Button label="Simulate SOS · No message sent" variant="danger" onPress={() => Alert.alert('Run SOS simulation?', 'No call, message, push notification or emergency request will be sent.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Simulate', onPress: () => setDone(true) }])} /><Button label="Go back" variant="ghost" onPress={() => navigation.goBack()} /></>}</Page>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 }, page: { padding: 24, paddingBottom: 32, maxWidth: 640, width: '100%', alignSelf: 'center' }, content: { gap: 14 }, header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, paddingBottom: 8 }, title: { marginTop: 8, marginBottom: 4 }, back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: radius.full },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, sos: { minHeight: 48, paddingHorizontal: 12, borderRadius: radius.full, backgroundColor: colors.expiredBg, flexDirection: 'row', alignItems: 'center', gap: 6 }, menu: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 76, borderColor: colors.border }, menuIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center' }, detail: { marginTop: 4 }, empty: { alignItems: 'center', padding: 24, gap: 16 }, selected: { borderColor: colors.primary, backgroundColor: colors.blueTint },
  quickGrid: { flexDirection: 'row', gap: 10 }, quick: { flex: 1, minHeight: 100, alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 4, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, quickIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  trip: { gap: 18, padding: 24, borderColor: colors.border }, between: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }, route: { flexDirection: 'row', alignItems: 'center', gap: 14 }, routeLine: { alignItems: 'center' }, routeDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.primary }, routeStem: { height: 28, width: 2, backgroundColor: colors.border }, destination: { marginTop: 16 }, map: { overflow: 'hidden', borderRadius: radius.lg }, mapCaption: { padding: 16 },
  filters: { flexDirection: 'row', gap: 8 }, filter: { minHeight: 48, paddingHorizontal: 22, justifyContent: 'center', backgroundColor: colors.surface, borderRadius: radius.full }, activeFilter: { backgroundColor: colors.primary }, form: { gap: 20, borderColor: colors.border }, attachment: { minHeight: 130, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 10 }, successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.validBg, alignItems: 'center', justifyContent: 'center' }, sosSymbol: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.expiredBg, alignItems: 'center', justifyContent: 'center' },
});
