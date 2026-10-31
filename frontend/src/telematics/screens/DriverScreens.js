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
      items: [['Experience settings', 'language-outline'], ['Privacy & consent', 'shield-checkmark-outline'], ['Driver help', 'help-circle-outline'], ['Profile', 'person-outline']],
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
// Driving attribution is managed by the versioned Crew & driving flow.
export function AtWheelPromptCard({ navigation }) {
  return <Card><AppText weight="semibold">Driving status needs confirmation</AppText><Button label="Open crew & driving" onPress={() => navigation.navigate('Crew & driving')} /></Card>;
}

const s = StyleSheet.create({
  flex: { flex: 1 }, content: { gap: 16 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, sos: { minHeight: 48, paddingHorizontal: 12, borderRadius: radius.full, backgroundColor: colors.expiredBg, flexDirection: 'row', alignItems: 'center', gap: 6 }, menu: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 76, borderColor: colors.border }, menuIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center' }, detail: { marginTop: 4 }, empty: { alignItems: 'center', padding: 24, gap: 16 }, selected: { borderColor: colors.primary, backgroundColor: colors.blueTint },
  quickGrid: { flexDirection: 'row', gap: 10 }, quick: { flex: 1, minHeight: 100, alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 4, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, quickIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  trip: { gap: 18, padding: 24, borderColor: colors.border }, between: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }, route: { flexDirection: 'row', alignItems: 'center', gap: 14 }, routeLine: { alignItems: 'center' }, routeDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.primary }, routeStem: { height: 28, width: 2, backgroundColor: colors.border }, destination: { marginTop: 16 }, map: { overflow: 'hidden', borderRadius: radius.lg }, mapCaption: { padding: 16 },
  filters: { flexDirection: 'row', gap: 8 }, filter: { minHeight: 48, paddingHorizontal: 22, justifyContent: 'center', backgroundColor: colors.surface, borderRadius: radius.full }, activeFilter: { backgroundColor: colors.primary }, form: { gap: 20, borderColor: colors.border }, attachment: { minHeight: 130, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 10 }, successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.validBg, alignItems: 'center', justifyContent: 'center' }, sosSymbol: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.expiredBg, alignItems: 'center', justifyContent: 'center' },
});
