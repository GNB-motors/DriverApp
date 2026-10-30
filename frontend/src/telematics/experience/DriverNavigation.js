import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path } from 'react-native-svg';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Badge, Card, colors, radius, spacing } from '../../components/ui';
import { useLanguage } from '../../context/LanguageContext';
import { useExperience } from './ExperienceContext';
import { useTelematicsApi } from '../context/TelematicsApiContext';
import { ActionButton, ExperiencePage, PreviewNotice } from './ExperienceUI';
import { getDriverCopy } from './driverCopy';
import { getDriveTokens } from '../../theme/driveTokens';

const AHEAD_MOCK = [
  {
    id: 'ahead-toll-1', type: 'toll', icon: 'cash-outline',
    name: 'Dhule Toll Plaza', distanceKm: 18, detail: '₹245 · FASTag',
    note: 'Busy — avg 8 min wait',
  },
  {
    id: 'ahead-pump-1', type: 'fuel', icon: 'water-outline',
    name: 'Indian Oil, NH-44', distanceKm: 34, detail: 'Diesel ₹92.4/L',
    note: 'Open 24h · Tank 40 KL',
  },
  {
    id: 'ahead-rest-1', type: 'rest', icon: 'cafe-outline',
    name: 'Dhaba & parking, Malegaon', distanceKm: 51, detail: 'Truck parking · Meals',
    note: 'Popular stop · 12 trucks now',
  },
  {
    id: 'ahead-toll-2', type: 'toll', icon: 'cash-outline',
    name: 'Chiplun Toll', distanceKm: 88, detail: '₹185 · FASTag',
    note: null,
  },
];

const AHEAD_TYPE_COLOR = { toll: colors.warning, fuel: colors.primary, rest: colors.success };

const DEMO_ROUTES = [
  { id: 'a', distanceKey: 'routeDistanceA', etaKey: 'routeEtaA' },
  { id: 'b', distanceKey: 'routeDistanceB', etaKey: 'routeEtaB' },
];
const DEMO_DESTINATIONS = [
  { key: 'destinationA', reason: 'suggestionPlan', id: 'plan' },
  { key: 'destinationC', reason: 'suggestionPredicted', id: 'example-next-stop' },
  { key: 'destinationB', reason: 'suggestionRecent', id: 'recent-yard' },
];

function useCopy() {
  const { language } = useLanguage();
  return (key) => getDriverCopy(language, key);
}

function DemoMap({ preview, hasRoute, theme, copy, degraded }) {
  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={preview ? copy('demoMap') : copy('mapUnavailable')}
      style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.map }]}
    >
      {preview ? (
        <Svg
          pointerEvents="none"
          width="100%"
          height="100%"
          viewBox="0 0 390 844"
          preserveAspectRatio="xMidYMid slice"
        >
          <Path d="M-35 180 C55 210 110 250 190 230 S330 145 435 170" stroke={theme.colors.mapRoadEdge} strokeWidth="30" fill="none" />
          <Path d="M-35 180 C55 210 110 250 190 230 S330 145 435 170" stroke={theme.colors.mapRoad} strokeWidth="23" fill="none" />
          <Path d="M40 880 C80 730 118 610 172 520 S268 350 342 -30" stroke={theme.colors.mapRoadEdge} strokeWidth="28" fill="none" />
          <Path d="M40 880 C80 730 118 610 172 520 S268 350 342 -30" stroke={theme.colors.mapRoad} strokeWidth="21" fill="none" />
          <Path d="M-20 570 C90 525 170 540 240 590 S345 680 420 655" stroke={theme.colors.mapRoadEdge} strokeWidth="24" fill="none" />
          <Path d="M-20 570 C90 525 170 540 240 590 S345 680 420 655" stroke={theme.colors.mapRoad} strokeWidth="18" fill="none" />
          {hasRoute ? (
            <Path
              d="M122 730 C125 660 153 590 176 520 S246 360 282 264 S325 188 338 132"
              stroke={degraded === 'offRoute' ? theme.colors.routeAlt : theme.colors.route}
              strokeWidth="9"
              strokeDasharray={degraded === 'offRoute' ? '13 10' : undefined}
              strokeLinecap="round"
              fill="none"
            />
          ) : null}
          {degraded === 'bothDark' ? (
            <Circle cx="122" cy="730" r="17" fill={theme.colors.estimated} stroke={theme.colors.surface} strokeWidth="5" />
          ) : (
            <>
              <Circle cx="122" cy="730" r="19" fill={theme.colors.surface} stroke={theme.colors.route} strokeWidth="5" />
              <Path d="M122 716 L130 735 L122 731 L114 735 Z" fill={theme.colors.route} />
            </>
          )}
          {hasRoute ? <Circle cx="338" cy="132" r="11" fill={theme.colors.surface} stroke={theme.colors.hazard} strokeWidth="5" /> : null}
        </Svg>
      ) : null}
    </View>
  );
}

function Choice({ label, selected, onPress, tone = 'secondary', minHeight = 56, disabled = false }) {
  return (
    <ActionButton
      label={label}
      selected={selected}
      tone={tone}
      disabled={disabled}
      onPress={onPress}
      style={[styles.choiceButton, { minHeight }]}
    />
  );
}

