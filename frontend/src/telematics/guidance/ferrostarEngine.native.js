import { FerrostarCore, ManualLocationProvider, CorrectiveAction, NavigationUiState } from '@stadiamaps/ferrostar-core-react-native';
import { RouteAdapter, WellKnownRouteProvider, ManeuverType, ManeuverModifier, DrivingSide, UserLocation, WaypointAdvanceMode, RouteDeviationTracking, CourseFiltering, stepAdvanceDistanceEntryAndExit, stepAdvanceDistanceToEndOfStep } from '@stadiamaps/ferrostar-uniffi-react-native';
import * as Speech from 'expo-speech';
import { validateBundle } from './navigationCoordinator';

export async function createFerrostarEngine({ language = 'en', onState = () => {}, onDeviation = () => {}, foregroundService } = {}) {
  const voices = await Speech.getAvailableVoicesAsync();
  let voiceSelection = null;
  let muted = false;
  const provider = new ManualLocationProvider();
  const adapter = RouteAdapter.fromWellKnownRouteProvider(WellKnownRouteProvider.Valhalla.new({ endpointUrl: 'https://unused.invalid', profile: 'truck', optionsJson: undefined }));
  const config = {
    waypointAdvance: new WaypointAdvanceMode.WaypointWithinRange(100),
    stepAdvanceCondition: stepAdvanceDistanceEntryAndExit(30, 5, 32),
    arrivalStepAdvanceCondition: stepAdvanceDistanceToEndOfStep(10, 32),
    routeDeviationTracking: new RouteDeviationTracking.StaticThreshold({ minimumHorizontalAccuracy: 15, maxAcceptableDeviation: 50 }),
    snappedLocationCourseFiltering: CourseFiltering.SnapToRoute,
  };
  let deviationPending = false;
  const core = new FerrostarCore(config, provider, { kind: 'custom', getRoutes: async () => [] }, {
    speak(text, sdkMuted) {
      if (sdkMuted || muted) return;
      if (!voiceSelection || Date.parse(voiceSelection.expiresAt) <= Date.now() || (voiceSelection.offlinePolicy && !voiceSelection.offlineVerified)) {
        Speech.stop(); voiceSelection = null; return;
      }
      Speech.speak(text, { language: voiceSelection.language, voice: voiceSelection.voiceIdentifier });
    },
    stop() { Speech.stop(); },
  }, {
    correctiveActionForDeviation(_core, kind, waypoints) {
      if (!deviationPending) {
        deviationPending = true;
        Promise.resolve().then(() => onDeviation({ kind, waypoints })).finally(() => { deviationPending = false; });
      }
      // GNB explicitly commits a server-versioned route before replacing the SDK route.
      return CorrectiveAction.DoNothing;
    },
  }, foregroundService);
  // The generated enums are numeric; the screen reads their names.
  const name = (values, value) => (typeof value === 'number' ? values[value] : value);
  const listener = core.addStateListener(state => {
    const ui = NavigationUiState.fromFerrostar(state);
    const content = ui.visualInstruction?.primaryContent;
    onState({ ...state, ui, maneuver: content && { type: name(ManeuverType, content.maneuverType), modifier: name(ManeuverModifier, content.maneuverModifier), drivingSide: ui.drivingSide === undefined ? undefined : name(DrivingSide, ui.drivingSide)?.toLowerCase() } });
  });
  await core.connectLocationProvider(provider);
  return {
    core,
    capabilities: { engine: 'Ferrostar 0.59.0', voiceAvailable: false, language, offlineVoiceVerified: false, backgroundVerified: false },
    installedVoices: voices,
    setVoicePolicy(selection) {
      const changed = voiceSelection?.voiceIdentifier !== selection?.voiceIdentifier;
      voiceSelection = selection || null;
      // Stop an utterance immediately if the server suspends or replaces it.
      if (changed || !voiceSelection) Speech.stop();
    },
    setMuted(value) { muted = value === true; if (muted) Speech.stop(); },
    parse(bundle) {
      validateBundle(bundle);
      const bytes = new TextEncoder().encode(JSON.stringify(bundle.payload));
      const routes = adapter.parseResponse(bytes.buffer);
      if (routes.length !== 1 || !routes[0].geometry?.length) throw new Error('Ferrostar could not parse the selected route.');
      return routes[0];
    },
    location(fix) { provider.updateLocation(UserLocation.new({ coordinates: { lat: fix.latitude, lng: fix.longitude }, horizontalAccuracy: fix.accuracy, timestamp: new Date(fix.timestamp), speed: fix.speed >= 0 ? { value: fix.speed, accuracy: undefined } : undefined, courseOverGround: Number.isFinite(fix.heading) && fix.heading >= 0 ? { degrees: fix.heading, accuracy: undefined } : undefined })); },
    start(route) { core.startNavigation(route); },
    replace(route) { core.replaceRoute(route); },
    stop() { core.stopNavigation(); },
    dispose() { core.stopNavigation(); core.removeStateListener(listener); core.disconnectLocationProvider(); },
  };
}
