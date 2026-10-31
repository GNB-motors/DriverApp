import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useDriverData } from '../context/DriverDataContext';
import { AppText, colors } from '../../components/ui';
import { driveTokens } from '../../theme/driveTokens';
import { NavigationCoordinator } from './navigationCoordinator';
import { createFerrostarEngine } from './ferrostarEngine';
import NavigationMap, { mapStyleConfigured } from './NavigationMap';
import { decodePolyline6, formatClock, formatDistance, formatDuration, maneuverIcon, routeOptionFacts } from './navigationFormat';
import { deviceLocationCollector } from '../tracking/deviceLocationCollector';
import { startNavigationBackground, stopNavigationBackground } from '../tracking/driverBackground';
import { downloadOfflineMaps, inspectOfflineMaps } from './offlinePacks';
import { downloadSourceResources } from './resourceDownloads';
import { navigationCacheKey } from './navigationCoordinator';
import { useGuidanceRuntime } from './GuidanceRuntimeContext';
import { createVoicePolicyController, voiceSelectionLabel } from './voiceResourcePolicy';

export default function NavigateExperience({ navigation }) {
  const inset = useSafeAreaInsets();
  const runtime = useGuidanceRuntime();
  const { user, token } = useAuth(); const { language } = useLanguage();
  const { data, service } = useDriverData();
  const [query, setQuery] = useState(''); const [destinations, setDestinations] = useState([]);
  const [destination, setDestination] = useState(null); const [options, setOptions] = useState([]);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Choose a destination'); const [geometry, setGeometry] = useState([]);
  const [mapDownload, setMapDownload] = useState('Offline maps not downloaded');
  const [position, setPosition] = useState(null);
  const [voice, setVoice] = useState(''); const [instruction, setInstruction] = useState('');
  const [phase, setPhase] = useState(() => runtimePhase(runtime));
  const [progress, setProgress] = useState(null); const [maneuver, setManeuver] = useState(null);
  const [thenText, setThenText] = useState(''); const [roadName, setRoadName] = useState('');
  const [course, setCourse] = useState(null); const [arrived, setArrived] = useState(false);
  const [following, setFollowing] = useState(true); const [muted, setMuted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); const [selectedRouteId, setSelectedRouteId] = useState(null);
  const chosenDestination = useRef(null); chosenDestination.current = destination;
  const lastReroute = useRef(0);
  const { generation, owner, watcher } = runtime; const mounted = useRef(true);
  const vehicleId = data?.vehicle?.id;
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, [service, vehicleId, language]);
  runtime.onEngineState = state => {
    if (!mounted.current) return;
    setGeometry((state.routeGeometry || []).map(p => [p.lng, p.lat]));
    const trip = state.tripState;
    const point = state.ui?.location?.coordinates; if (point) setPosition([point.lng, point.lat]);
    setInstruction(state.ui?.visualInstruction?.primaryContent?.text || (trip?.tag === 'Complete' ? 'You have arrived' : 'Follow the route'));
    setThenText(state.ui?.visualInstruction?.secondaryContent?.text || '');
    setRoadName(state.ui?.currentStepRoadName || '');
    setProgress(state.ui?.progress || null); setManeuver(state.maneuver || null);
    setArrived(trip?.tag === 'Complete');
    const heading = state.ui?.location?.courseOverGround?.degrees; if (Number.isFinite(heading)) setCourse(heading);
  };
  runtime.onPhase = value => { if (mounted.current) setPhase(value); };
  useEffect(() => {
    if (runtime.voiceSelection) setVoice(voiceSelectionLabel(runtime.voiceSelection));
  }, [runtime]);
  runtime.onStatus = value => { if (mounted.current) setStatus(value); };
  async function run(action) { setBusy(true); setError(''); try { await action(); } catch (e) { if (mounted.current) setError(e.message); } finally { if (mounted.current) setBusy(false); } }
  async function initialize({ offline = false } = {}) {
    if (owner.current) { setVoice(voiceSelectionLabel(runtime.voiceSelection)); return owner.current; }
    const lease = generation.current;
    if (!vehicleId) throw new Error('Confirm your current truck before navigating.');
    const consentKey = `navigation-consent:${user.orgId?._id || user.orgId}:${user._id}`;
    if (offline) {
      const cachedConsent = JSON.parse(await AsyncStorage.getItem(consentKey) || 'null');
      if (!cachedConsent || Date.now() - cachedConsent.verifiedAt > 86400000) throw new Error('Connect once to verify your location consent before recovering offline.');
    } else {
      const consent = await service.consent();
      if (!(consent?.needsConsent === false && consent?.state?.grantedAt && !consent?.state?.withdrawnAt)) {
        await AsyncStorage.removeItem(consentKey);
        throw new Error('Accept location consent in More → Privacy & consent before navigating.');
      }
      await AsyncStorage.setItem(consentKey, JSON.stringify({ verifiedAt: Date.now(), noticeVersion: consent.state.noticeVersion }));
    }
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') throw new Error('Allow precise location access before navigating.');
    let voicePolicyController;
    const engine = await createFerrostarEngine({ language: language || 'en', foregroundService: {
      async start() {
        try { await startNavigationBackground({ user: { _id: user._id, orgId: user.orgId?._id || user.orgId }, token, apiURL: process.env.EXPO_PUBLIC_API_URL }, () => lease === generation.current); }
        catch (failure) { runtime.onStatus?.(`Foreground guidance only: ${failure.message}`); }
      },
      stop: stopNavigationBackground,
    }, onState(state) { runtime.onEngineState?.(state); }, async onDeviation() {
      const current = owner.current; const dest = current?.session?.destination || chosenDestination.current;
      if (!current?.session || !dest || Date.now() - lastReroute.current < 15000) return;
      lastReroute.current = Date.now();
      try {
        const response = await service.ourRoutes({ origin: { lat: current.fix.latitude, lng: current.fix.longitude }, destination: { lat: dest.lat, lng: dest.lng }, language: language || 'en' });
        const selected = response.default === 'OURS' ? response.ours : response.fastest;
        if (!selected?.navigation) throw new Error('No safe truck reroute is available.');
        await current.replace(selected.navigation, { reason: 'OFF_ROUTE' });
      } catch (failure) { if (mounted.current) setStatus(`Off route: ${failure.message}. Continue safely; no new route confirmed.`); }
    } });
    if (!mounted.current || lease !== generation.current) { engine.dispose(); throw new Error('Navigation screen closed.'); }
    runtime.voicePolicyConnectivity?.(); runtime.voicePolicyController?.dispose();
    voicePolicyController = createVoicePolicyController({
      api: service, storage: AsyncStorage,
      identity: { orgId: String(user.orgId?._id || user.orgId || ''), userId: String(user._id) },
      language: language || 'en', platform: Platform.OS, installedVoices: engine.installedVoices,
      onSelection(selection) {
        runtime.voiceSelection = selection;
        engine.setVoicePolicy(selection);
        if (mounted.current) setVoice(voiceSelectionLabel(selection));
      },
    });
    runtime.voicePolicyController = voicePolicyController;
    const selectedVoice = await voicePolicyController.initialize({ offline });
    runtime.voiceSelection = selectedVoice;
    engine.setVoicePolicy(selectedVoice);
    setVoice(voiceSelectionLabel(selectedVoice));
    runtime.voicePolicyConnectivity = NetInfo.addEventListener(state => voicePolicyController.setOffline(state.isConnected !== true));
    const coordinator = new NavigationCoordinator({ api: service, engine, storage: AsyncStorage,
      identity: { orgId: String(user.orgId?._id || user.orgId || ''), userId: String(user._id), vehicleId },
      onState(state) {
        runtime.onStatus?.(state.status); runtime.onPhase?.(state.status);
        if (state.status === 'navigating') voicePolicyController.startRefresh();
        else if (state.status === 'offline-continuation') voicePolicyController.stopRefresh();
        else if (state.status === 'paused' || state.status === 'stopped') voicePolicyController.stopRefresh();
      } });
    const update = location => { try { coordinator.location({ ...location.coords, timestamp: location.timestamp, mocked: location.mocked }); } catch (e) { if (mounted.current) setStatus(e.message); } };
    update(await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation }));
    const subscription = await deviceLocationCollector.subscribe({ interval: 1000, onLocation: update });
    if (!mounted.current || lease !== generation.current) { subscription.remove(); engine.dispose(); throw new Error('Navigation assignment changed.'); }
    watcher.current = subscription; owner.current = coordinator; return coordinator;
  }
  async function plan() {
    const coordinator = await initialize();
    if (!destination) throw new Error('Choose a destination first.');
    const response = await service.ourRoutes({ origin: { lat: coordinator.fix.latitude, lng: coordinator.fix.longitude }, destination: { lat: destination.lat, lng: destination.lng }, language: language || 'en' });
    const choices = [response.ours && { ...response.ours, title: 'Fleet route' }, response.fastest && { ...response.fastest, title: 'Truck route' }].filter(Boolean);
    if (!choices.length) throw new Error(response.reason?.text || 'No navigable truck route was returned.');
    const unique = choices.filter((choice, i) => choices.findIndex(other => other.routeId === choice.routeId) === i);
    setOptions(unique); setStatus(response.reason?.text || 'Choose a route');
    const preferred = response.default === 'OURS' ? response.ours : response.fastest;
    setSelectedRouteId((preferred && unique.some(o => o.routeId === preferred.routeId) ? preferred : unique[0]).routeId);
  }
  const active = !!owner.current?.session;
  const selectedOption = options.find(o => o.routeId === selectedRouteId) || options[0];
  const previewRoutes = useMemo(() => options.map(o => {
    let coordinates = [];
    try { coordinates = decodePolyline6(o.polyline6); } catch { coordinates = []; }
    return { id: o.routeId, coordinates };
  }), [options]);
  const mapRoutes = active
    ? [{ id: 'active', coordinates: geometry, selected: true }]
    : previewRoutes.map(r => ({ ...r, selected: r.id === selectedOption?.routeId }));
  const destinationPoint = destination ? [destination.lng, destination.lat] : null;
  const [topHeight, setTopHeight] = useState(0); const [bottomHeight, setBottomHeight] = useState(0);
  const phaseNote = { rerouting: 'Finding a new truck route…', 'route-change-failed': 'Route change failed. Keep to the current route.', paused: 'Navigation paused', 'offline-continuation': 'Offline · using the saved route' }[phase]
    || (status && !['navigating', 'paused', 'stopped', 'rerouting', 'route-change-failed', 'offline-continuation'].includes(status) ? status : '');

  function search() {
    Keyboard.dismiss();
    run(async () => { const result = await service.destinationSearch(query); setDestinations(Array.isArray(result) ? result : result.destinations || result.results || result.items || []); });
  }
  function chooseDestination(d) {
    const point = d.location || d;
    setDestination({ lat: point.lat ?? point.latitude, lng: point.lng ?? point.longitude, label: d.label || d.name, source: 'SEARCH' });
    setQuery(d.label || d.name || ''); setDestinations([]); setOptions([]); Keyboard.dismiss();
  }
  function clearDestination() { setDestination(null); setOptions([]); setQuery(''); setDestinations([]); setStatus('Choose a destination'); }
  function start() {
    run(async () => {
      const coordinator = await initialize();
      if (coordinator.session) await coordinator.replace(selectedOption.navigation);
      else await coordinator.activate({ bundle: selectedOption.navigation, startBody: { destination }, consent: true });
      setFollowing(true); setMenuOpen(false);
    });
  }
  function finish(action) {
    run(async () => {
      await owner.current.lifecycle(action);
      watcher.current?.remove(); watcher.current = null;
      setMenuOpen(false); setArrived(false); setProgress(null); setGeometry([]); clearDestination();
    });
  }
  function confirmEnd() {
    Alert.alert('End navigation?', 'Guidance stops and this route is closed.', [
      { text: 'Keep driving', style: 'cancel' },
      { text: 'End', style: 'destructive', onPress: () => finish('END') },
    ]);
  }
  function stopLocal() {
    owner.current?.stop(); owner.current?.engine.dispose(); owner.current = null; watcher.current?.remove(); watcher.current = null;
    setMenuOpen(false); setPhase('stopped');
  }
  function toggleMute() { const next = !muted; owner.current?.engine.setMuted?.(next); setMuted(next); }
  function verifyResources() {
    run(async () => {
      const current = owner.current; const lease = generation.current;
      const response = await service.navOfflineManifest(current.session.navigation.routeId);
      const manifest = response.manifest || response;
      const mapStyle = process.env.EXPO_PUBLIC_MAP_STYLE_URL;
      if (!mapStyle) throw new Error('Your fleet map origin is not configured. Offline source resources are unavailable.');
      const result = await downloadSourceResources({ manifest, routeId: current.session.navigation.routeId, identityKey: navigationCacheKey(current.identity), mapStyle, allowedOrigins: [new URL(mapStyle).origin], isActive: () => lease === generation.current });
      if (mounted.current) setMapDownload(result.resourcesVerified ? 'Source resources verified. Native map download and offline voice verification remain separate.' : 'Source resources incomplete.');
    });
  }
  function downloadMaps() {
    run(async () => {
      const coordinator = owner.current; const lease = generation.current;
      const result = await downloadOfflineMaps({ identity: coordinator.identity, bundle: coordinator.session.navigation, coordinates: geometry, mapStyle: process.env.EXPO_PUBLIC_MAP_STYLE_URL, isActive: () => lease === generation.current, onProgress: progress => { if (mounted.current) setMapDownload(`Map regions: ${progress.completed || 0}/${progress.total || 0}`); } });
      if (mounted.current) setMapDownload(result.ready ? `Map resources downloaded · zoom ${result.minZoom}–${result.maxZoom}. Airplane-mode device verification pending.` : result.reason || 'Map download incomplete');
    });
  }
  function recover() { run(async () => { await (await initialize()).recover({ consent: true }); setFollowing(true); }); }
  function continueOffline() {
    run(async () => {
      const c = await initialize({ offline: true }); await c.recover({ consent: true, online: false });
      const maps = await inspectOfflineMaps({ identity: c.identity, bundle: c.session.navigation, mapStyle: process.env.EXPO_PUBLIC_MAP_STYLE_URL });
      setMapDownload(maps.ready ? 'Native map regions complete. Offline voice unverified.' : maps.reason || 'Map regions incomplete. Route guidance continues without verified maps.');
      setFollowing(true);
    });
  }

  const remaining = progress && Number.isFinite(progress.durationRemaining) ? progress.durationRemaining : null;
  return <View style={styles.fill}>
    <NavigationMap routes={mapRoutes} position={position} course={course} destination={destinationPoint} follow={active && following}
      padding={{ top: topHeight + 12, bottom: bottomHeight + 12 }} onUserPan={() => setFollowing(false)} />

    <View style={[styles.top, { paddingTop: inset.top + 10 }]} onLayout={e => setTopHeight(e.nativeEvent.layout.height)} pointerEvents="box-none">
      {active ? <View style={styles.banner}>
        <View style={styles.bannerRow}>
          <MaterialCommunityIcons name={arrived ? 'flag-checkered' : maneuverIcon(maneuver || {})} size={52} color={colors.white} />
          <View style={{ flex: 1 }}>
            {!arrived && !!progress && <AppText weight="bold" color={colors.white} style={driveTokens.type.maneuverDistance}>{formatDistance(progress.distanceToNextManeuver)}</AppText>}
            <AppText weight="semibold" color={colors.white} style={driveTokens.type.roadName} numberOfLines={2}>{instruction || 'Follow the route'}</AppText>
          </View>
        </View>
        {!!thenText && !arrived && <AppText color={colors.blueTint} style={styles.then} numberOfLines={1}>{thenText}</AppText>}
        {!!roadName && !arrived && <AppText color={colors.blueTint} style={styles.then} numberOfLines={1}>On {roadName}</AppText>}
      </View> : <View style={styles.searchCard}>
        <View style={styles.searchRow}>
          <MaterialCommunityIcons name="magnify" size={24} color={colors.textMuted} />
          <TextInput accessibilityLabel="Destination search" value={query} onChangeText={setQuery} onSubmitEditing={search} returnKeyType="search"
            placeholder="Where to? Plant, customer or town" placeholderTextColor={colors.textMuted} style={styles.searchInput} />
          {busy && !destinations.length ? <ActivityIndicator color={colors.primary} />
            : !!query && <IconButton icon="close" label="Clear destination" onPress={clearDestination} plain />}
        </View>
        {destinations.length > 0 && <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
          {destinations.map((d, i) => <Pressable key={d.id || i} accessibilityRole="button" onPress={() => chooseDestination(d)} style={({ pressed }) => [styles.resultRow, pressed && styles.pressed]}>
            <MaterialCommunityIcons name="map-marker-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <AppText weight="semibold" numberOfLines={1}>{d.label || d.name || 'Destination'}</AppText>
              {!!(d.address || d.subtitle) && <AppText muted variant="caption" numberOfLines={1}>{d.address || d.subtitle}</AppText>}
            </View>
          </Pressable>)}
        </ScrollView>}
      </View>}
      {active && !!phaseNote && <View style={styles.notice}><AppText weight="semibold" color={colors.white} center>{phaseNote}</AppText></View>}
      {active && <View style={styles.sideButtons} pointerEvents="box-none">
        <IconButton icon={muted ? 'volume-off' : 'volume-high'} label={muted ? 'Unmute voice' : 'Mute voice'} onPress={toggleMute} />
        <IconButton icon={following ? 'routes' : 'crosshairs-gps'} label={following ? 'Show whole route' : 'Re-centre on truck'} onPress={() => setFollowing(!following)} />
      </View>}
    </View>

    <View style={[styles.sheet, { paddingBottom: TAB_FAB_CLEARANCE }]} onLayout={e => setBottomHeight(e.nativeEvent.layout.height)}>
      {active && <Pressable accessibilityRole="button" accessibilityLabel="SOS" onPress={() => navigation?.navigate('SOS')} style={styles.sos}>
        <AppText weight="bold" color={colors.white}>SOS</AppText>
      </Pressable>}
      {!!error && <View style={styles.error}>
        <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.error} />
        <AppText color={colors.error} style={{ flex: 1 }}>{error}</AppText>
      </View>}

      {active ? <>
        {arrived ? <BigButton label="Confirm arrival" icon="check-circle-outline" busy={busy} onPress={() => finish('ARRIVE')} /> : <View style={styles.tripRow}>
          <View style={{ flex: 1 }}>
            <AppText weight="bold" color={colors.success} style={driveTokens.type.etaRange}>{remaining === null ? '—' : formatDuration(remaining)}</AppText>
            <AppText muted>{[progress && formatDistance(progress.distanceRemaining), remaining !== null && `Arrive ${formatClock(Date.now() + remaining * 1000)}`].filter(Boolean).join(' · ')}</AppText>
          </View>
          <IconButton icon="dots-horizontal" label="More navigation actions" onPress={() => setMenuOpen(!menuOpen)} selected={menuOpen} />
          <Pressable accessibilityRole="button" accessibilityLabel="End navigation" disabled={busy} onPress={confirmEnd} style={styles.endButton}>
            <AppText weight="bold" color={colors.white}>End</AppText>
          </Pressable>
        </View>}
        {menuOpen && <View style={styles.menu}>
          {phase === 'paused'
            ? <MenuRow icon="play" label="Resume navigation" disabled={busy} onPress={() => run(async () => owner.current.lifecycle('RESUME'))} />
            : <MenuRow icon="pause" label="Pause navigation" disabled={busy} onPress={() => run(async () => owner.current.lifecycle('PAUSE'))} />}
          {!arrived && <MenuRow icon="check-circle-outline" label="Confirm arrival" disabled={busy} onPress={() => finish('ARRIVE')} />}
          <MenuRow icon="download-outline" label="Download route maps" disabled={busy} onPress={downloadMaps} />
          <MenuRow icon="shield-check-outline" label="Verify offline source resources" disabled={busy} onPress={verifyResources} />
          <MenuRow icon="stop-circle-outline" label="Stop guidance on this phone" onPress={stopLocal} />
          <AppText muted variant="caption">{mapDownload}</AppText>
          {!!voice && <AppText muted variant="caption">{voice}</AppText>}
          <AppText muted variant="caption">Screen-off guidance needs Always location permission. Background, offline maps and offline voice still need device verification.</AppText>
        </View>}
      </> : options.length > 0 ? <>
        <AppText variant="h3" numberOfLines={1}>{destination?.label || 'Destination'}</AppText>
        {!!status && <AppText muted>{status}</AppText>}
        {options.map(option => <RouteCard key={option.routeId} option={option} selected={option.routeId === selectedOption?.routeId} onPress={() => setSelectedRouteId(option.routeId)} />)}
        <BigButton label={`Start · ${selectedOption?.title || 'route'}`} icon="navigation" busy={busy} onPress={start} />
        <TextLink label="Change destination" onPress={clearDestination} />
      </> : destination ? <>
        <AppText variant="h3" numberOfLines={2}>{destination.label}</AppText>
        <AppText muted>We compare the road your fleet drives with the fastest truck road.</AppText>
        <BigButton label="Find truck routes" icon="routes" busy={busy} onPress={() => run(plan)} />
      </> : <>
        <AppText variant="h3">Where are you driving?</AppText>
        <AppText muted>Search above to get a truck route with turn-by-turn voice guidance.</AppText>
        <View style={styles.chips}>
          <Chip icon="truck-outline" label="My truck" onPress={() => navigation?.navigate('My truck')} />
          <Chip icon="history" label="Recorded trips" onPress={() => navigation?.navigate('Recorded trips')} />
          <Chip icon="backup-restore" label="Recover route" disabled={busy} onPress={recover} />
          <Chip icon="wifi-off" label="Continue offline" disabled={busy} onPress={continueOffline} />
          <Chip icon="alert-circle-outline" label="SOS" danger onPress={() => navigation?.navigate('SOS')} />
        </View>
      </>}
      {!mapStyleConfigured() && <AppText muted variant="caption">Map background is not set up yet, so only the route line is drawn.</AppText>}
    </View>
  </View>;
}