function PromptChip({ copy, question, onAnswer, onExpire }) {
  const progress = useRef(new Animated.Value(1)).current;
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  useEffect(() => {
    progress.setValue(1);
    const animation = Animated.timing(progress, {
      toValue: 0,
      duration: 10000,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animation.start();
    const timeout = setTimeout(() => onExpireRef.current(), 10000);
    return () => {
      animation.stop();
      clearTimeout(timeout);
    };
  }, [progress]);
  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <Card style={styles.promptCard} accessibilityRole="summary">
      <View style={styles.promptTitle}>
        <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
        <AppText weight="bold">{question || copy('promptJam')}</AppText>
        <AppText variant="caption" muted>{copy('promptTitle')}</AppText>
      </View>
      <View style={styles.promptTrack} accessibilityLabel={copy('promptExpired')}>
        <Animated.View style={[styles.promptProgress, { width }]} />
      </View>
      <View style={styles.promptActions}>
        <Choice label={copy('promptYes')} onPress={() => onAnswer('YES')} tone="primary" />
        <Choice label={copy('promptNo')} onPress={() => onAnswer('NO')} tone="secondary" />
      </View>
    </Card>
  );
}

function HoldSos({ preview, recordEvent, copy, palette }) {
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(false);
  const insets = useSafeAreaInsets();
  function confirm() {
    if (preview) recordEvent('SOS_DEMO_CONFIRMED', { source: 'navigation_hold', localOnly: true });
    setOpen(false);
  }
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${copy('sos')}. ${copy('holdSos')}`}
        accessibilityHint={copy('sosHint')}
        accessibilityActions={[{ name: 'activate', label: copy('sosHint') }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'activate') setOpen(true);
        }}
        onPress={() => setHint(true)}
        onLongPress={() => { setHint(false); setOpen(true); }}
        delayLongPress={1500}
        style={[styles.sosButton, { backgroundColor: palette.sos, minHeight: 56 }]}
      >
        <Ionicons name="shield-outline" size={22} color={colors.white} />
        <AppText weight="bold" color={colors.white}>{copy('sos')}</AppText>
      </Pressable>
      {hint ? <AppText variant="caption" color={palette.text}>{copy('sosHint')}</AppText> : null}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <View style={styles.modalScrim}>
          <View style={[styles.modalCard, { backgroundColor: palette.surface, marginTop: insets.top, marginBottom: insets.bottom }]}>
            <AppText variant="h3">{copy(preview ? 'sosConfirmTitle' : 'sosUnavailable')}</AppText>
            <AppText>{copy(preview ? 'sosConfirmBody' : 'sosUnavailable')}</AppText>
            {preview ? <Choice label={copy('confirmDemoSos')} onPress={confirm} tone="primary" /> : null}
            <Choice label={copy('close')} onPress={() => setOpen(false)} tone="secondary" />
          </View>
        </View>
      </Modal>
    </>
  );
}

export function NavigateScreen({ navigation }) {
  const copy = useCopy();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const dimensions = useWindowDimensions();
  const {
    preview,
    motion,
    setMotion,
    settings,
    setSettings,
    recordEvent,
  } = useExperience();
  const service = useTelematicsApi();
  const [panel, setPanel] = useState('idle');
  const [destination, setDestination] = useState('');
  const [query, setQuery] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('a');
  const [restrictionOpen, setRestrictionOpen] = useState(false);
  const [cacheOpen, setCacheOpen] = useState(false);
  const [degraded, setDegraded] = useState('normal');
  const [prompt, setPrompt] = useState(null);
  const [promptId, setPromptId] = useState(null);
  const [distanceToManeuver, setDistanceToManeuver] = useState(200);
  const [promptMessage, setPromptMessage] = useState('');
  const drive = getDriveTokens(settings.theme);
  const palette = drive.colors;
  const isStopped = preview && motion === 'stopped';
  const shownPanel = panel === 'guidance' && isStopped ? 'stopped' : panel;
  const hasRoute = preview && ['preview', 'guidance', 'site', 'stopped'].includes(shownPanel);
  const canPrompt = preview && motion === 'stopped' && distanceToManeuver > 300 && settings.prompts;
  const list = DEMO_DESTINATIONS
    .map((item) => ({ ...item, title: copy(item.key), reasonText: copy(item.reason) }))
    .filter((item) => !query || item.title.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    setPanel('idle');
    setDestination('');
    setQuery('');
    setSelectedRoute('a');
    setDegraded('normal');
    setPrompt(null);
    setDistanceToManeuver(200);
    setPromptMessage('');
    setRestrictionOpen(false);
    setCacheOpen(false);
  }, [preview]);

  function chooseDestination(item) {
    setDestination(item.title);
    setQuery(item.title);
    setPanel('preview');
    setSelectedRoute('a');
    recordEvent('DEMO_DESTINATION_SELECTED', { destinationId: item.id, name: item.title });
  }
  function startGuidance() {
    setPanel('guidance');
    setMotion('moving');
    recordEvent('DEMO_GUIDANCE_STARTED', { destination, routeId: selectedRoute });
  }
  function endGuidance() {
    recordEvent('DEMO_GUIDANCE_ENDED', { destination });
    setPanel('idle');
    setMotion('unknown');
    setDestination('');
    setQuery('');
    setDegraded('normal');
  }
  function answerPrompt(answer) {
    if (!prompt) return;
    recordEvent('QUESTION_ANSWERED', { questionId: prompt.id, answer, value: answer });
    if (promptId) service.answerPrompt(promptId, { answer }).catch(() => {});
    setPrompt(null);
    setPromptId(null);
    setPromptMessage('');
  }
  function expirePrompt() {
    if (!prompt) return;
    recordEvent('QUESTION_ANSWERED', { questionId: prompt.id, answer: 'UNANSWERED', value: 'UNANSWERED' });
    if (promptId) service.answerPrompt(promptId, { answer: 'UNANSWERED' }).catch(() => {});
    setPrompt(null);
    setPromptId(null);
    setPromptMessage(copy('promptExpired'));
  }
  async function showPrompt() {
    if (!preview || motion !== 'stopped' || distanceToManeuver <= 300 || !settings.prompts) return;
    setPromptMessage('');
    try {
      const res = await service.listPrompts({ limit: 1 });
      const first = res?.items?.[0] || res?.[0];
      if (first) {
        setPromptId(first.id || first._id);
        setPrompt({ id: first.id || first._id, question: first.question });
      } else {
        setPromptId(null);
        setPrompt({ id: `demo-jam-${Date.now()}` });
      }
    } catch {
      setPromptId(null);
      setPrompt({ id: `demo-jam-${Date.now()}` });
    }
  }
  function reportRoad() {
    navigation.navigate('Road report');
  }
  function setDemoSignal(value) {
    setDegraded(value);
    if (value === 'offRoute') recordEvent('DEMO_OFF_ROUTE', { routeId: selectedRoute });
    if (value === 'offline') recordEvent('DEMO_OFFLINE', { routeId: selectedRoute });
  }

  const topInset = insets.top + spacing.sm;
  const sheetBottom = insets.bottom + spacing.sm;
  const maxSheetHeight = Math.max(340, dimensions.height * 0.62);

  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: palette.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {focused ? <StatusBar style={settings.theme === 'night' ? 'light' : 'dark'} /> : null}
      <DemoMap
        preview={preview}
        hasRoute={hasRoute}
        theme={drive}
        copy={copy}
        degraded={degraded}
      />
      <View pointerEvents="box-none" style={[styles.topBar, { top: topInset, left: spacing.md + insets.left, right: spacing.md + insets.right }]}>
        <View style={styles.statusGroup}>
          <Badge tone={preview ? 'info' : 'neutral'} label={preview ? copy('previewMode') : copy('gpsUnknown')} dot />
          <Badge tone="neutral" label={`${copy('movement')}: ${copy(motion === 'moving' ? 'movementMoving' : motion === 'stopped' ? 'movementStopped' : 'movementUnknown')}`} />
        </View>
        <View style={styles.topActions}>
          <Pressable onPress={reportRoad} accessibilityRole="button" accessibilityLabel={copy('report')} style={[styles.iconControl, { minHeight: 56, backgroundColor: palette.surface }]}>
            <Ionicons name="alert-circle-outline" size={23} color={palette.hazard} />
          </Pressable>
          <HoldSos preview={preview} recordEvent={recordEvent} copy={copy} palette={palette} />
        </View>
      </View>
      <View pointerEvents="box-none" style={[styles.bottomArea, { bottom: sheetBottom, paddingHorizontal: spacing.md + insets.left + insets.right }]}>
        <View style={[styles.sheet, { backgroundColor: palette.surface, maxHeight: maxSheetHeight }]}>
          <View style={[styles.sheetHandle, { backgroundColor: palette.textMuted }]} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>
            <View style={styles.sheetHeading}>
              <View style={styles.flex}>
                <AppText variant="h3" color={palette.text}>{copy('navigate')}</AppText>
                <AppText variant="caption" color={palette.textMuted}>{preview ? copy('demoMapNotLive') : copy('disconnectedMapBody')}</AppText>
              </View>
              <Pressable onPress={() => navigation.navigate('Experience settings')} accessibilityRole="button" accessibilityLabel={copy('previewControls')} style={[styles.iconControl, { minHeight: 48, backgroundColor: palette.bg }]}>
                <Ionicons name="settings-outline" size={20} color={palette.text} />
              </Pressable>
            </View>
            <PreviewNotice />
            {shownPanel === 'idle' ? (
              <>
                <View style={styles.searchCard}>
                  <AppText weight="bold" color={palette.text}>{copy('whereTo')}</AppText>
                  <View style={[styles.searchRow, { borderColor: palette.border, backgroundColor: palette.bg }]}>
                    <Ionicons name="search-outline" size={21} color={palette.textMuted} />
                    <TextInput
                      accessibilityLabel={copy('searchDestination')}
                      placeholder={copy('searchDestination')}
                      placeholderTextColor={palette.textMuted}
                      value={query}
                      onChangeText={setQuery}
                      style={[styles.searchInput, { color: palette.text }]}
                      returnKeyType="search"
                      onSubmitEditing={() => { if (!preview) setPromptMessage(copy('routeNotConnected')); }}
                    />
                  </View>
                  {preview ? (
                    <>
                      <AppText variant="caption" color={palette.textMuted}>{copy('suggestions')}</AppText>
                      {list.slice(0, 3).map((item) => (
                        <Pressable key={item.id} onPress={() => chooseDestination(item)} accessibilityRole="button" accessibilityLabel={`${item.title}, ${item.reasonText}`} style={[styles.suggestion, { borderColor: palette.border }]}>
                          <Ionicons name="navigate-outline" size={20} color={palette.route} />
                          <View style={styles.flex}>
                            <AppText weight="semibold" color={palette.text}>{item.title}</AppText>
                            <AppText variant="caption" color={palette.textMuted}>{item.reasonText}</AppText>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
                        </Pressable>
                      ))}
                      {!list.length ? <AppText muted>{copy('noDestination')}</AppText> : null}
                    </>
                  ) : (
                    <AppText variant="small" color={palette.textMuted}>{copy('searchDisabledHint')}</AppText>
                  )}
                  {!preview ? <AppText variant="caption" color={palette.hazard}>{promptMessage || copy('routeNotConnected')}</AppText> : null}
                </View>
                <SettingsCard
                  copy={copy}
                  settings={settings}
                  setSettings={setSettings}
                  motion={motion}
                  setMotion={setMotion}
                  preview={preview}
                  palette={palette}
                />
              </>
            ) : null}
            {shownPanel === 'preview' ? (
              <RoutePreview
                copy={copy}
                destination={destination}
                selectedRoute={selectedRoute}
                setSelectedRoute={setSelectedRoute}
                restrictionOpen={restrictionOpen}
                setRestrictionOpen={setRestrictionOpen}
                cacheOpen={cacheOpen}
                setCacheOpen={setCacheOpen}
                onStart={startGuidance}
                onBack={() => setPanel('idle')}
                palette={palette}
                isNight={drive.isNight}
              />
            ) : null}
            {['guidance', 'stopped', 'site'].includes(shownPanel) ? (
              <GuidancePanel
                copy={copy}
                panel={shownPanel}
                preview={preview}
                motion={motion}
                setMotion={setMotion}
                settings={settings}
                setSettings={setSettings}
                degraded={degraded}
                setDemoSignal={setDemoSignal}
                distanceToManeuver={distanceToManeuver}
                setDistanceToManeuver={setDistanceToManeuver}
                prompt={prompt}
                promptMessage={promptMessage}
                canPrompt={canPrompt}
                showPrompt={showPrompt}
                answerPrompt={answerPrompt}
                expirePrompt={expirePrompt}
                onSite={() => { setPanel('site'); recordEvent('DEMO_POSSIBLE_SITE_APPROACH', { destination }); }}
                onBack={() => setPanel('guidance')}
                onEnd={endGuidance}
                navigation={navigation}
                recordEvent={recordEvent}
                destination={destination}
                palette={palette}
                isNight={drive.isNight}
              />
            ) : null}
          </ScrollView>
        </View>
      </View>
      <AppText pointerEvents="none" style={[styles.mapCaption, { top: topInset + 56, color: palette.textMuted }]}>
        {preview ? copy('demoMap') : copy('mapUnavailable')}
      </AppText>
    </KeyboardAvoidingView>
  );
}

function RoutePreview({ copy, destination, selectedRoute, setSelectedRoute, restrictionOpen, setRestrictionOpen, cacheOpen, setCacheOpen, onStart, onBack, palette, isNight }) {
  return (
    <View style={styles.section}>
      <View style={styles.between}>
        <AppText variant="h3" color={palette.text}>{copy('routePreview')}</AppText>
        <Choice label={copy('backToSearch')} onPress={onBack} tone="secondary" minHeight={48} />
      </View>
      <AppText variant="bodyStrong" color={palette.text}>{destination}</AppText>
      <AppText variant="caption" color={palette.hazard}>{copy('sampleOnly')}</AppText>
      {[...DEMO_ROUTES].map((item, index) => (
        <Pressable
          key={item.id}
          onPress={() => setSelectedRoute(item.id)}
          accessibilityRole="radio"
          accessibilityState={{ selected: selectedRoute === item.id }}
          accessibilityLabel={`${copy(index === 0 ? 'routeA' : 'routeB')}. ${copy(item.etaKey)}. ${copy(item.distanceKey)}.`}
          style={[styles.routeChoice, { backgroundColor: palette.bg, borderColor: selectedRoute === item.id ? palette.route : palette.border }]}
        >
          <Ionicons name={selectedRoute === item.id ? 'radio-button-on' : 'radio-button-off'} size={24} color={palette.route} />
          <View style={styles.flex}>
            <AppText variant="caption" color={palette.textMuted}>{copy('etaRange')}</AppText>
            <AppText style={getDriveTokens(isNight ? 'night' : 'day').type.etaRange} color={palette.text}>{copy(item.etaKey)}</AppText>
            <AppText variant="small" color={palette.text}>{copy(index === 0 ? 'routeA' : 'routeB')} · {copy(item.distanceKey)}</AppText>
            <AppText variant="caption" color={palette.textMuted}>{copy('tollsUnavailable')}</AppText>
          </View>
        </Pressable>
      ))}
      <AppText variant="caption" color={palette.textMuted}>{copy('sampleOnly')}</AppText>
      <View style={[styles.inlineNotice, { backgroundColor: palette.bg }]}>
        <Ionicons name="warning-outline" size={20} color={palette.hazard} />
        <AppText style={styles.flex} color={palette.text}>{copy('restrictionUnknown')}</AppText>
        <Pressable onPress={() => setRestrictionOpen(!restrictionOpen)} accessibilityRole="button" accessibilityState={{ expanded: restrictionOpen }} style={styles.smallTouch}>
          <AppText weight="bold" color={palette.route}>{copy('restrictionDetails')}</AppText>
        </Pressable>
      </View>
      {restrictionOpen ? <AppText variant="small" color={palette.hazard}>{copy('restrictionNotice')}</AppText> : null}
      <Pressable onPress={() => setCacheOpen(!cacheOpen)} accessibilityRole="button" accessibilityState={{ expanded: cacheOpen }} style={[styles.inlineNotice, { backgroundColor: palette.bg, minHeight: 48 }]}>
        <Ionicons name="cloud-download-outline" size={20} color={palette.route} />
        <AppText style={styles.flex} color={palette.text}>{copy('cacheTitle')}</AppText>
        <Ionicons name={cacheOpen ? 'chevron-up' : 'chevron-down'} size={18} color={palette.textMuted} />
      </Pressable>
      {cacheOpen ? <View style={{ gap: 6 }}><AppText variant="small" color={palette.textMuted}>{copy('cacheDemo')}</AppText><AppText variant="caption" color={palette.hazard}>{copy('downloadUnavailable')}</AppText></View> : null}
      <ActionButton label={copy('startDemo')} onPress={onStart} style={{ minHeight: 56 }} />
    </View>
  );
}

function GuidancePanel({ copy, language, panel, preview, motion, setMotion, settings, setSettings, degraded, setDemoSignal, distanceToManeuver, setDistanceToManeuver, prompt, promptMessage, canPrompt, showPrompt, answerPrompt, expirePrompt, onSite, onBack, onEnd, navigation, recordEvent, destination, palette, isNight }) {
  const stopped = panel === 'stopped';
  const site = panel === 'site';
  const movingTarget = stopped ? 48 : 56;
  return (
    <View style={styles.section}>
      <View style={[styles.maneuverBanner, { backgroundColor: palette.maneuver }]}>
        <View style={styles.maneuverArrow}><Ionicons name="arrow-forward" size={48} color={isNight ? colors.black : colors.white} /></View>
        <View style={styles.flex}>
          <AppText style={getDriveTokens(isNight ? 'night' : 'day').type.maneuverDistance} color={isNight ? colors.black : colors.white}>{copy(distanceToManeuver > 300 ? 'maneuverDistanceFar' : 'maneuverDistanceNear')}</AppText>
          <AppText variant="h3" color={isNight ? colors.black : colors.white}>{copy(distanceToManeuver > 300 ? 'maneuverRightFar' : 'maneuverRightNear')}</AppText>
          <AppText style={getDriveTokens(isNight ? 'night' : 'day').type.roadName} color={isNight ? colors.black : colors.white}>{copy('roadName')}</AppText>
          <AppText variant="caption" color={isNight ? '#222' : colors.onPrimaryMuted}>{copy('nextManeuver')}</AppText>
        </View>
      </View>
      <View style={styles.between}>
        <Badge tone={degraded === 'bothDark' ? 'pending' : degraded === 'offline' ? 'neutral' : 'info'} label={degraded === 'bothDark' ? copy('estimatedPosition') : degraded === 'normal' ? copy('positionDemo') : copy(degraded)} dot />
        {stopped ? <Badge tone="neutral" label={copy('stoppedTitle')} /> : null}
      </View>
      {degraded === 'offline' || degraded === 'offRoute' ? <AppText color={palette.hazard}>{copy('recalcOffline')}</AppText> : null}
      {degraded === 'bothDark' ? <AppText color={palette.hazard}>{copy('noHazards')}</AppText> : null}
      {prompt ? <PromptChip copy={copy} question={prompt?.question} onAnswer={answerPrompt} onExpire={expirePrompt} /> : null}
      {!prompt && promptMessage ? <AppText variant="small" color={palette.textMuted}>{promptMessage}</AppText> : null}
      <Card style={[styles.etaCard, { backgroundColor: palette.bg, borderColor: palette.border }]}>
        <AppText variant="caption" color={palette.textMuted}>{copy('etaRange')}</AppText>
        <AppText style={getDriveTokens(isNight ? 'night' : 'day').type.etaRange} color={palette.text}>{copy('etaDemo')}</AppText>
        <View style={styles.between}>
          <AppText variant="small" color={palette.text}>{copy('distanceLeftDemo')}</AppText>
          <Badge tone={degraded === 'bothDark' ? 'pending' : 'info'} label={degraded === 'bothDark' ? copy('estimatedPosition') : copy('positionDemo')} />
        </View>
      </Card>
      {!settings.simpleMode && degraded !== 'bothDark' ? (
        <View style={styles.aheadCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText weight="bold" color={palette.text}>{copy('ahead') || 'What\'s ahead'}</AppText>
            <AppText variant="caption" color={palette.textMuted}>{copy('sampleOnly') || 'Sample'}</AppText>
          </View>
          {AHEAD_MOCK.map((item) => (
            <View key={item.id} style={[styles.aheadItemCard, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <View style={[styles.aheadItemIcon, { backgroundColor: palette.surface }]}>
                <Ionicons name={item.icon} size={18} color={AHEAD_TYPE_COLOR[item.type] || palette.textMuted} />
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <AppText variant="small" weight="semibold" color={palette.text} numberOfLines={1} style={{ flex: 1 }}>
                    {item.name}
                  </AppText>
                  <AppText variant="small" weight="semibold" color={AHEAD_TYPE_COLOR[item.type] || palette.textMuted}>
                    {item.distanceKm} km
                  </AppText>
                </View>
                <AppText variant="small" color={palette.textMuted}>{item.detail}</AppText>
                {item.note ? <AppText variant="small" color={palette.textMuted}>{item.note}</AppText> : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}
      {stopped ? (
        <View style={styles.stopCard}>
          <AppText variant="h3" color={palette.text}>{copy('stopReason')}</AppText>
          <View style={styles.choiceWrap}>
            {['Food', 'Rest', 'Jam', 'Breakdown', 'Checkpost', 'Other'].map((reason) => {
              const key = { Food: 'reasonFood', Rest: 'reasonRest', Jam: 'reasonJam', Breakdown: 'reasonBreakdown', Checkpost: 'reasonCheckpost', Other: 'reasonOther' }[reason];
              return <Choice key={reason} label={copy(key)} onPress={() => recordEvent('DEMO_STOP_REASON', { reason: key })} tone="secondary" minHeight={48} />;
            })}
          </View>
          <AppText variant="small" color={palette.textMuted}>{copy('legalTimeUnavailable')}</AppText>
          {canPrompt ? <ActionButton label={copy('showPrompt')} onPress={showPrompt} style={{ minHeight: movingTarget }} /> : null}
          {!settings.prompts ? <AppText variant="caption" color={palette.textMuted}>{copy('promptsOff')}</AppText> : null}
        </View>
      ) : null}
      {site ? (
        <Card style={styles.siteCard}>
          <Badge tone="pending" label={copy('possiblyEntering')} dot />
          <AppText variant="h3" color={palette.text}>{copy('queueUnavailable')}</AppText>
          <AppText variant="small" color={palette.textMuted}>{copy('gatePapers')}</AppText>
          {[
            ['paperLr', 'lr'],
            ['paperEway', 'other'],
            ['paperWeighment', 'other'],
            ['paperPod', 'pod'],
          ].map(([key, hint]) => (
            <Pressable
              key={key}
              disabled={motion !== 'stopped'}
              onPress={() => navigation.navigate('Universal capture', { hint })}
              accessibilityRole="button"
              accessibilityState={{ disabled: motion !== 'stopped' }}
              accessibilityLabel={`${copy(key)}. ${motion !== 'stopped' ? copy('availableWhenStopped') : copy('openCapture')}`}
              style={[styles.paperButton, { borderColor: palette.border, opacity: motion === 'stopped' ? 1 : 0.58, minHeight: movingTarget }]}
            >
              <Ionicons name="document-text-outline" size={19} color={palette.route} />
              <AppText style={styles.flex} color={palette.text}>{copy(key)}</AppText>
              <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
            </Pressable>
          ))}
          <AppText variant="caption" color={palette.textMuted}>{copy(motion === 'stopped' ? 'availableWhenStopped' : 'motionGate')}</AppText>
          <View style={styles.choiceWrap}>
            <Choice label={copy('loading')} onPress={() => recordEvent('DEMO_SITE_CHOICE', { choice: 'LOADING', destination })} tone="secondary" minHeight={movingTarget} />
            <Choice label={copy('waiting')} onPress={() => recordEvent('DEMO_SITE_CHOICE', { choice: 'WAITING', destination })} tone="secondary" minHeight={movingTarget} />
          </View>
          <ActionButton label={copy('backToSearch')} onPress={onBack} tone="secondary" style={{ minHeight: movingTarget }} />
        </Card>
      ) : null}
      <View style={styles.choiceWrap}>
        {!stopped && !site ? <ActionButton label={copy('showPrompt')} disabled={!canPrompt} onPress={showPrompt} tone="secondary" style={{ minHeight: movingTarget }} /> : null}
        <ActionButton label={copy(site ? 'guidance' : 'possiblyEntering')} disabled={site} onPress={onSite} tone="secondary" style={{ minHeight: movingTarget }} />
        {stopped ? <ActionButton label={copy('guidance')} onPress={() => setMotion('moving')} style={{ minHeight: movingTarget }} /> : null}
        <ActionButton label={copy('endDemo')} onPress={onEnd} tone="secondary" style={{ minHeight: movingTarget }} />
      </View>
      <View style={styles.section}>
        <AppText variant="h3" color={palette.text}>{copy('degradedControls')}</AppText>
        <View style={styles.choiceWrap}>
          {[
            ['normal', 'normalSignal'],
            ['phoneWeak', 'phoneWeak'],
            ['truckDark', 'truckDark'],
            ['bothDark', 'bothDark'],
            ['offline', 'offline'],
            ['offRoute', 'offRoute'],
          ].map(([value, key]) => <Choice key={value} label={copy(key)} selected={degraded === value} onPress={() => setDemoSignal(value)} tone="secondary" minHeight={48} />)}
        </View>
        <View style={styles.between}>
          <AppText variant="small" color={palette.text}>{copy('distance')}</AppText>
          <Choice label={distanceToManeuver > 300 ? '1.2 km' : '200 m'} onPress={() => setDistanceToManeuver(distanceToManeuver > 300 ? 200 : 1200)} tone="secondary" minHeight={48} />
        </View>
        {distanceToManeuver <= 300 ? <AppText variant="caption" color={palette.textMuted}>{copy('promptNearManeuver')}</AppText> : null}
        {motion === 'moving' ? <AppText variant="caption" color={palette.textMuted}>{copy('promptDeferredMoving')}</AppText> : null}
        {!settings.prompts ? <AppText variant="caption" color={palette.textMuted}>{copy('promptsOff')}</AppText> : null}
      </View>
      <SettingsCard copy={copy} settings={settings} setSettings={setSettings} motion={motion} setMotion={setMotion} preview={preview} palette={palette} />
    </View>
  );
}

function SettingsCard({ copy, settings, setSettings, motion, setMotion, preview, palette }) {
  return (
    <View style={[styles.settingsCard, { backgroundColor: palette.bg }]}>
      <AppText variant="h3" color={palette.text}>{copy('previewControls')}</AppText>
      {!preview ? <AppText variant="small" color={palette.textMuted}>{copy('searchDisabledHint')}</AppText> : null}
      {preview ? (
        <>
          <AppText weight="semibold" color={palette.text}>{copy('movement')}</AppText>
          <View style={styles.choiceWrap}>
            {[
              ['unknown', 'movementUnknown'],
              ['moving', 'movementMoving'],
              ['stopped', 'movementStopped'],
            ].map(([value, key]) => <Choice key={value} label={copy(key)} selected={motion === value} onPress={() => setMotion(value)} tone="secondary" minHeight={48} />)}
          </View>
        </>
      ) : null}
      <AppText weight="semibold" color={palette.text}>{copy('theme')}</AppText>
      <View style={styles.choiceWrap}>
        {[
          ['day', 'day'],
          ['night', 'night'],
          ['auto', 'automatic'],
        ].map(([value, key]) => <Choice key={value} label={copy(key)} selected={settings.theme === value} onPress={() => setSettings({ theme: value })} tone="secondary" minHeight={48} />)}
      </View>
      {settings.theme === 'auto' ? <AppText variant="caption" color={palette.textMuted}>{copy('autoNightUnavailable')}</AppText> : null}
      <View style={styles.settingLine}>
        <AppText style={styles.flex} color={palette.text}>{copy('orientation')}</AppText>
        <View style={styles.choiceWrap}>
          {[
            ['north', 'northUp'],
            ['heading', 'headingUp'],
          ].map(([value, key]) => <Choice key={value} label={copy(key)} selected={settings.orientation === value} onPress={() => setSettings({ orientation: value })} tone="secondary" minHeight={48} />)}
        </View>
      </View>
      {[
        ['simpleMode', 'simpleMode'],
        ['voice', 'voiceGuidance'],
        ['dataSaver', 'dataSaver'],
        ['prompts', 'promptSettings'],
      ].map(([key, label]) => (
        <View key={key} style={styles.settingLine}>
          <AppText style={styles.flex} color={palette.text}>{copy(label)}</AppText>
          <Choice
            label={settings[key] ? copy('enabled') : copy('disabled')}
            selected={!!settings[key]}
            onPress={() => setSettings({ [key]: !settings[key] })}
            tone="secondary"
            minHeight={48}
          />
        </View>
      ))}
      {motion === 'moving' ? <AppText variant="caption" color={palette.textMuted}>{copy('parkedSettingsOnly')}</AppText> : null}
    </View>
  );
}

export function CaptureScreen({ navigation }) {
  const copy = useCopy();
  const { motion, preview, recordEvent } = useExperience();
  const { colors: palette } = getDriveTokens('day');
  const available = motion === 'stopped';
  const gateCopy = motion === 'unknown' ? copy('motionUnknownGate') : !available ? copy('motionGate') : copy('noUpload');
  function openCapture(hint) {
    if (!available) return;
    navigation.navigate('Universal capture', { hint });
  }
  const [sosConfirm, setSosConfirm] = useState(false);
  function confirmSos() {
    if (preview) recordEvent('SOS_DEMO_CONFIRMED', { source: 'capture_hold', localOnly: true });
    setSosConfirm(false);
  }
  const insets = useSafeAreaInsets();
  return (
    <ExperiencePage navigation={navigation} title={copy('capture')} subtitle={copy('captureSubtitle')}>
      <Card style={{ gap: spacing.md, backgroundColor: palette.blueTint }}>
        <AppText variant="h3">{copy(available ? 'movementStopped' : motion === 'moving' ? 'movementMoving' : 'movementUnknown')}</AppText>
        <AppText variant="small" muted>{gateCopy}</AppText>
        <AppText variant="caption" muted>{preview ? copy('sampleOnly') : copy('noUpload')}</AppText>
      </Card>
      <View style={styles.captureActions}>
        <AppText variant="h3">{copy('capture')}</AppText>
        <ActionButton
          label={copy('openCapture')}
          disabled={!available}
          onPress={() => openCapture('other')}
          style={{ minHeight: available ? 48 : 56 }}
        />
        <ActionButton
          label={copy('fuelSlip')}
          disabled={!available}
          onPress={() => openCapture('fuel')}
          tone="secondary"
          style={{ minHeight: available ? 48 : 56 }}
        />
        <ActionButton label={copy('roadReport')} onPress={() => navigation.navigate('Road report')} tone="secondary" style={{ minHeight: 56 }} />
        <ActionButton label={copy('truckIssue')} onPress={() => navigation.navigate('Truck issue')} tone="secondary" style={{ minHeight: 56 }} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${copy('sos')}. ${copy('holdSos')}`}
          accessibilityHint={copy('sosHint')}
          onLongPress={() => setSosConfirm(true)}
          delayLongPress={1500}
          style={[styles.sosButton, { backgroundColor: palette.sos, minHeight: 56 }]}
        >
          <Ionicons name="shield-outline" size={22} color={colors.white} />
          <AppText weight="bold" color={colors.white}>{copy('sos')} · {copy('holdSos')}</AppText>
        </Pressable>
      </View>
      <SosConfirmation
        visible={sosConfirm}
        preview={preview}
        copy={copy}
        onClose={() => setSosConfirm(false)}
        onConfirm={confirmSos}
        insets={insets}
        palette={palette}
      />
    </ExperiencePage>
  );
}

