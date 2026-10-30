import { DriverCrewCard } from "./CrewScreens";
import PushSettings from '../../components/PushSettings';
import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, Alert, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Crypto from 'expo-crypto';
import DriverScreenShell from '../components/DriverScreenShell';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card, Button, TextField, Badge, colors, radius } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useDriverData } from '../context/DriverDataContext';
import { DutyCard, SectionHeading, VehicleRow, AlertRow, DataState } from '../components';

import FleetMap from '../components/FleetMap';
import { validCoordinate } from '../components/mapGeometry';
import { capturePairingFix } from '../tracking/useDriverLocationSharing';
import { recentTrips, tripDetail, tripStatusLabel } from '../services/tripSummary';
import { formatLitres } from '../../utils/format';

const money = (value, unavailable = 'Amount unavailable') => value == null || value === '' || !Number.isFinite(Number(value))
  ? unavailable
  : `₹${Number(value).toLocaleString('en-IN')}`;
const date = (value, unavailable = 'Date unavailable') => {
  const parsed = value == null ? null : new Date(value);
  return parsed && Number.isFinite(parsed.getTime())
    ? parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : unavailable;
};

export function Page({ navigation, title, subtitle, children, action, allowEmpty = false }) {
  const { data, loading, error, refresh } = useDriverData();
  const { logout } = useAuth();
  return <DriverScreenShell navigation={navigation} title={title} subtitle={subtitle} label="HIGHWAY SAHAYAK" action={action} refreshing={loading && !!data} onRefresh={refresh}>
    {error && !allowEmpty ? <><AppText color={colors.error}>{error}</AppText><DataState state="error" onRetry={refresh} /><Button label="Sign out" variant="secondary" onPress={logout} /></> : !data && !allowEmpty ? <DataState state="loading" /> : !allowEmpty && !data.driver ? <DataState state="empty" /> : <View style={s.content}>
      {data?.errors && Object.entries(data.errors).map(([key, message]) => <Card key={key}><AppText color={colors.error}>{key}: {message}</AppText></Card>)}
      {children}</View>}
  </DriverScreenShell>;
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
  const trips = recentTrips(data?.trips);
  const crewUnknown = data?.vehicle && !data?.crewStatus && data?.vehicle?.crewStatus !== 'DRIVING';
  return <Page navigation={navigation} title={`Hello, ${firstName}.`} subtitle="A clear view of the road ahead." action={<SosAction navigation={navigation} />}>
    {data?.duty && <DutyCard driver={data.driver} />}
    {crewUnknown && <AtWheelPromptCard navigation={navigation} vehicleNumber={data?.vehicle?.registrationNumber} />}
    <DriverCrewCard navigation={navigation} />
    <SectionHeading title="Your truck" caption="Vehicle details and location source." />
    {data?.vehicle ? <VehicleRow vehicle={data.vehicle} onPress={() => navigation.navigate('My truck')} /> : <Empty title="No truck linked" description="Ask your manager, or choose a truck." action={<Button label="Change truck" onPress={() => navigation.navigate('Change truck')} />} />}
    <View style={s.quickGrid}>{[['Add fuel', 'water-outline'], ['Report issue', 'construct-outline'], ['Documents', 'document-text-outline']].map(([title, icon]) => <Pressable key={title} style={s.quick} accessibilityRole="button" onPress={() => navigation.navigate(title)}><View style={s.quickIcon}><Ionicons name={icon} size={23} color={colors.primary} /></View><AppText variant="small" weight="semibold" center>{title}</AppText></Pressable>)}</View>
    <SectionHeading title="Your trips" caption="Latest GPS-detected journeys." />
    {trips[0] ? <TripCard trip={trips[0]} onPress={() => navigation.navigate('Trip detail', { id: trips[0].id })} /> : <Empty title="No trips yet" description="Your journeys will appear here." />}
    {trips.slice(1).map((trip) => <MenuRow key={trip.id} title={`${trip.from} → ${trip.to}`} detail={tripDetail(trip)} icon="navigate-outline" onPress={() => navigation.navigate('Trip detail', { id: trip.id })} />)}
    {trips.length > 0 && <Button label="View all trips" variant="secondary" onPress={() => navigation.navigate('Trips')} />}
  </Page>;
}
function TripCard({ trip, onPress }) {
  const { t } = useLanguage();
  const status = tripStatusLabel(trip.status);
  const statusText = String(status || '').toLowerCase();
  const tone = /complete|finish|closed/.test(statusText)
    ? 'valid'
    : /cancel|reject|fail/.test(statusText)
      ? 'expired'
      : /active|transit|progress|ongoing/.test(statusText)
        ? 'inTransit'
        : 'neutral';
  return <Card onPress={onPress} accessibilityRole="button" accessibilityLabel={`${trip.from} to ${trip.to}`} style={s.trip}>
    <View style={s.between}><Badge tone={tone} label={status} dot /><AppText variant="caption" muted>{date(trip.startedAt, t('roleDesign', 'unavailableDate'))}</AppText></View>
    <View style={s.route}><View style={s.routeLine}><View style={s.routeDot} /><View style={s.routeStem} /><View style={[s.routeDot, { backgroundColor: colors.primary }]} /></View><View style={s.flex}><AppText variant="h3">{trip.from}</AppText><AppText variant="h3" style={s.destination}>{trip.to}</AppText></View><Ionicons name="arrow-forward" size={22} color={colors.primary} /></View>
    <AppText mono muted>{trip.distanceKm == null ? 'Distance unavailable' : `${trip.distanceKm} km`} · GPS-detected</AppText>
  </Card>;
}
export function DriverTrips({ navigation }) {
  const { service } = useDriverData();
  const [revision, setRevision] = useState(0);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    service
      .listTrips(page)
      .then((result) => {
        if (active) {
          setRows((old) =>
            page === 1
              ? result.items
              : [
                  ...new Map(
                    [...old, ...result.items].map((item) => [item.id, item]),
                  ).values(),
                ],
          );
          setTotal(result.total);
        }
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [service, page, revision]);
  return (
    <Page
      navigation={navigation}
      title="Your journeys"
      subtitle="GPS-detected trips"
      action={<SosAction navigation={navigation} />}
    >
      {rows.map((trip) => (
        <TripCard
          key={trip.id}
          trip={trip}
          onPress={() => navigation.navigate("Trip detail", { id: trip.id })}
        />
      ))}
      {error && <AppText color={colors.error}>{error}</AppText>}
      {busy && <DataState state="loading" />}
      {!busy && !error && total === 0 && (
        <Empty
          title="No trips to show"
          description="Your GPS-detected journeys will appear here."
        />
      )}
      {!busy && rows.length < total && !error && (
        <Button
          label="Load more trips"
          onPress={() => setPage((old) => old + 1)}
        />
      )}
      {error && (
        <Button label="Retry" onPress={() => setRevision((old) => old + 1)} />
      )}
    </Page>
  );
}
export function TripDetail({ navigation, route }) {
  const { t } = useLanguage();
  const { data, service } = useDriverData();
  const [trip, setTrip] = useState(null);
  const [track, setTrack] = useState(null);
  const [error, setError] = useState("");
  const [trackError, setTrackError] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setTrip(null);
    setTrack(null);
    setError("");
    setTrackError("");
    Promise.allSettled([
      service.getTrip(route.params?.id),
      service.getTripTrack(route.params?.id),
    ]).then(([detail, path]) => {
      if (!active) return;
      if (detail.status === "fulfilled") setTrip(detail.value);
      else setError(detail.reason.message);
      if (path.status === "fulfilled") setTrack(path.value);
      else setTrackError(path.reason.message);
      setBusy(false);
    });
    return () => {
      active = false;
    };
  }, [service, route.params?.id, revision]);
  const points = track?.points.filter(validCoordinate) || [];
  const markers = points.length
    ? [
        { id: "trip-start", plate: "Trip start", coordinates: points[0] },
        {
          id: "trip-end",
          plate: "Latest recorded point",
          coordinates: points[points.length - 1],
        },
      ]
    : [];
  return (
    <Page navigation={navigation} title="Trip details">
      {busy && <DataState state="loading" />}
      {error && <AppText color={colors.error}>{error}</AppText>}
      {trip && (
        <>
          <TripCard trip={trip} />
          <Button
            label="Add fuel"
            icon="water-outline"
            onPress={() =>
              navigation.navigate("Add fuel", { tripId: trip.id, trip })
            }
          />
          {trip.erpTripId && <Button label="ERP trip / delivery documents" variant="secondary" onPress={() => navigation.navigate('ERP trip', { id: typeof trip.erpTripId === 'object' ? trip.erpTripId._id : trip.erpTripId })} />}
          {data?.fuel
            .filter((entry) => entry.tripId === trip.id)
            .map((entry) => (
              <MenuRow
                key={entry.id}
                title={entry.station || entry.title}
                detail={`${formatLitres(entry.litres)} L · ${money(entry.amountInr, t('roleDesign', 'unavailableAmount'))} · ${entry.status}`}
                icon="water-outline"
              />
            ))}
          {points.length ? (
            <FleetMap
              vehicles={markers}
              trailPoints={track.points}
              caption="Recorded trip route"
            />
          ) : (
            !busy &&
            !trackError && (
              <Card>
                <AppText muted>
                  No recorded route coordinates are available.
                </AppText>
              </Card>
            )
          )}
          {track?.sampled && (
            <AppText muted>Route points were sampled by the server.</AppText>
          )}
          {[
            ...new Map(
              [...(trip.stops || []), ...(trip.routeStops || [])].map(
                (stop) => [stop._id, stop],
              ),
            ).values(),
          ].map((stop) => (
            <MenuRow
              key={stop._id}
              title={stop.place?.name || "Recorded stop"}
              detail={`${stop.dwellMinutes ?? "Unknown"} min · ${stop.startAt ? new Date(stop.startAt).toLocaleString() : "Time unavailable"}${stop.humanReason?.note || stop.humanReason?.purpose ? ` · ${stop.humanReason.note || stop.humanReason.purpose}` : ""}`}
              icon="pause-circle-outline"
            />
          ))}
        </>
      )}
      {trackError && (
        <AppText color={colors.error}>Route: {trackError}</AppText>
      )}
      {(error || trackError) && (
        <Button label="Retry" onPress={() => setRevision((old) => old + 1)} />
      )}
    </Page>
  );
}
export function DriverInbox({ navigation }) {
  const { service, data } = useDriverData();
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [feed, setFeed] = useState(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setFeed(null); setError('');
    service.listDriverAlerts({ page, unread: filter === 'Unread' }).then((value) => { if (active) setFeed(value); }).catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [service, filter, page, data?.unreadCount, revision]);
  return <Page navigation={navigation} title="Your inbox" subtitle="Your duty, assignment, support and incident updates." allowEmpty>
    <View style={s.filters}>{['All', 'Unread'].map((item) => <Pressable key={item} style={[s.filter, filter === item && s.activeFilter]} accessibilityRole="button" accessibilityState={{ selected: filter === item }} onPress={() => { setFilter(item); setPage(1); }}><AppText weight="semibold" color={filter === item ? colors.white : colors.textMuted}>{item}</AppText></Pressable>)}</View>
    {error ? <><DataState state="error" onRetry={() => setRevision((old) => old + 1)} /><AppText color={colors.error} accessibilityRole="alert">{error}</AppText></> : !feed ? <DataState state="loading" /> : <>
      <AppText muted>{feed.unreadCount} unread · {feed.total} matching alerts</AppText>
      {feed.items.map((alert) => <AlertRow key={alert.id} alert={alert} onPress={() => navigation.navigate('Alert detail', { id: alert.id })} />)}
      {!feed.items.length && <Empty title="No matching alerts" description="New updates will appear here." />}
      <View style={s.filters}><Button label="Previous" variant="secondary" disabled={page === 1} onPress={() => setPage(page - 1)} /><AppText>Page {page}</AppText><Button label="Next" variant="secondary" disabled={page * feed.limit >= feed.total} onPress={() => setPage(page + 1)} /></View>
    </>}
  </Page>;
}
export function AlertDetail({ navigation, route }) {
  const { service, mutate } = useDriverData();
  const [alert, setAlert] = useState(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setAlert(null); setError('');
    service.driverAlert(route.params?.id).then((value) => { if (active) setAlert(value); }).catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [service, route.params?.id]);
  async function acknowledge() { setBusy(true); setError(''); try { await service.acknowledgeAlert(alert.id); setAlert(await service.driverAlert(alert.id)); mutate(() => Promise.resolve()).catch(() => {}); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <Page navigation={navigation} title="Alert details" allowEmpty>{error ? <AppText color={colors.error}>{error}</AppText> : null}{alert ? <><AlertRow alert={alert} />{alert.description ? <Card><AppText>{alert.description}</AppText></Card> : null}{['CREW_HANDOVER', 'CREW_INVITATION'].includes(alert.kind) && <Button label="Open current crew & handover" variant="secondary" onPress={() => navigation.navigate('Crew & driving')} />}<Button label={alert.acknowledged ? 'Acknowledged' : 'Mark as read'} disabled={alert.acknowledged} loading={busy} onPress={acknowledge} /></> : !error ? <DataState state="loading" /> : <Empty title="Alert unavailable" description="Return to your inbox." />}</Page>;
}
export function MyTruck({ navigation }) {
  const { data } = useDriverData();
  return <Page navigation={navigation} title="My truck" subtitle="Your vehicle. Your working day."><DriverCrewCard navigation={navigation} />{data?.vehicle ? <><VehicleRow vehicle={data.vehicle} /><MenuRow title="Odometer" detail={`${data.vehicle.odometerKm == null ? "Unavailable" : `${data.vehicle.odometerKm.toLocaleString('en-IN')} km`}`} icon="speedometer-outline" /><MenuRow title="Location sharing" detail="Understand where this position comes from" icon="location-outline" onPress={() => navigation.navigate('Location sharing')} /></> : <Empty title="No truck linked" description="Ask your manager to update your truck assignment." />}<Button label="Change truck" icon="swap-horizontal" onPress={() => navigation.navigate('Change truck')} /></Page>;
}
export function ChangeTruck({ navigation }) {
  const { service, refresh } = useDriverData();
  const [candidates, setCandidates] = useState(null);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function search() {
    setBusy(true);
    setError("");
    setSelected(null);
    setCandidates(null);
    try {
      const result = await service.pairingCandidates(await capturePairingFix());
      setCandidates(result.candidates);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await service.confirmPairing(selected, await capturePairingFix());
      setDone(true);
      await refresh();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page navigation={navigation} title="Change truck">
      {done ? (
        <Success
          title="Truck linked"
          description="Your assignment was confirmed by the server."
          onDone={() => navigation.goBack()}
        />
      ) : (
        <>
          <AppText muted>
            Search while parked near your truck. Confirmation checks a fresh
            phone location and truck telemetry. A truck assigned to another
            driver needs your manager.
          </AppText>
          <Button
            label="Find nearby trucks"
            icon="location-outline"
            loading={busy}
            onPress={search}
          />
          {candidates?.map((item) => (
            <MenuRow
              key={item.vehicleId}
              title={item.registrationNumber}
              detail={`${item.distanceMeters} m away${item.assignedToAnotherDriver ? " · Assigned to another driver" : selected === item.vehicleId ? " · Selected" : ""}`}
              icon={
                selected === item.vehicleId
                  ? "radio-button-on"
                  : "radio-button-off"
              }
              onPress={
                busy || item.assignedToAnotherDriver
                  ? undefined
                  : () => setSelected(item.vehicleId)
              }
            />
          ))}
          {candidates?.length === 0 && (
            <Empty
              title="No nearby truck found"
              description="Truck telemetry must be fresh and within pairing range. Try again near your vehicle or contact your manager."
            />
          )}
          {selected && (
            <Button
              label="Confirm this truck"
              loading={busy}
              onPress={confirm}
            />
          )}
        </>
      )}
      {error && <AppText color={colors.error}>{error}</AppText>}
    </Page>
  );
}
const actions = [['Add fuel', 'water-outline', 'Record litres and a receipt'], ['Report issue', 'construct-outline', 'Tell your manager what needs attention'], ['Workshop bill', 'receipt-outline', 'Upload a workshop bill for OCR'], ['Explain a stop', 'pause-circle-outline', 'Add context to a stop'], ['SOS', 'shield-outline', 'Emergency contacts']];
export function QuickAdd({ navigation }) {
  return <Page navigation={navigation} title="What would you like to add?" subtitle="Simple steps. Back to the road.">{actions.map(([title, icon, detail]) => <MenuRow key={title} title={title} icon={icon} detail={detail} danger={title === 'SOS'} onPress={() => navigation.replace(title)} />)}</Page>;
}
export function DriverMore({ navigation }) {
  const { language, t } = useLanguage();
  const sectionTitleStyle = language === 'hi' || language === 'bn'
    ? { lineHeight: 30, paddingTop: 2, paddingBottom: 2 }
    : undefined;
  const groups = [
    {
      key: 'moreTruckTrips',
      items: [['Crew & driving', 'people-outline'], ['ERP trips', 'document-text-outline'], ['My truck', 'bus-outline'], ['Location sharing', 'location-outline']],
    },
    {
      key: 'moreMessagesRecords',
      items: [['Messages', 'chatbubbles-outline'], ['Documents', 'document-text-outline'], ['Fuel history', 'water-outline'], ['My issues', 'construct-outline'], ['Workshop bills', 'receipt-outline'], ['Support', 'help-circle-outline']],
    },
    {
      key: 'moreAccount',
      items: [['Profile', 'person-outline']],
    },
  ];
  return <Page navigation={navigation} title="Everything else" subtitle="Your essentials, in one place.">{groups.map((group) => <React.Fragment key={group.key}><SectionHeading title={t('roleDesign', group.key)} titleStyle={sectionTitleStyle} />{group.items.map(([title, icon]) => <MenuRow key={title} title={title} icon={icon} onPress={() => navigation.navigate(title)} />)}</React.Fragment>)}</Page>;
}
function Success({ title, description, onDone }) {
  return <Card style={s.empty}><View style={s.successIcon}><Ionicons name="checkmark" size={32} color={colors.success} /></View><AppText variant="h2" center>{title}</AppText><AppText muted center>{description}</AppText><Button label="Done" onPress={onDone} /></Card>;
}
export function CaptureForm({ navigation, route }) {
  return <Page navigation={navigation} title={route.name}><Empty title="Stop notes are not connected yet" description="No stop explanation has been saved." /></Page>;
}
export function LocationSharing({ navigation }) {
  const { tracking } = useDriverData();
  return (
    <Page navigation={navigation} title="Location sharing">
      <MenuRow
        title={`Sharing: ${tracking.mode}`}
        detail={
          tracking.lastSent
            ? `Last successful send: ${new Date(tracking.lastSent).toLocaleString()}`
            : "No successful send recorded in this session"
        }
        icon="location-outline"
      />
      <AppText muted>
        {tracking.pending == null
          ? "Queue status unavailable."
          : `${tracking.pending} recorded fixes waiting to send.`}{" "}
        Failed sends stay on this device for retry under your account.
      </AppText>
      <AppText muted>
        Foreground sharing works while this app is open. Background sharing
        requires a native development build and Always location permission; Expo
        Go and browsers cannot provide this mode.
      </AppText>
      {tracking.error && (
        <AppText accessibilityRole="alert" color={colors.error}>
          {tracking.error}
        </AppText>
      )}
      <Button
        label="Share while app is open"
        loading={tracking.busy}
        onPress={() => tracking.start("foreground")}
      />
      {tracking.canBackground && (
        <Button
          label="Enable background sharing"
          loading={tracking.busy}
          onPress={() => tracking.start("background")}
        />
      )}
      <Button
        label="Stop sharing"
        variant="secondary"
        disabled={tracking.busy}
        onPress={() => tracking.stop()}
      />
    </Page>
  );
}
export function Profile({ navigation }) {
  const { user, organization, logout } = useAuth();
  const { preferences, setPreferences } = useDriverData();
  const [name, setName] = useState(preferences.nickname); const [saved, setSaved] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function signOut() { setBusy(true); try { await logout(); } catch (err) { setError(err.message); setBusy(false); } }
  return <Page navigation={navigation} title="Your profile" subtitle="Your account and local preferences." allowEmpty><MenuRow title={user?.name || user?.firstName || 'Driver'} detail={`${user?.role || 'DRIVER'} · Signed-in account`} icon="person-outline" /><MenuRow title="Organization" detail={organization?.name || 'Your signed-in organization'} icon="business-outline" /><Card style={s.form}><TextField label="display preference" accessibilityLabel="display preference" placeholder="Optional nickname for this session" value={name} onChangeText={(value) => { setName(value); setSaved(false); }} maxLength={50} /><Button label={saved ? 'Preference saved locally' : 'Save preference'} variant="secondary" onPress={() => { setPreferences({ nickname: name.trim() }); setSaved(true); }} /><AppText variant="caption" muted>This preference stays for this session and updates your Home greeting. Your account name is unchanged.</AppText></Card><PushSettings /><MenuRow title="Language" detail="English" icon="language-outline" /><MenuRow title="Appearance" detail="Nova light · Current theme" icon="sunny-outline" />{error ? <AppText color={colors.error}>{error}</AppText> : null}<Button label="Log out" variant="secondary" loading={busy} onPress={() => Alert.alert('Log out?', 'Sign out of your account on this device?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', onPress: signOut }])} /></Page>;
}
const SOS_TYPES = [
  { key: 'BREAKDOWN', label: 'Breakdown', icon: 'build-outline', color: colors.warning },
  { key: 'ACCIDENT', label: 'Accident', icon: 'warning-outline', color: colors.error },
  { key: 'MEDICAL', label: 'Medical emergency', icon: 'medkit-outline', color: '#7c3aed' },
  { key: 'THEFT', label: 'Theft', icon: 'shield-outline', color: colors.textMuted },
];

export function SosUnavailable({ navigation }) {
  const { service, mutate } = useDriverData();
  const [type, setType] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const orgId = typeof user.orgId === 'object' ? user.orgId?._id : user.orgId;
  const draftKey = `sos:${orgId}:${user._id}`;
  const draft = useRef(null);
  const inFlight = useRef(false);
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [delivery, setDelivery] = useState(null);
  const [deliveryError, setDeliveryError] = useState('');
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(draftKey).then((stored) => {
      if (!active) return;
      if (!stored) { setReady(true); return; }
      const saved = JSON.parse(stored);
      draft.current = saved; setLocked(true);
      setType(saved.payload.type); setNote(saved.payload.note || '');
      if (saved.result) setSent(saved.result);
      setReady(true);
    }).catch(() => setError('Could not restore your previous report. Retry opening this screen.'));
    return () => { active = false; };
  }, [draftKey]);
  useEffect(() => {
    if (!sent) return undefined;
    let active = true;
    const refresh = () => service.sosStatus(sent.id || sent._id).then((value) => {
      if (active) { setDelivery(value); setDeliveryError(''); }
    }).catch(() => { if (active) setDeliveryError('Report saved. Delivery status is temporarily unavailable.'); });
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [sent, service]);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!sent) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [sent, pulseAnim]);

  async function submit() {
    if (!ready || inFlight.current) return;
    if (!type) { setError('Select the type of emergency first.'); return; }
    inFlight.current = true;
    setBusy(true); setError('');
    try {
      if (!draft.current) {
        // Permission prompts and a slow GPS fix must never block an emergency report.
        let coords;
        try {
          let timer;
          try {
            coords = await Promise.race([
              (async () => {
                const permission = await Location.getForegroundPermissionsAsync();
                if (permission.status !== 'granted') return undefined;
                const loc = await Location.getLastKnownPositionAsync({ maxAge: 120000, requiredAccuracy: 100 });
                return loc && !loc.mocked && Date.now() - loc.timestamp >= 0 && Date.now() - loc.timestamp <= 120000 ? loc.coords : undefined;
              })(),
              new Promise((resolve) => { timer = setTimeout(() => resolve(undefined), 1000); }),
            ]);
          } finally { clearTimeout(timer); }
        } catch { /* Report without a phone fix. */ }
        setLocked(true);
        draft.current = { payload: {
          clientIncidentId: Crypto.randomUUID(), type, note: note.trim() || undefined,
          reportedAt: new Date().toISOString(),
          ...(coords && { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }),
        } };
        await AsyncStorage.setItem(draftKey, JSON.stringify(draft.current));
      }
      await AsyncStorage.setItem(draftKey, JSON.stringify(draft.current));
      const result = await service.reportSos(draft.current.payload);
      setSent(result);
      draft.current.result = result;
      await AsyncStorage.setItem(draftKey, JSON.stringify(draft.current)).catch(() => {});
      mutate(() => Promise.resolve()).catch(() => {});
    } catch (err) {
      setError(`${err.message || 'Could not confirm the report.'} Retry sends the same report. For urgent help, call emergency services directly.`);
    } finally { inFlight.current = false; setBusy(false); }
  }
  async function startNewReport() {
    await AsyncStorage.removeItem(draftKey);
    draft.current = null; setLocked(false); setSent(null); setType(null); setNote(''); setDelivery(null); setError('');
  }

  if (sent) {
    return (
      <Page navigation={navigation} title="SOS report saved" allowEmpty>
        <View style={{ alignItems: 'center', gap: 20, paddingVertical: 16 }}>
          <Animated.View style={[s.sosSymbol, { transform: [{ scale: pulseAnim }], backgroundColor: colors.expiredBg }]}>
            <Ionicons name="shield-checkmark" size={40} color={colors.error} />
          </Animated.View>
          <AppText variant="large" weight="bold" style={{ textAlign: 'center' }}>
            {sent.incidentNumber} — {SOS_TYPES.find((t) => t.key === sent.type)?.label || sent.type}
          </AppText>
          <AppText muted style={{ textAlign: 'center' }}>
            {sent.pairing?.resolved
              ? `Linked to truck ${sent.truck?.registrationNumber || 'on file'}.`
              : 'Truck not confirmed. The report is saved for your fleet to review.'}
          </AppText>
          <AppText variant="caption" muted style={{ textAlign: 'center' }}>
            {sent.location?.source === 'UNKNOWN'
              ? 'No GPS fix was available. Contact your fleet to share your location.'
              : 'The report includes a location. This does not confirm someone has seen it.'}
          </AppText>
        </View>
        <Card>
          <AppText weight="semibold">Fleet status: {delivery?.incidentStatus || sent.status || 'Saved'}</AppText>
          <AppText muted>{deliveryError || (!delivery ? 'Checking notification status…' : !delivery.pushEnabled ? 'Push notifications are disabled. Contact your fleet directly.' : !Object.keys(delivery.states || {}).length ? 'No recipient devices queued. Contact your fleet directly.' : `Notifications: ${Object.entries(delivery.states).map(([state, count]) => `${state}: ${count}`).join(' · ')}`)}</AppText>
          <AppText variant="caption" muted>Notification acceptance or provider handoff does not confirm display or help dispatched.</AppText>
        </Card>
        <Button label="Back to home" onPress={() => navigation.navigate('Driver tabs')} />
        <Button label="Report a new emergency" variant="secondary" onPress={() => startNewReport().catch((e) => setError(e.message))} />
      </Page>
    );
  }

  return (
    <Page navigation={navigation} title="Emergency help" subtitle="Save an emergency report for your fleet. Call emergency services directly when needed.">
      <AppText weight="semibold" style={{ marginBottom: 4 }}>What is the emergency?</AppText>
      {SOS_TYPES.map((item) => (
        <Pressable
          key={item.key}
          style={[s.menu, { borderWidth: 1, borderRadius: radius.md, padding: 16 }, type === item.key && s.selected]}
          accessibilityRole="radio"
          accessibilityState={{ selected: type === item.key }}
          disabled={locked || busy}
          onPress={() => setType(item.key)}
        >
          <View style={[s.menuIcon, { backgroundColor: `${item.color}22` }]}>
            <Ionicons name={item.icon} size={22} color={item.color} />
          </View>
          <AppText weight={type === item.key ? 'semibold' : 'regular'}>{item.label}</AppText>
        </Pressable>
      ))}
      <TextField
        label="Details (optional)"
        placeholder="Describe what happened..."
        value={note}
        editable={!locked && !busy}
        onChangeText={setNote}
        multiline
        maxLength={500}
      />
      {error ? <AppText color={colors.error} accessibilityRole="alert">{error}</AppText> : null}
      <Button label={locked ? "Retry saved SOS report" : "Save SOS report"} loading={busy || !ready} onPress={submit} />
      <AppText variant="caption" muted style={{ textAlign: 'center' }}>
        Contact emergency services directly if life is at risk.
      </AppText>
    </Page>
  );
}
// ─── At-wheel Handover (WHO_DRIVING) ─────────────────────────────────────────