function runtimePhase(runtime) {
  const state = runtime?.owner.current?.session?.state;
  if (!runtime?.owner.current?.session) return 'plan';
  return state === 'PAUSED' ? 'paused' : 'navigating';
}

function RouteCard({ option, selected, onPress }) {
  const facts = routeOptionFacts(option);
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={`${option.title}, ${facts.duration}, ${facts.distance}`} onPress={onPress}
    style={[styles.routeCard, selected && styles.routeCardSelected]}>
    <View style={{ flex: 1, gap: 2 }}>
      <AppText weight="semibold" color={selected ? colors.primaryDeep : colors.text}>{option.title}</AppText>
      <AppText muted>{[facts.distance, facts.tolls].filter(Boolean).join(' · ')}</AppText>
      {!!facts.range && <AppText muted variant="caption">Usually {facts.range}</AppText>}
    </View>
    <View style={{ alignItems: 'flex-end' }}>
      <AppText weight="bold" style={driveTokens.type.roadName} color={selected ? colors.primaryDeep : colors.text}>{facts.duration || '—'}</AppText>
      {!!facts.arrival && <AppText muted variant="caption">Arrive {facts.arrival}</AppText>}
    </View>
  </Pressable>;
}
function BigButton({ label, icon, busy, onPress }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={busy} onPress={onPress} style={({ pressed }) => [styles.bigButton, (pressed || busy) && { opacity: 0.8 }]}>
    {busy ? <ActivityIndicator color={colors.white} /> : <MaterialCommunityIcons name={icon} size={24} color={colors.white} />}
    <AppText weight="bold" color={colors.white} style={driveTokens.type.chip}>{label}</AppText>
  </Pressable>;
}
function IconButton({ icon, label, onPress, selected = false, plain = false }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8}
    style={({ pressed }) => [plain ? styles.plainIcon : styles.iconButton, selected && styles.iconSelected, pressed && styles.pressed]}>
    <MaterialCommunityIcons name={icon} size={plain ? 22 : 26} color={selected ? colors.primary : colors.text} />
  </Pressable>;
}
function MenuRow({ icon, label, onPress, disabled = false }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed, disabled && { opacity: 0.45 }]}>
    <MaterialCommunityIcons name={icon} size={22} color={colors.primaryDeep} />
    <AppText weight="semibold">{label}</AppText>
  </Pressable>;
}
function Chip({ icon, label, onPress, disabled = false, danger = false }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.chip, danger && styles.chipDanger, pressed && styles.pressed, disabled && { opacity: 0.45 }]}>
    <MaterialCommunityIcons name={icon} size={18} color={danger ? colors.error : colors.primaryDeep} />
    <AppText weight="semibold" color={danger ? colors.error : colors.primaryDeep}>{label}</AppText>
  </Pressable>;
}
function TextLink({ label, onPress }) {
  return <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={{ alignSelf: 'center', padding: 4 }}>
    <AppText weight="semibold" color={colors.primary}>{label}</AppText>
  </Pressable>;
}

