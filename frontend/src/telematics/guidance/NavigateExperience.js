import React, { useEffect, useRef, useState } from 'react';
import { Platform, TextInput } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useDriverData } from '../context/DriverDataContext';
import { AppText, Button, Card } from '../../components/ui';
import { NavigationCoordinator } from './navigationCoordinator';
import { createFerrostarEngine } from './ferrostarEngine';
import NavigationMap from './NavigationMap';
import { deviceLocationCollector } from '../tracking/deviceLocationCollector';
import { startNavigationBackground, stopNavigationBackground } from '../tracking/driverBackground';
import { downloadOfflineMaps, inspectOfflineMaps } from './offlinePacks';
import { downloadSourceResources } from './resourceDownloads';
import { navigationCacheKey } from './navigationCoordinator';
import { useGuidanceRuntime } from './GuidanceRuntimeContext';
import { createVoicePolicyController, voiceSelectionLabel } from './voiceResourcePolicy';

const ActionButton = ({ tone, ...props }) => <Button variant={tone === 'secondary' ? 'secondary' : 'primary'} {...props} />;

export default function NavigateExperience() {
  const { user, token } = useAuth(); const { language } = useLanguage();
  const { data, service } = useDriverData();
  const [query, setQuery] = useState(''); const [destinations, setDestinations] = useState([]);
  const [destination, setDestination] = useState(null); const [options, setOptions] = useState([]);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Choose a destination'); const [geometry, setGeometry] = useState([]);
  const [mapDownload, setMapDownload] = useState('Offline maps not downloaded');
  const [position, setPosition] = useState(null);
  const [voice, setVoice] = useState(''); const [instruction, setInstruction] = useState('');
  const chosenDestination = useRef(null); chosenDestination.current = destination;
  const lastReroute = useRef(0);
  const runtime = useGuidanceRuntime();
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
    setInstruction(state.ui?.visualInstruction?.primaryContent?.text || (trip?.tag === 'Complete' ? 'Arrived' : 'Follow the route'));
  };
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
        throw new Error('Accept location consent in More before navigating.');
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
        runtime.onStatus?.(state.status);
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
    setOptions(choices); setStatus(response.reason?.text || 'Choose a route');
  }
  return <Card style={{ gap: 12 }}>
    <AppText variant="h3">{status}</AppText>
    {!!error && <AppText>{error}</AppText>}
    <TextInput accessibilityLabel="Destination search" value={query} onChangeText={setQuery} placeholder="Search destination" style={{ padding: 12, borderWidth: 1, borderColor: '#aaa', borderRadius: 8 }} />
    <ActionButton label="Search" disabled={busy} onPress={() => run(async () => { const result = await service.destinationSearch(query); setDestinations(Array.isArray(result) ? result : result.destinations || result.results || result.items || []); })} />
    {destinations.map((d, i) => <ActionButton key={d.id || i} label={d.label || d.name || 'Destination'} tone="secondary" onPress={() => { const point = d.location || d; setDestination({ lat: point.lat ?? point.latitude, lng: point.lng ?? point.longitude, label: d.label || d.name, source: 'SEARCH' }); setOptions([]); }} />)}
    {destination && <AppText>Destination: {destination.label}</AppText>}
    <ActionButton label="Compare truck routes" disabled={busy || !destination} onPress={() => run(plan)} />
    {options.map((option, i) => <ActionButton key={option.routeId || i} label={`Navigate · ${option.title}`} disabled={busy} onPress={() => run(async () => {
      const coordinator = await initialize();
      if (coordinator.session) await coordinator.replace(option.navigation);
      else await coordinator.activate({ bundle: option.navigation, startBody: { destination }, consent: true });
    })} />)}
    <NavigationMap coordinates={geometry} position={position} />
    <AppText muted>{mapDownload}</AppText>
    <ActionButton label="Verify offline source resources" disabled={busy || !owner.current?.session} tone="secondary" onPress={() => run(async () => {
      const current = owner.current; const lease = generation.current;
      const response = await service.navOfflineManifest(current.session.navigation.routeId);
      const manifest = response.manifest || response;
      const mapStyle = process.env.EXPO_PUBLIC_MAP_STYLE_URL;
      if (!mapStyle) throw new Error('Your fleet map origin is not configured. Offline source resources are unavailable.');
      const result = await downloadSourceResources({ manifest, routeId: current.session.navigation.routeId, identityKey: navigationCacheKey(current.identity), mapStyle, allowedOrigins: [new URL(mapStyle).origin], isActive: () => lease === generation.current });
      if (mounted.current) setMapDownload(result.resourcesVerified ? 'Source resources verified. Native map download and offline voice verification remain separate.' : 'Source resources incomplete.');
    })} />
    <ActionButton label="Download active route maps" disabled={busy || !owner.current?.session} tone="secondary" onPress={() => run(async () => {
      const coordinator = owner.current; const lease = generation.current;
      const result = await downloadOfflineMaps({ identity: coordinator.identity, bundle: coordinator.session.navigation, coordinates: geometry, mapStyle: process.env.EXPO_PUBLIC_MAP_STYLE_URL, isActive: () => lease === generation.current, onProgress: progress => { if (mounted.current) setMapDownload(`Map regions: ${progress.completed || 0}/${progress.total || 0}`); } });
      if (mounted.current) setMapDownload(result.ready ? `Map resources downloaded · zoom ${result.minZoom}–${result.maxZoom}. Airplane-mode device verification pending.` : result.reason || 'Map download incomplete');
    })} />
    {!!instruction && <AppText variant="h3">{instruction}</AppText>}
    {!!voice && <AppText muted>{voice}</AppText>}
    <AppText muted>Native location service supports screen-off guidance when Always location permission is granted. Background execution, offline maps and offline voices require device verification.</AppText>
    <ActionButton label="Recover active route" disabled={busy} tone="secondary" onPress={() => run(async () => (await initialize()).recover({ consent: true }))} />
    <ActionButton label="Continue cached route offline" disabled={busy} tone="secondary" onPress={() => run(async () => (async () => { const c = await initialize({ offline: true }); await c.recover({ consent: true, online: false }); const maps = await inspectOfflineMaps({ identity: c.identity, bundle: c.session.navigation, mapStyle: process.env.EXPO_PUBLIC_MAP_STYLE_URL }); setMapDownload(maps.ready ? 'Native map regions complete. Offline voice unverified.' : maps.reason || 'Map regions incomplete. Route guidance continues without verified maps.'); })())} />
    <ActionButton label="Pause navigation" disabled={busy || !owner.current?.session} tone="secondary" onPress={() => run(async () => owner.current.lifecycle('PAUSE'))} />
    <ActionButton label="Resume navigation" disabled={busy || !owner.current?.session} tone="secondary" onPress={() => run(async () => owner.current.lifecycle('RESUME'))} />
    <ActionButton label="Confirm arrival" disabled={busy || !owner.current?.session} tone="secondary" onPress={() => run(async () => owner.current.lifecycle('ARRIVE'))} />
    <ActionButton label="End navigation" disabled={busy || !owner.current?.session} tone="secondary" onPress={() => run(async () => { await owner.current.lifecycle('END'); watcher.current?.remove(); watcher.current = null; })} />
    <ActionButton label="Stop local guidance" tone="secondary" onPress={() => { owner.current?.stop(); owner.current?.engine.dispose(); owner.current = null; watcher.current?.remove(); watcher.current = null; }} />
  </Card>;
}