const CREW_MOCK_MEMBERS = [
  { id: 'crew-001', name: 'Sunil Patil', role: 'Co-driver' },
  { id: 'crew-002', name: 'Ajay Singh', role: 'Relief driver' },
];

/**
 * Shown on DriverHome when WHO_DRIVING = UNKNOWN (crew state not yet confirmed).
 * Quick "Yes, I'm driving" / "Not me" actions without full navigation.
 */
export function AtWheelPromptCard({ navigation, vehicleNumber, onConfirmed }) {
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  function confirmSelf() {
    setBusy(true);
    // Mock: simulate crewAction('START') success
    setTimeout(() => {
      setBusy(false);
      if (onConfirmed) onConfirmed('self');
      setDismissed(true);
    }, 700);
  }

  return (
    <View
      style={{
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderColor: colors.warning,
        backgroundColor: colors.pendingBg,
        padding: 14,
        gap: 12,
        marginBottom: 4,
      }}
      accessibilityRole="alert"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Ionicons name="hand-left-outline" size={22} color={colors.warning} />
        <View style={{ flex: 1 }}>
          <AppText weight="semibold" color={colors.warning}>Who is driving?</AppText>
          <AppText variant="small" muted>
            {vehicleNumber ? `Truck ${vehicleNumber} is moving without a confirmed driver.` : 'Driving is unconfirmed. Confirm to start your shift.'}
          </AppText>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button
          label={busy ? 'Confirming…' : 'Yes, I\'m driving'}
          size="small"
          disabled={busy}
          onPress={confirmSelf}
          style={{ flex: 1 }}
        />
        <Button
          label="Not me"
          variant="secondary"
          size="small"
          disabled={busy}
          onPress={() => navigation.navigate('At-wheel handover', { vehicleNumber })}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

export function AtWheelHandover({ navigation, route }) {
  const vehicleNumber = route?.params?.vehicleNumber ?? 'MH 04 AB 1234';
  const [step, setStep] = useState('who'); // who | confirm | done
  const [choice, setChoice] = useState(null); // 'self' | 'someone' | 'parked'
  const [assignee, setAssignee] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function submit() {
    if (choice === 'someone' && !assignee) {
      setError('Select the driver who is at the wheel.');
      return;
    }
    setBusy(true);
    setError('');
    // Mock: simulate crew API call
    setTimeout(() => {
      setBusy(false);
      setStep('done');
    }, 800);
  }

  if (step === 'done') {
    const summary = choice === 'self'
      ? 'Your shift has started. Drive safe.'
      : choice === 'parked'
      ? 'Truck marked as parked. No driver confirmed.'
      : `Driving handover proposed to ${assignee?.name}. They need to confirm.`;
    return (
      <Page navigation={navigation} title="Handover recorded" allowEmpty>
        <View style={{ alignItems: 'center', gap: 20, paddingVertical: 24 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.validBg, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark-circle" size={40} color={colors.success} />
          </View>
          <AppText weight="semibold" style={{ textAlign: 'center', fontSize: 18 }}>{summary}</AppText>
          <AppText variant="small" muted style={{ textAlign: 'center' }}>
            Mock data — will confirm via crew API when wired.
          </AppText>
        </View>
        <Button label="Back to home" onPress={() => navigation.navigate('Driver tabs')} />
      </Page>
    );
  }

  return (
    <Page
      navigation={navigation}
      title="Who is at the wheel?"
      subtitle={`Truck ${vehicleNumber} is moving without a confirmed driver. Select what applies.`}
      allowEmpty
    >
      {/* Choice cards */}
      {[
        { key: 'self', icon: 'person-outline', label: 'I am driving', desc: 'Start my driving shift now' },
        { key: 'someone', icon: 'people-outline', label: 'Someone else is driving', desc: 'Propose handover to a crew member' },
        { key: 'parked', icon: 'car-outline', label: 'Truck is parked', desc: 'No one is driving — truck is stationary' },
      ].map((opt) => (
        <Pressable
          key={opt.key}
          accessibilityRole="radio"
          accessibilityState={{ selected: choice === opt.key }}
          onPress={() => { setChoice(opt.key); setAssignee(null); setError(''); }}
          style={[
            { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 1.5, marginBottom: 8 },
            choice === opt.key
              ? { borderColor: colors.primary, backgroundColor: colors.infoBg }
              : { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: choice === opt.key ? colors.infoBg : colors.background, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={opt.icon} size={20} color={choice === opt.key ? colors.primary : colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText weight="semibold" color={choice === opt.key ? colors.primary : colors.text}>{opt.label}</AppText>
            <AppText variant="small" muted>{opt.desc}</AppText>
          </View>
          {choice === opt.key && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
        </Pressable>
      ))}

      {/* Crew member picker when "someone else" */}
      {choice === 'someone' && (
        <Card>
          <AppText variant="small" weight="semibold" style={{ marginBottom: 10 }}>Select the driver at the wheel</AppText>
          {CREW_MOCK_MEMBERS.map((member) => (
            <Pressable
              key={member.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: assignee?.id === member.id }}
              onPress={() => setAssignee(member)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: assignee?.id === member.id ? colors.infoBg : colors.background,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="person" size={18} color={assignee?.id === member.id ? colors.primary : colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText weight={assignee?.id === member.id ? 'semibold' : 'regular'}>{member.name}</AppText>
                <AppText variant="small" muted>{member.role}</AppText>
              </View>
              {assignee?.id === member.id && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
            </Pressable>
          ))}
          <AppText variant="small" muted style={{ marginTop: 8 }}>
            Mock list — real crew loaded from API when wired.
          </AppText>
        </Card>
      )}

      {error ? <AppText color={colors.error} accessibilityRole="alert">{error}</AppText> : null}

      <Button
        label={busy ? 'Saving…' : choice === 'self' ? 'Start my shift' : choice === 'someone' ? 'Propose handover' : choice === 'parked' ? 'Mark as parked' : 'Select an option'}
        disabled={!choice || busy}
        loading={busy}
        onPress={submit}
      />
      <AppText variant="small" muted style={{ textAlign: 'center' }}>
        WHO_DRIVING — mock data only. Backend: crewAction('START') / crewAction('PROPOSE').
      </AppText>
    </Page>
  );
}

// ─── Site Card (Plant Gate) ───────────────────────────────────────────────────

const SITE_MOCK = {
  plantName: 'Steel Authority Nagpur — Gate 3',
  eta: '2026-10-30T08:45:00.000Z',
  estimatedWait: 35,
  queueAhead: 4,
  papers: [
    { id: 'eway', label: 'E-way bill', done: true },
    { id: 'challan', label: 'Delivery challan', done: true },
    { id: 'rc', label: 'RC / Registration', done: true },
    { id: 'insurance', label: 'Insurance', done: false },
    { id: 'fitness', label: 'Fitness certificate', done: false },
    { id: 'permit', label: 'National permit', done: true },
  ],
};

export function SiteCard({ navigation, route }) {
  const site = route?.params?.site ?? SITE_MOCK;
  const [papers, setPapers] = useState(site.papers);
  const pendingCount = papers.filter((p) => !p.done).length;
  const doneCount = papers.length - pendingCount;

  function togglePaper(id) {
    setPapers((prev) => prev.map((p) => (p.id === id ? { ...p, done: !p.done } : p)));
  }

  return (
    <Page
      navigation={navigation}
      title={site.plantName}
      subtitle="Plant gate — papers and queue status"
      allowEmpty
    >
      {/* Queue & wait summary */}
      <Card>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, alignItems: 'center', padding: 12, backgroundColor: colors.infoBg, borderRadius: radius.md }}>
            <AppText variant="large" weight="bold" color={colors.primary}>{site.queueAhead}</AppText>
            <AppText variant="small" muted>ahead of you</AppText>
          </View>
          <View style={{ flex: 1, alignItems: 'center', padding: 12, backgroundColor: colors.pendingBg, borderRadius: radius.md }}>
            <AppText variant="large" weight="bold" color={colors.warning}>{site.estimatedWait} min</AppText>
            <AppText variant="small" muted>estimated wait</AppText>
          </View>
        </View>
      </Card>

      {/* Papers checklist */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <AppText weight="semibold">Papers checklist</AppText>
          <AppText variant="small" color={pendingCount === 0 ? colors.success : colors.warning} weight="semibold">
            {doneCount}/{papers.length} ready
          </AppText>
        </View>
        {papers.map((paper) => (
          <Pressable
            key={paper.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: paper.done }}
            accessibilityLabel={paper.label}
            onPress={() => togglePaper(paper.id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: paper.done ? colors.validBg : colors.background,
                borderWidth: 1.5,
                borderColor: paper.done ? colors.success : colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {paper.done && <Ionicons name="checkmark" size={14} color={colors.success} />}
            </View>
            <AppText style={{ flex: 1 }} color={paper.done ? colors.textMuted : colors.text}>
              {paper.label}
            </AppText>
            {!paper.done && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Upload ${paper.label}`}
                onPress={() => navigation.navigate('Upload document')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: radius.full,
                  backgroundColor: colors.infoBg,
                }}
              >
                <Ionicons name="camera-outline" size={14} color={colors.primary} />
                <AppText variant="small" color={colors.primary}>Upload</AppText>
              </Pressable>
            )}
          </Pressable>
        ))}
        {pendingCount === 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.success} />
            <AppText variant="small" color={colors.success} weight="semibold">All papers are ready for gate</AppText>
          </View>
        )}
      </Card>

      {/* Quick actions */}
      <Button
        label="Upload a document"
        variant="secondary"
        icon="camera-outline"
        onPress={() => navigation.navigate('Upload document')}
      />
    </Page>
  );
}

// ─── Driver Earnings ──────────────────────────────────────────────────────────

const EARNINGS_MOCK = {
  month: 'October 2026',
  advance: 5000,
  bhatta: [
    { label: 'Daily allowance', date: '2026-10-28', amount: 400 },
    { label: 'Daily allowance', date: '2026-10-27', amount: 400 },
    { label: 'Night halt', date: '2026-10-26', amount: 600 },
    { label: 'Daily allowance', date: '2026-10-25', amount: 400 },
  ],
  expenses: [
    { id: 'exp-1', label: 'Toll — Nagpur', date: '2026-10-28', amount: 480, status: 'paid' },
    { id: 'exp-2', label: 'Tyre puncture', date: '2026-10-26', amount: 250, status: 'paid' },
    { id: 'exp-3', label: 'Fuel advance', date: '2026-10-24', amount: 1200, status: 'pending' },
    { id: 'exp-4', label: 'Cleaning', date: '2026-10-22', amount: 100, status: 'rejected' },
  ],
};

const EXPENSE_STATUS_COLOR = { paid: colors.success, pending: colors.warning, rejected: colors.error };
const EXPENSE_STATUS_BG = { paid: colors.validBg, pending: colors.pendingBg, rejected: colors.expiredBg };

function EarningRow({ label, date: d, amount, status }) {
  const col = EXPENSE_STATUS_COLOR[status] || colors.textMuted;
  const bg = EXPENSE_STATUS_BG[status] || colors.background;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 10,
      }}
    >
      <View style={{ flex: 1 }}>
        <AppText variant="small" weight="semibold">{label}</AppText>
        <AppText variant="small" muted>{d}</AppText>
      </View>
      <AppText weight="semibold">{money(amount)}</AppText>
      {status && (
        <View style={{ backgroundColor: bg, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 }}>
          <AppText variant="small" color={col} weight="semibold" style={{ textTransform: 'capitalize' }}>{status}</AppText>
        </View>
      )}
    </View>
  );
}

export function DriverEarnings({ navigation }) {
  const { month, advance, bhatta, expenses } = EARNINGS_MOCK;
  const totalBhatta = bhatta.reduce((sum, b) => sum + b.amount, 0);
  const paidExpenses = expenses.filter((e) => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0);
  const pendingExpenses = expenses.filter((e) => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);

  return (
    <Page navigation={navigation} title="My earnings" subtitle={`${month} — advances, bhatta and expenses`} allowEmpty>
      {/* Summary cards */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1, backgroundColor: colors.infoBg, borderRadius: radius.md, padding: 14, gap: 4 }}>
          <AppText variant="small" muted>Advance given</AppText>
          <AppText variant="large" weight="bold" color={colors.primary}>{money(advance)}</AppText>
        </View>
        <View style={{ flex: 1, backgroundColor: colors.validBg, borderRadius: radius.md, padding: 14, gap: 4 }}>
          <AppText variant="small" muted>Bhatta this month</AppText>
          <AppText variant="large" weight="bold" color={colors.success}>{money(totalBhatta)}</AppText>
        </View>
      </View>

      {/* Expenses summary row */}
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <AppText weight="semibold">Expenses</AppText>
          <AppText variant="small" color={pendingExpenses > 0 ? colors.warning : colors.success} weight="semibold">
            {pendingExpenses > 0 ? `${money(pendingExpenses)} pending` : 'All settled'}
          </AppText>
        </View>
        {expenses.map((exp) => (
          <EarningRow
            key={exp.id}
            label={exp.label}
            date={exp.date}
            amount={exp.amount}
            status={exp.status}
          />
        ))}
        <Button
          label="Submit new expense"
          variant="secondary"
          icon="add-outline"
          onPress={() => navigation.navigate('Report issue')}
          style={{ marginTop: 12 }}
        />
      </Card>

      {/* Bhatta log */}
      <Card>
        <AppText weight="semibold" style={{ marginBottom: 10 }}>Bhatta log</AppText>
        {bhatta.map((b, idx) => (
          <EarningRow key={idx} label={b.label} date={b.date} amount={b.amount} />
        ))}
      </Card>
    </Page>
  );
}

// ─── Driver Document Status ───────────────────────────────────────────────────

const DOC_STATUS_MOCK = [
  {
    id: 'doc-1', label: 'Driving licence', type: 'DL',
    status: 'valid', expiry: '2028-06-30',
    docType: 'licence', icon: 'card-outline',
  },
  {
    id: 'doc-2', label: 'Vehicle RC (MH 04 AB 1234)', type: 'RC',
    status: 'valid', expiry: '2027-01-15',
    docType: 'rc', icon: 'document-text-outline',
  },
  {
    id: 'doc-3', label: 'Insurance certificate', type: 'Insurance',
    status: 'expiring', expiry: '2026-11-20',
    docType: 'insurance', icon: 'shield-checkmark-outline',
  },
  {
    id: 'doc-4', label: 'Fitness certificate', type: 'Fitness',
    status: 'expired', expiry: '2026-09-30',
    docType: 'fitness', icon: 'medkit-outline',
  },
  {
    id: 'doc-5', label: 'PUC certificate', type: 'PUC',
    status: 'valid', expiry: '2027-03-10',
    docType: 'puc', icon: 'leaf-outline',
  },
  {
    id: 'doc-6', label: 'Medical fitness (FORM 1A)', type: 'Medical',
    status: 'valid', expiry: '2027-07-01',
    docType: 'medical', icon: 'body-outline',
  },
];

const DOC_STATUS_CFG = {
  valid:    { label: 'Valid',    tone: colors.success, bg: colors.validBg,   icon: 'checkmark-circle-outline' },
  expiring: { label: 'Expiring', tone: colors.warning, bg: colors.pendingBg, icon: 'time-outline' },
  expired:  { label: 'Expired',  tone: colors.error,   bg: colors.expiredBg, icon: 'close-circle-outline' },
  missing:  { label: 'Missing',  tone: colors.error,   bg: colors.expiredBg, icon: 'alert-circle-outline' },
};

function docDaysLeft(expiry) {
  const diff = Math.round((new Date(expiry).getTime() - Date.now()) / 86400000);
  if (diff < 0) return `Expired ${Math.abs(diff)}d ago`;
  if (diff === 0) return 'Expires today';
  return `${diff}d left`;
}

export function DriverDocumentStatus({ navigation }) {
  const expiredCount = DOC_STATUS_MOCK.filter((d) => d.status === 'expired').length;
  const expiringCount = DOC_STATUS_MOCK.filter((d) => d.status === 'expiring').length;
  const needsAttention = expiredCount + expiringCount;

  return (
    <Page
      navigation={navigation}
      title="My papers"
      subtitle={needsAttention > 0 ? `${needsAttention} document${needsAttention !== 1 ? 's' : ''} need attention` : 'All documents are valid'}
      allowEmpty
    >
      {/* Summary bar */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          { label: `${DOC_STATUS_MOCK.filter((d) => d.status === 'valid').length} valid`, ...DOC_STATUS_CFG.valid },
          { label: `${expiringCount} expiring`, ...DOC_STATUS_CFG.expiring },
          { label: `${expiredCount} expired`, ...DOC_STATUS_CFG.expired },
        ].map((item) => (
          <View key={item.label} style={{ backgroundColor: item.bg, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.border }}>
            <AppText variant="small" color={item.tone} weight="semibold">{item.label}</AppText>
          </View>
        ))}
      </View>

      {needsAttention > 0 && (
        <View style={{ backgroundColor: colors.expiredBg, borderRadius: radius.md, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
          <AppText variant="small" color={colors.error} style={{ flex: 1 }}>
            Update expired documents before your next trip. Capture a photo below.
          </AppText>
        </View>
      )}

      {/* Document list */}
      {DOC_STATUS_MOCK.map((doc) => {
        const cfg = DOC_STATUS_CFG[doc.status] || DOC_STATUS_CFG.missing;
        const daysLabel = docDaysLeft(doc.expiry);
        return (
          <Card key={doc.id} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: cfg.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={doc.icon} size={20} color={cfg.tone} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText weight="semibold" numberOfLines={1}>{doc.label}</AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ backgroundColor: cfg.bg, borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <AppText variant="small" color={cfg.tone} weight="semibold">{cfg.label}</AppText>
                  </View>
                  <AppText variant="small" muted>{daysLabel}</AppText>
                </View>
              </View>
              {/* Camera shortcut for expired/expiring */}
              {(doc.status === 'expired' || doc.status === 'expiring') && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Upload ${doc.label}`}
                  onPress={() => navigation.navigate('Universal capture', { hint: doc.docType })}
                  style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.infoBg, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="camera-outline" size={18} color={colors.primary} />
                </Pressable>
              )}
            </View>
          </Card>
        );
      })}

      <AppText variant="small" muted style={{ textAlign: 'center', marginTop: 4 }}>
        Documents verified by your fleet manager. Backend wiring pending (N6.3/N6.4).
      </AppText>
    </Page>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 }, content: { gap: 16 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, sos: { minHeight: 48, paddingHorizontal: 12, borderRadius: radius.full, backgroundColor: colors.expiredBg, flexDirection: 'row', alignItems: 'center', gap: 6 }, menu: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 76, borderColor: colors.border }, menuIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center' }, detail: { marginTop: 4 }, empty: { alignItems: 'center', padding: 24, gap: 16 }, selected: { borderColor: colors.primary, backgroundColor: colors.blueTint },
  quickGrid: { flexDirection: 'row', gap: 10 }, quick: { flex: 1, minHeight: 100, alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 4, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, quickIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  trip: { gap: 18, padding: 24, borderColor: colors.border }, between: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }, route: { flexDirection: 'row', alignItems: 'center', gap: 14 }, routeLine: { alignItems: 'center' }, routeDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.primary }, routeStem: { height: 28, width: 2, backgroundColor: colors.border }, destination: { marginTop: 16 }, map: { overflow: 'hidden', borderRadius: radius.lg }, mapCaption: { padding: 16 },
  filters: { flexDirection: 'row', gap: 8 }, filter: { minHeight: 48, paddingHorizontal: 22, justifyContent: 'center', backgroundColor: colors.surface, borderRadius: radius.full }, activeFilter: { backgroundColor: colors.primary }, form: { gap: 20, borderColor: colors.border }, attachment: { minHeight: 130, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 10 }, successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.validBg, alignItems: 'center', justifyContent: 'center' }, sosSymbol: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.expiredBg, alignItems: 'center', justifyContent: 'center' },
});