// The tab bar's centre Capture button rises 28 px into the screen.
const TAB_FAB_CLEARANCE = 44;
const shadow = { shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 };
const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: driveTokens.day.map },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 12, gap: 8 },
  banner: { backgroundColor: driveTokens.day.maneuver, borderRadius: 20, padding: 16, gap: 6, ...shadow },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  then: { fontSize: 15, lineHeight: 20, marginLeft: 66 },
  notice: { alignSelf: 'center', backgroundColor: 'rgba(23,24,28,0.86)', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, maxWidth: '100%' },
  sideButtons: { alignSelf: 'flex-end', gap: 10, marginTop: 4 },
  searchCard: { backgroundColor: colors.surface, borderRadius: 18, overflow: 'hidden', ...shadow },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, minHeight: 56 },
  searchInput: { flex: 1, fontSize: 17, paddingVertical: 12, color: colors.text },
  results: { maxHeight: 280, borderTopWidth: 1, borderTopColor: colors.border },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 56 },
  pressed: { backgroundColor: colors.blueTint },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 16, gap: 10, ...shadow },
  sos: { position: 'absolute', top: -72, left: 16, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.errorStrong, alignItems: 'center', justifyContent: 'center', ...shadow },
  error: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: colors.expiredBg, borderRadius: 12, padding: 10 },
  tripRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  endButton: { minHeight: 52, minWidth: 76, paddingHorizontal: 18, borderRadius: 26, backgroundColor: colors.errorStrong, alignItems: 'center', justifyContent: 'center' },
  iconButton: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, ...shadow },
  plainIcon: { padding: 4, borderRadius: 16 },
  iconSelected: { borderColor: colors.primary, backgroundColor: colors.blueTint },
  menu: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6, gap: 6 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 48, paddingHorizontal: 4, borderRadius: 12 },
  routeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  routeCardSelected: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.blueTint },
  bigButton: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', minHeight: driveTokens.target.moving, borderRadius: 18, backgroundColor: colors.primary, paddingHorizontal: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, minHeight: 44, borderRadius: 22, backgroundColor: colors.blueTint },
  chipDanger: { backgroundColor: colors.expiredBg },
});