function SosConfirmation({ visible, preview, copy, onClose, onConfirm, insets, palette }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.modalScrim}>
        <View style={[styles.modalCard, { backgroundColor: palette.surface, marginTop: insets.top, marginBottom: insets.bottom }]}>
          <AppText variant="h3">{copy(preview ? 'sosConfirmTitle' : 'sosUnavailable')}</AppText>
          <AppText>{copy(preview ? 'sosConfirmBody' : 'sosUnavailable')}</AppText>
          {preview ? <ActionButton label={copy('confirmDemoSos')} onPress={onConfirm} style={{ minHeight: 56 }} /> : null}
          <ActionButton label={copy('close')} onPress={onClose} tone="secondary" style={{ minHeight: 56 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { position: 'absolute', zIndex: 3, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  statusGroup: { gap: spacing.xs, flex: 1 },
  topActions: { alignItems: 'flex-end', gap: spacing.sm, maxWidth: 128 },
  iconControl: { width: 56, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  sosButton: { minWidth: 56, paddingHorizontal: 14, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  bottomArea: { position: 'absolute', left: 0, right: 0, zIndex: 2, alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 720, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.md, paddingTop: spacing.sm, elevation: 8 },
  sheetHandle: { width: 40, height: 4, borderRadius: radius.full, alignSelf: 'center', opacity: 0.35, marginBottom: spacing.sm },
  sheetContent: { gap: spacing.md, paddingBottom: spacing.sm },
  sheetHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  section: { gap: spacing.sm },
  flex: { flex: 1, minWidth: 0 },
  between: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  searchCard: { gap: spacing.sm },
  searchRow: { minHeight: 56, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  searchInput: { flex: 1, minHeight: 52, fontSize: 17, paddingVertical: spacing.sm },
  suggestion: { minHeight: 56, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  routeChoice: { minHeight: 112, padding: spacing.md, borderWidth: 2, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  choiceButton: { flexGrow: 0, minWidth: 110 },
  inlineNotice: { minHeight: 56, borderRadius: radius.md, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  smallTouch: { minHeight: 48, paddingHorizontal: spacing.sm, justifyContent: 'center' },
  maneuverBanner: { minHeight: 142, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  maneuverArrow: { width: 72, height: 72, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  etaCard: { gap: spacing.xs },
  aheadCard: { gap: spacing.xs },
  aheadRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  aheadItemCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: radius.md, borderWidth: 1, padding: 10 },
  aheadItemIcon: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  promptCard: { gap: spacing.sm },
  promptTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  promptTrack: { height: 6, borderRadius: radius.full, backgroundColor: colors.fog700, overflow: 'hidden' },
  promptProgress: { height: 6, borderRadius: radius.full, backgroundColor: colors.primary },
  promptActions: { flexDirection: 'row', gap: spacing.sm },
  stopCard: { gap: spacing.sm },
  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  siteCard: { gap: spacing.sm },
  paperButton: { paddingHorizontal: spacing.md, borderWidth: 1, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  settingsCard: { padding: spacing.md, borderRadius: radius.lg, gap: spacing.sm },
  settingLine: { minHeight: 52, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  mapCaption: { position: 'absolute', left: spacing.md, zIndex: 1, fontSize: 12, backgroundColor: 'rgba(255,255,255,0.78)', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm },
  modalScrim: { flex: 1, backgroundColor: 'rgba(9,13,22,0.62)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  modalCard: { width: '100%', maxWidth: 480, padding: spacing.lg, borderRadius: radius.xl, gap: spacing.md },
  captureActions: { gap: spacing.md },
});

export default NavigateScreen;
