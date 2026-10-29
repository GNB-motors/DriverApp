import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card, colors, radius } from '../../components/ui';
import { useExperience } from './ExperienceContext';
import { ActionButton, ExperiencePage } from './ExperienceUI';
import { useManagerCopy } from './managerCopy';

// These deterministic examples exist only in the explicitly enabled preview.
// Their ranking is explanatory (severity × confidence × stake × urgency), not
// production ranking and not a learned model.
const ACTION_FIXTURES = [
  { id: 'preview-sos', type: 'sos', title: 'sosTitle', fact: 'sosFact', vehicle: 'truckSos', driver: 'driverSunil', location: 'sampleLocationSos', when: 'evidenceTimeSos', sources: ['evidenceSourceDriver', 'evidenceSourcePosition'], confidence: 'confidenceHigh', driverSide: 'driverSideMissing', score: [5, 5, 5, 5] },
  { id: 'preview-duty', type: 'duty', title: 'dutyTitle', fact: 'dutyFact', vehicle: 'truckEta', driver: 'driverRavi', location: 'sampleLocationEta', when: 'evidenceTimeEta', sources: ['evidenceSourceDriver', 'evidenceSourcePosition'], confidence: 'confidenceHigh', driverSide: 'driverSideMissing', score: [5, 5, 4, 4] },
  { id: 'preview-eta', type: 'eta', title: 'etaTitle', fact: 'etaFact', vehicle: 'truckEta', driver: 'driverRavi', location: 'sampleLocationEta', when: 'evidenceTimeEta', sources: ['evidenceSourcePosition', 'evidenceSourcePromise'], confidence: 'confidenceHigh', driverSide: 'driverSideJam', score: [4, 4, 4, 5] },
  { id: 'preview-plant', type: 'plant', title: 'plantTitle', fact: 'plantFact', vehicle: 'truckPlant', driver: 'driverSunil', location: 'sampleLocationPlant', when: 'evidenceTimePlant', sources: ['evidenceSourcePosition', 'evidenceSourceSite'], confidence: 'confidenceHigh', driverSide: 'driverSidePlant', score: [3, 4, 3, 4] },
  { id: 'preview-idle', type: 'idle', title: 'idleTitle', fact: 'idleFact', vehicle: 'truckPlant', driver: 'driverSunil', location: 'sampleLocationPlant', when: 'evidenceTimePlant', sources: ['evidenceSourcePosition', 'evidenceSourceSite', 'evidenceSourceEngine'], confidence: 'confidenceHigh', driverSide: 'driverSideMissing', score: [4, 5, 3, 3] },
  { id: 'preview-without-driver', type: 'withoutDriver', title: 'withoutDriverTitle', fact: 'withoutDriverFact', vehicle: 'truckSos', driver: 'driverSunil', location: 'sampleLocationSos', when: 'evidenceTimeTracking', sources: ['evidenceSourcePosition', 'evidenceSourceCrew'], confidence: 'confidenceMedium', driverSide: 'driverSideMissing', score: [4, 3, 4, 3] },
  { id: 'preview-tracking', type: 'tracking', title: 'trackingTitle', fact: 'trackingFact', vehicle: 'truckTracking', driver: 'driverRavi', location: 'sampleLocationTracking', when: 'evidenceTimeTracking', sources: ['evidenceSourcePosition', 'evidenceSourceDriver'], confidence: 'confidenceMedium', driverSide: 'driverSideMissing', score: [3, 3, 3, 3] },
  { id: 'preview-deviation', type: 'deviation', title: 'deviationTitle', fact: 'deviationFact', vehicle: 'truckEta', driver: 'driverRavi', location: 'sampleLocationEta', when: 'evidenceTimeEta', sources: ['evidenceSourcePosition', 'evidenceSourceDriver', 'evidenceSourceCorridor'], confidence: 'confidenceMedium', driverSide: 'driverSideMissing', score: [3, 3, 3, 3] },
  { id: 'preview-fuel', type: 'fuel', title: 'fuelTitle', fact: 'fuelFact', vehicle: 'truckPlant', driver: 'driverSunil', location: 'sampleLocationPlant', when: 'evidenceTimePapers', sources: ['evidenceSourceFuel', 'evidenceSourceCapture'], confidence: 'confidenceMedium', driverSide: 'driverSideMissing', score: [4, 3, 4, 3] },
  { id: 'preview-unsafe', type: 'unsafe', title: 'unsafeTitle', fact: 'unsafeFact', vehicle: 'truckSos', driver: 'driverSunil', location: 'sampleLocationSos', when: 'evidenceTimeEta', sources: ['evidenceSourceDriving'], confidence: 'confidenceMedium', driverSide: 'driverSideMissing', score: [4, 3, 3, 3] },
  { id: 'preview-papers', type: 'papers', title: 'papersTitle', fact: 'papersFact', vehicle: 'truckPapers', driver: 'driverRavi', location: 'sampleLocationPapers', when: 'evidenceTimePapers', sources: ['evidenceSourceCapture', 'evidenceSourceDriver'], confidence: 'confidenceHigh', driverSide: 'driverSideMissing', score: [3, 4, 2, 3] },
  { id: 'preview-eway', type: 'eway', title: 'ewayTitle', fact: 'ewayFact', vehicle: 'truckEta', driver: 'driverRavi', location: 'sampleLocationEta', when: 'evidenceTimeEta', sources: ['evidenceSourceEway', 'evidenceSourcePosition'], confidence: 'confidenceMedium', driverSide: 'driverSideMissing', score: [4, 3, 4, 4] },
  { id: 'preview-document', type: 'document', title: 'documentActionTitle', fact: 'documentActionFact', vehicle: 'truckPapers', driver: 'driverRavi', location: 'sampleLocationPapers', when: 'evidenceTimePapers', sources: ['evidenceSourceDocument'], confidence: 'confidenceHigh', driverSide: 'driverSideMissing', score: [3, 4, 2, 3] },
  { id: 'preview-broadcast', type: 'broadcast', title: 'broadcastTitle', fact: 'broadcastFact', vehicle: 'truckEta', driver: 'driverRavi', location: 'sampleLocationEta', when: 'evidenceTimeEta', sources: ['evidenceSourceBroadcast'], confidence: 'confidenceMedium', driverSide: 'driverSideMissing', score: [2, 3, 2, 3] },
].sort((a, b) => scoreOf(b) - scoreOf(a));

function scoreOf(action) { return action.score.reduce((product, value) => product * value, 1); }
const TYPE_COPY = { sos: 'typeSos', duty: 'typeDuty', eta: 'typeEta', plant: 'typePlant', idle: 'typeIdle', withoutDriver: 'typeWithoutDriver', tracking: 'typeTracking', deviation: 'typeDeviation', fuel: 'typeFuel', unsafe: 'typeUnsafe', papers: 'typePapers', eway: 'typeEway', document: 'typeDocument', broadcast: 'typeBroadcast' };
const EVENT_COPY = { call_requested: 'eventCall', call_outcome: 'eventOutcome', message_template: 'eventMessage', handled: 'eventHandled', snoozed: 'eventSnooze', escalated: 'eventEscalate', driver_reply: 'eventReply', codriver_call_requested: 'eventCoDriver', voice_note_requested: 'eventVoiceNote', help_contact_requested: 'eventCall', office_message_requested: 'eventMessage', breakdown_help_requested: 'helpBreakdown' };
const CALL_OUTCOMES = ['reached', 'notReached', 'resolved', 'followUp'];
const HANDLED_REASONS = ['resolved', 'wrong', 'driverContext', 'other'];
const SNOOZE_CHOICES = ['15', 'hour', 'shift'];
const REPLY_REASONS = ['jam', 'loading', 'break', 'route', 'other'];

function StatusPill({ children, tone = 'blue' }) {
  const toneStyle = tone === 'red' ? styles.pillRed : tone === 'amber' ? styles.pillAmber : tone === 'green' ? styles.pillGreen : styles.pillBlue;
  return <View style={[styles.pill, toneStyle]}><AppText variant="caption" weight="semibold" color={tone === 'red' ? colors.error : tone === 'amber' ? colors.warning : tone === 'green' ? colors.success : colors.primaryDeep}>{children}</AppText></View>;
}
function Feedback({ children }) {
  if (!children) return null;
  return <Card style={styles.feedback}><Ionicons name="checkmark-circle-outline" size={18} color={colors.success} /><AppText variant="small" color={colors.success}>{children}</AppText></Card>;
}
function LocalEventFeed({ events, copy, filterId, driverId }) {
  const rows = events.filter((event) => (!filterId || event.payload?.actionId === filterId) && (!driverId || event.payload?.driverId === driverId)).slice().reverse();
  return <View style={styles.section}><AppText variant="h3">{copy('eventLogTitle')}</AppText>{rows.length ? rows.map((event) => <View key={event.id} style={styles.eventRow}><View style={styles.eventDot} /><View style={styles.grow}><AppText weight="semibold">{copy(EVENT_COPY[event.type] || 'eventOutcome')}</AppText><AppText variant="caption" muted>{event.payload?.label || event.payload?.reason || event.payload?.outcomeLabel || event.payload?.templateLabel || event.payload?.timeLabel || ''}</AppText></View><AppText variant="caption" muted>{new Date(event.at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</AppText></View>) : <AppText variant="small" muted>{copy('noEvents')}</AppText>}</View>;
}
function ActionEvidence({ action, copy }) {
  return <View style={styles.evidenceBlock}>
    <AppText variant="small" weight="semibold">{copy('evidenceTitle')}</AppText>
    <SchematicMap copy={copy} />
    <View style={styles.locationLine}><Ionicons name="location-outline" size={18} color={colors.primary} /><AppText style={styles.grow}>{copy(action.location)}</AppText></View>
    <AppText variant="caption" muted>{copy('mapNote')}</AppText>
    <AppText variant="caption" weight="semibold" color={colors.primaryDeep}>{copy('lastTwoHours')}</AppText>
    <View style={styles.evidenceTimeline}>
      {action.sources.slice(0, 2).map((source, index) => <View key={`${action.id}-timeline-${source}`} style={styles.evidenceTimelineRow}><View style={styles.evidenceTimelineRail}><View style={styles.evidenceTimelineDot} />{index === 0 ? <View style={styles.evidenceTimelineStem} /> : null}</View><View style={styles.grow}><AppText variant="caption" muted>{copy(index === 0 ? 'evidenceEarlier' : 'evidenceLatest')}{index === 1 ? ` · ${copy(action.when)}` : ''}</AppText><AppText variant="small">{copy(source)}</AppText></View></View>)}
    </View>
    {action.sources.map((key) => <View key={key} style={styles.sourceRow}><Ionicons name="checkmark-circle-outline" size={16} color={colors.success} /><AppText variant="small">{copy(key)}</AppText></View>)}
    <AppText variant="caption" muted>{copy(action.confidence)}</AppText>
    <View style={styles.priorityPanel}>
      <AppText variant="caption" weight="semibold">{copy('priorityFormula')}</AppText>
      <AppText variant="caption" muted>{copy('priorityInputs').replace('{severity}', String(action.score[0])).replace('{confidence}', String(action.score[1])).replace('{stake}', String(action.score[2])).replace('{urgency}', String(action.score[3])).replace('{score}', String(scoreOf(action)))}</AppText>
    </View>
  </View>;
}
function SchematicMap({ copy }) {
  return <View style={styles.mapSketch} accessibilityLabel={copy('mapSketchNote')}>
    <View style={styles.mapRoute} />
    <View style={[styles.mapMarker, styles.mapMarkerStart]}><View style={styles.mapMarkerDot} /></View>
    <View style={[styles.mapMarker, styles.mapMarkerEnd]}><View style={styles.mapMarkerDot} /></View>
    <AppText variant="caption" muted style={styles.mapCaption}>{copy('mapSketchNote')}</AppText>
  </View>;
}
function DriverSide({ action, copy }) {
  return <View style={styles.driverSide}><Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} /><View style={styles.grow}><AppText variant="caption" weight="semibold">{copy('driverSideLabel')}</AppText><AppText variant="small">{copy(action.driverSide)}</AppText>{action.driver === 'driverSunil' && action.driverSide === 'driverSideJam' ? <AppText variant="caption" muted>{copy('atWheelConfirmed')}</AppText> : null}{action.type === 'withoutDriver' ? <AppText variant="caption" color={colors.warning}>{copy('atWheelUnknown')}</AppText> : null}</View></View>;
}
function ManagerActionCard({ action, expanded, onToggle, onOpen, onSwipe, onIntent, copy, events }) {
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.3,
    onPanResponderRelease: (_event, gesture) => {
      if (gesture.dx < -64) onSwipe(action.id, 'handled');
      else if (gesture.dx > 64) onSwipe(action.id, 'snooze');
    },
  }), [action.id, onSwipe]);
  const handled = events.some((event) => event.type === 'handled' && event.payload?.actionId === action.id);
  const snoozed = events.find((event) => event.type === 'snoozed' && event.payload?.actionId === action.id);
  return <View {...pan.panHandlers}>
    <Card style={styles.actionCard}>
      <Pressable accessibilityRole="button" accessibilityLabel={copy(expanded ? 'collapse' : 'expand')} accessibilityState={{ expanded }} onPress={onToggle} style={styles.cardHeading}>
        <View style={styles.grow}>
          <View style={styles.headingMeta}><StatusPill tone={action.type === 'sos' ? 'red' : action.type === 'eta' || action.type === 'duty' ? 'amber' : 'blue'}>{copy(TYPE_COPY[action.type])}</StatusPill><AppText variant="caption" muted>{copy('previewOnly')}</AppText></View>
          <AppText variant="h3">{copy(action.title)}</AppText>
          <AppText variant="caption" mono>{copy(action.vehicle)}</AppText>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
      </Pressable>
      {expanded ? <View style={styles.cardContent}>
        <AppText>{copy(action.fact)}</AppText>
        <View style={styles.factsRow}><AppText variant="caption" weight="semibold">{copy('labelDriver')}:</AppText><AppText variant="caption">{copy(action.driver)}</AppText></View>
        <DriverSide action={action} copy={copy} />
        <ActionEvidence action={action} copy={copy} />
        {handled ? <StatusPill tone="green">{copy('handledLocal')}</StatusPill> : null}
        {snoozed ? <StatusPill tone="amber">{copy('snoozedLocal')}</StatusPill> : null}
        <View style={styles.actionButtons}>
          <ActionButton label={copy('call')} tone="secondary" onPress={() => onIntent(action, 'call')} style={styles.actionButton} />
          <ActionButton label={copy('message')} tone="secondary" onPress={() => onIntent(action, 'message')} style={styles.actionButton} />
          <ActionButton label={copy('openDetails')} onPress={() => onOpen(action)} style={styles.actionButton} />
        </View>
      </View> : <AppText variant="small" muted style={styles.collapsedFact}>{copy(action.fact)}</AppText>}
    </Card>
  </View>;
}

export function ManagerActionHome({ navigation }) {
  const copy = useManagerCopy();
  const { preview, setPreview, events, motion, setMotion } = useExperience();
  const [expanded, setExpanded] = useState(() => new Set(ACTION_FIXTURES.slice(0, 3).map((action) => action.id)));
  const toggle = (id) => setExpanded((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const openDetail = (action) => navigation.navigate('Manager action detail', { actionId: action.id });
  const onSwipe = (actionId, intent) => navigation.navigate('Manager action detail', { actionId, intent });
  const onIntent = (action, intent) => navigation.navigate('Manager action detail', { actionId: action.id, intent });
  return <ExperiencePage navigation={navigation} title={copy('titleHome')} subtitle={copy('homeSubtitle')}>
    {!preview ? <Card style={styles.disconnected}><Ionicons name="notifications-off-outline" size={26} color={colors.textMuted} /><AppText variant="h3">{copy('disconnectedTitle')}</AppText><AppText muted>{copy('disconnectedBody')}</AppText><ActionButton label={copy('enterPreview')} onPress={() => setPreview(true)} tone="secondary" /></Card> : <>
      <View style={styles.motionPicker}><AppText variant="caption" weight="semibold">{copy('motionForPreview')}</AppText><View style={styles.chips}>{['unknown', 'moving', 'stopped'].map((value) => <ActionButton key={value} tone="secondary" selected={motion === value} label={copy(`motionState${value[0].toUpperCase()}${value.slice(1)}`)} onPress={() => setMotion(value)} style={styles.chipButton} />)}</View></View>
      <View style={styles.stackHeading}><AppText variant="h3">{copy('previewStack')}</AppText><StatusPill>{copy('previewOnly')}</StatusPill></View>
      {ACTION_FIXTURES.map((action) => <ManagerActionCard key={action.id} action={action} expanded={expanded.has(action.id)} onToggle={() => toggle(action.id)} onOpen={openDetail} onSwipe={onSwipe} onIntent={onIntent} copy={copy} events={events} />)}
      {!ACTION_FIXTURES.length ? <Card><AppText muted>{copy('noPreviewActions')}</AppText></Card> : null}
      <LocalEventFeed events={events} copy={copy} />
    </>}
  </ExperiencePage>;
}

export function ActionDetail({ navigation, route }) {
  const copy = useManagerCopy();
  const { preview, motion, events, recordEvent } = useExperience();
  const isHelpful = route.params?.mode === 'driver-helpful';
  const action = ACTION_FIXTURES.find((item) => item.id === route.params?.actionId);
  const helpful = HELPFUL_CARDS.find((item) => item.id === route.params?.cardId);
  const [callSafety, setCallSafety] = useState(false);
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [outcome, setOutcome] = useState('');
  const [messageOpen, setMessageOpen] = useState(false);
  const [handledOpen, setHandledOpen] = useState(false);
  const [handledReason, setHandledReason] = useState('');
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [snoozeChoice, setSnoozeChoice] = useState('');
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const intentHandled = useRef('');
  const target = isHelpful ? helpful : action;
  const activityFilter = action?.id;
  const driverId = action?.driver === 'driverRavi' ? 'preview-driver-ravi' : action?.driver === 'driverSunil' ? 'preview-driver-sunil' : route.params?.driverId || 'preview-driver-sunil';
  const resetLocal = () => { setCallSafety(false); setOutcomeOpen(false); setOutcome(''); setMessageOpen(false); setHandledOpen(false); setHandledReason(''); setSnoozeOpen(false); setSnoozeChoice(''); setEscalateOpen(false); setFeedback(''); };
  useEffect(() => { if (!preview) { resetLocal(); intentHandled.current = ''; } }, [preview]);

  function startCall(recipient = 'driver') {
    if (!preview) return;
    if (motion !== 'stopped') setCallSafety(true);
    else finishCall(recipient);
  }
  function finishCall(recipient = 'driver') {
    if (!preview) return;
    recordEvent('call_requested', { actionId: action?.id, driverId, label: recipient === 'codriver' ? copy('callCoDriver') : copy('call') });
    setCallSafety(false); setOutcomeOpen(true); setOutcome('');
  }
  useEffect(() => {
    const intent = route.params?.intent;
    const token = `${route.params?.actionId || route.params?.cardId}:${intent}`;
    if (!preview || !intent || intentHandled.current === token) return;
    intentHandled.current = token;
    if (intent === 'call') startCall();
    if (intent === 'message') setMessageOpen(true);
    if (intent === 'handled') setHandledOpen(true);
    if (intent === 'snooze') setSnoozeOpen(true);
  }, [preview, route.params?.actionId, route.params?.cardId, route.params?.intent, motion]);

  const chooseOutcome = (value) => {
    if (!preview || !action) return;
    const key = { reached: 'outcomeReached', notReached: 'outcomeNotReached', resolved: 'outcomeResolved', followUp: 'outcomeFollowUp' }[value];
    recordEvent('call_outcome', { actionId: action.id, driverId, outcome: value, outcomeLabel: copy(key) });
    setOutcome(copy(key)); setOutcomeOpen(false);
  };
  const saveMessage = (templateKey) => {
    if (!preview) return;
    recordEvent('message_template', { actionId: action?.id, driverId, templateKey, templateLabel: copy(templateKey) });
    setMessageOpen(false); setFeedback(copy('messageSaved'));
  };
  const saveHandled = () => {
    if (!preview || !action || !handledReason) return;
    const reasonLabel = copy(({ resolved: 'reasonResolved', wrong: 'reasonWrong', driverContext: 'reasonDriverContext', other: 'reasonOther' })[handledReason]);
    recordEvent('handled', { actionId: action.id, driverId, reason: reasonLabel, label: reasonLabel });
    setHandledOpen(false); setFeedback(copy('handledLocal'));
  };
  const saveSnooze = () => {
    if (!preview || !action || !snoozeChoice) return;
    const label = copy(({ '15': 'snooze15', hour: 'snoozeHour', shift: 'snoozeShift' })[snoozeChoice]);
    recordEvent('snoozed', { actionId: action.id, driverId, until: snoozeChoice, label });
    setSnoozeOpen(false); setFeedback(copy('snoozedLocal'));
  };
  const confirmEscalation = () => {
    if (!preview || !action) return;
    recordEvent('escalated', { actionId: action.id, driverId, label: copy('escalatedLocal') });
    setEscalateOpen(false); setFeedback(copy('escalatedLocal'));
  };
  const saveReply = (reasonKey) => {
    if (!preview || !helpful) return;
    recordEvent('driver_reply', { actionId: helpful.id, driverId, reason: copy(reasonKey), label: copy(reasonKey) });
    setFeedback(copy('replySaved'));
  };
  const missCount = events.filter((event) => event.type === 'call_outcome' && event.payload?.actionId === activityFilter && event.payload?.outcome === 'notReached').length;

  return <ExperiencePage navigation={navigation} title={copy(isHelpful ? 'helpfulTitle' : 'detailTitle')} subtitle={copy('previewOnly')}>
    {!preview ? <Card><AppText variant="h3">{copy(isHelpful ? 'helpfulNotConnected' : 'detailNotConnected')}</AppText><AppText muted>{copy('actionUnavailable')}</AppText></Card> : !target ? <Card><AppText variant="h3">{copy('detailNotConnected')}</AppText></Card> : isHelpful ? <>
      <Card style={styles.actionCard}><StatusPill>{copy('previewOnly')}</StatusPill><AppText variant="h2">{copy(helpful.title)}</AppText><AppText>{copy(helpful.body)}</AppText><View style={styles.locationLine}><Ionicons name="information-circle-outline" size={18} color={colors.primary} /><AppText style={styles.grow}>{copy(helpful.evidence)}</AppText></View></Card>
      {helpful.aboutDriver ? <Card style={styles.section}><AppText variant="h3">{copy('addYourSide')}</AppText><AppText muted>{copy('replyPrompt')}</AppText><View style={styles.chips}>{REPLY_REASONS.map((reason) => <ActionButton key={reason} tone="secondary" label={copy(`reply${reason[0].toUpperCase()}${reason.slice(1)}`)} onPress={() => saveReply(`reply${reason[0].toUpperCase()}${reason.slice(1)}`)} style={styles.chipButton} />)}</View></Card> : null}
      <Feedback>{feedback}</Feedback>
      <LocalEventFeed events={events} copy={copy} filterId={helpful.id} driverId={driverId} />
    </> : <>
      <Card style={styles.actionCard}><View style={styles.headingMeta}><StatusPill tone={action.type === 'sos' ? 'red' : 'amber'}>{copy(TYPE_COPY[action.type])}</StatusPill><AppText variant="caption" muted>{copy('previewOnly')}</AppText></View><AppText variant="h2">{copy(action.title)}</AppText><AppText>{copy(action.fact)}</AppText><View style={styles.factsRow}><AppText variant="small" weight="semibold">{copy('labelVehicle')}:</AppText><AppText style={styles.grow}>{copy(action.vehicle)}</AppText></View><View style={styles.factsRow}><AppText variant="small" weight="semibold">{copy('labelDriver')}:</AppText><AppText style={styles.grow}>{copy(action.driver)}</AppText></View><DriverSide action={action} copy={copy} /></Card>
      <ActionEvidence action={action} copy={copy} />
      <View style={styles.actionButtons}>
        <ActionButton label={copy('call')} tone="secondary" onPress={() => startCall()} style={styles.actionButton} />
        <ActionButton label={copy('message')} tone="secondary" onPress={() => setMessageOpen(true)} style={styles.actionButton} />
        <ActionButton label={copy('handled')} tone="secondary" onPress={() => setHandledOpen((value) => !value)} style={styles.actionButton} />
        <ActionButton label={copy('snooze')} tone="secondary" onPress={() => setSnoozeOpen((value) => !value)} style={styles.actionButton} />
        <ActionButton label={copy('escalate')} onPress={() => setEscalateOpen((value) => !value)} style={styles.actionButton} />
      </View>
      {callSafety ? <Card style={styles.warningPanel}><Ionicons name="warning-outline" size={22} color={colors.warning} /><AppText variant="h3">{copy(motion === 'moving' ? 'motionMoving' : 'motionUnknown')}</AppText><AppText muted>{copy('callUnavailable')}</AppText><View style={styles.actionButtons}><ActionButton label={copy('cancel')} tone="secondary" onPress={() => setCallSafety(false)} style={styles.actionButton} /><ActionButton label={copy('confirmEmergencyCall')} onPress={() => finishCall()} style={styles.actionButton} /></View></Card> : null}
      {outcomeOpen ? <Card style={styles.section}><AppText variant="h3">{copy('outcomeTitle')}</AppText><View style={styles.chips}>{CALL_OUTCOMES.map((value) => <ActionButton key={value} tone="secondary" label={copy(`outcome${value[0].toUpperCase()}${value.slice(1)}`)} onPress={() => chooseOutcome(value)} style={styles.chipButton} />)}</View></Card> : null}
      {outcome ? <Card style={styles.outcome}><StatusPill tone="green">{outcome} · {copy('previewOnly')}</StatusPill><ActionButton label={copy('dismissOutcome')} tone="secondary" onPress={() => setOutcome('')} style={styles.actionButton} /></Card> : null}
      {missCount >= 2 ? <Card style={styles.warningPanel}><AppText variant="small">{copy('coDriverAfterMisses')}</AppText><View style={styles.actionButtons}><ActionButton label={copy('callCoDriver')} tone="secondary" onPress={() => { if (motion === 'stopped') finishCall('codriver'); else setCallSafety(true); }} style={styles.actionButton} /><ActionButton label={copy('voiceNote')} tone="secondary" onPress={() => { recordEvent('voice_note_requested', { actionId: action.id, driverId, label: copy('voiceNote') }); setFeedback(copy('actionUnavailable')); }} style={styles.actionButton} /></View></Card> : null}
      {messageOpen ? <Card style={styles.section}><AppText variant="h3">{copy('messageTemplates')}</AppText><View style={styles.chips}>{['messageJam', 'messageArrival', 'messageOffice'].map((key) => <ActionButton key={key} tone="secondary" label={copy(key)} onPress={() => saveMessage(key)} style={styles.chipButton} />)}</View><AppText variant="caption" muted>{copy('messageUnavailable')}</AppText></Card> : null}
      {handledOpen ? <Card style={styles.section}><AppText variant="h3">{copy('handledReasonTitle')}</AppText><View style={styles.chips}>{HANDLED_REASONS.map((reason) => <ActionButton key={reason} tone="secondary" selected={handledReason === reason} label={copy(({ resolved: 'reasonResolved', wrong: 'reasonWrong', driverContext: 'reasonDriverContext', other: 'reasonOther' })[reason])} onPress={() => setHandledReason(reason)} style={styles.chipButton} />)}</View><ActionButton label={copy('saveHandled')} disabled={!handledReason} onPress={saveHandled} /></Card> : null}
      {snoozeOpen ? <Card style={styles.section}><AppText variant="h3">{copy('snoozeTitle')}</AppText><View style={styles.chips}>{SNOOZE_CHOICES.map((choice) => <ActionButton key={choice} tone="secondary" selected={snoozeChoice === choice} label={copy(({ '15': 'snooze15', hour: 'snoozeHour', shift: 'snoozeShift' })[choice])} onPress={() => setSnoozeChoice(choice)} style={styles.chipButton} />)}</View><ActionButton label={copy('saveSnooze')} disabled={!snoozeChoice} onPress={saveSnooze} /></Card> : null}
      {escalateOpen ? <Card style={styles.warningPanel}><AppText variant="h3">{copy('escalateConfirmTitle')}</AppText><AppText muted>{copy('escalateConfirmBody')}</AppText><View style={styles.actionButtons}><ActionButton label={copy('cancel')} tone="secondary" onPress={() => setEscalateOpen(false)} style={styles.actionButton} /><ActionButton label={copy('confirmEscalate')} onPress={confirmEscalation} style={styles.actionButton} /></View></Card> : null}
      <Feedback>{feedback}</Feedback>
      <LocalEventFeed events={events} copy={copy} filterId={action.id} />
    </>}
  </ExperiencePage>;
}

const HELPFUL_CARDS = [
  { id: 'preview-help-plant', title: 'plantInfoTitle', body: 'plantInfoBody', evidence: 'sampleLocationPlant' },
  { id: 'preview-help-money', title: 'moneyTitle', body: 'moneyBody', evidence: 'previewOnly' },
  { id: 'preview-help-document', title: 'documentTitle', body: 'documentBody', evidence: 'sampleLocationPapers' },
  { id: 'preview-help-office', title: 'officeTitle', body: 'officeBody', evidence: 'previewOnly' },
  { id: 'preview-help-about-you', title: 'aboutYouTitle', body: 'aboutYouBody', evidence: 'evidenceTitle', aboutDriver: true },
];

export function DriverHelpfulCards({ navigation, driverId = 'preview-driver-sunil', driverName }) {
  const copy = useManagerCopy();
  const { preview, setPreview, motion, recordEvent, events } = useExperience();
  const [pendingCall, setPendingCall] = useState('');
  const [feedback, setFeedback] = useState('');
  useEffect(() => { if (!preview) { setPendingCall(''); setFeedback(''); } }, [preview]);
  const helpCall = (recipient) => {
    if (!preview) return;
    if (motion !== 'stopped') setPendingCall(recipient);
    else { recordEvent('help_contact_requested', { driverId, label: recipient === 'manager' ? copy('helpCallManager') : copy('helpCallOwner') }); setFeedback(copy('callUnavailable')); }
  };
  const confirmHelpCall = () => {
    if (!preview || !pendingCall) return;
    recordEvent('help_contact_requested', { driverId, label: pendingCall === 'manager' ? copy('helpCallManager') : copy('helpCallOwner') });
    setPendingCall(''); setFeedback(copy('callUnavailable'));
  };
  const requestHelp = (kind) => {
    if (!preview) return;
    recordEvent(kind === 'office' ? 'office_message_requested' : 'breakdown_help_requested', { driverId, label: copy(kind === 'office' ? 'helpMessageOffice' : 'helpBreakdown') });
    setFeedback(copy('helpPreviewOnly'));
  };
  return <View style={styles.helpfulRoot}>
    <View style={styles.section}><AppText variant="h2">{copy('helpfulTitle')}</AppText><AppText muted>{copy('helpfulSubtitle')}{driverName ? ` · ${driverName}` : ''}</AppText></View>
    {!preview ? <Card style={styles.disconnected}><AppText variant="h3">{copy('helpfulNotConnected')}</AppText><AppText muted>{copy('disconnectedBody')}</AppText><ActionButton label={copy('enterPreview')} tone="secondary" onPress={() => setPreview(true)} /></Card> : <>
      {HELPFUL_CARDS.map((item) => <Card key={item.id} onPress={() => navigation.navigate('Manager action detail', { mode: 'driver-helpful', cardId: item.id, driverId })} accessibilityRole="button" accessibilityLabel={copy('accessibilityOpenHelpful')} style={styles.helpCard}>
        <View style={styles.helpRow}><View style={styles.helpIcon}><Ionicons name={item.aboutDriver ? 'chatbubble-ellipses-outline' : item.id.includes('plant') ? 'business-outline' : item.id.includes('money') ? 'wallet-outline' : item.id.includes('document') ? 'document-text-outline' : 'chatbubble-outline'} size={20} color={colors.primary} /></View><View style={styles.grow}><AppText variant="h3">{copy(item.title)}</AppText><AppText variant="small">{copy(item.body)}</AppText>{item.aboutDriver ? <AppText variant="caption" color={colors.primaryDeep}>{copy('addYourSide')}</AppText> : null}</View><Ionicons name="chevron-forward" size={18} color={colors.textMuted} /></View>
      </Card>)}
      {!HELPFUL_CARDS.length ? <Card><AppText muted>{copy('helpfulNoCards')}</AppText></Card> : null}
      <Card style={styles.section}><AppText variant="h3">{copy('helpTitle')}</AppText><AppText variant="small" muted>{copy('helpPreviewOnly')}</AppText><View style={styles.actionButtons}><ActionButton label={copy('helpCallManager')} tone="secondary" onPress={() => helpCall('manager')} style={styles.actionButton} /><ActionButton label={copy('helpCallOwner')} tone="secondary" onPress={() => helpCall('owner')} style={styles.actionButton} /><ActionButton label={copy('helpMessageOffice')} tone="secondary" onPress={() => requestHelp('office')} style={styles.actionButton} /><ActionButton label={copy('helpBreakdown')} onPress={() => requestHelp('breakdown')} style={styles.actionButton} /></View>
        {pendingCall ? <View style={styles.warningPanel}><AppText weight="semibold">{copy(motion === 'moving' ? 'motionMoving' : 'motionUnknown')}</AppText><View style={styles.actionButtons}><ActionButton label={copy('cancel')} tone="secondary" onPress={() => setPendingCall('')} style={styles.actionButton} /><ActionButton label={copy('confirmEmergencyCall')} onPress={confirmHelpCall} style={styles.actionButton} /></View></View> : null}
        <Feedback>{feedback}</Feedback>
      </Card>
      <LocalEventFeed events={events} copy={copy} driverId={driverId} />
    </>}
  </View>;
}

const DRIVER_FIXTURES = [
  { id: 'preview-driver-sunil', name: 'driverSunil', vehicle: 'truckSos', status: 'statusDriving', hours: '4 h 10 m', rest: '35 m', score: '+4', actionId: 'preview-sos' },
  { id: 'preview-driver-ravi', name: 'driverRavi', vehicle: 'truckEta', status: 'statusPlant', hours: '3 h 05 m', rest: '50 m', score: '+1', actionId: 'preview-eta' },
  { id: 'preview-driver-ajay', name: 'driverAjay', vehicle: 'truckPlant', status: 'statusResting', hours: '2 h 40 m', rest: '1 h 15 m', score: '—', actionId: 'preview-plant' },
  { id: 'preview-driver-mohan', name: 'driverMohan', vehicle: 'truckPapers', status: 'statusOffDuty', hours: '—', rest: '—', score: '—', actionId: 'preview-papers' },
];
export function ManagerDriverList({ navigation }) {
  const copy = useManagerCopy();
  const { preview, motion, recordEvent, events } = useExperience();
  const [pending, setPending] = useState(null);
  const [outcomeDriver, setOutcomeDriver] = useState(null);
  const [outcome, setOutcome] = useState('');
  const [feedback, setFeedback] = useState('');
  useEffect(() => { if (!preview) { setPending(null); setOutcomeDriver(null); setOutcome(''); setFeedback(''); } }, [preview]);
  const startCall = (driver) => {
    if (!preview) return;
    if (motion !== 'stopped') setPending(driver);
    else { recordEvent('call_requested', { driverId: driver.id, label: copy('driverCall') }); setOutcomeDriver(driver); setOutcome(''); }
  };
  const continueCall = () => {
    if (!preview || !pending) return;
    recordEvent('call_requested', { driverId: pending.id, label: copy('driverCall') });
    setOutcomeDriver(pending); setOutcome(''); setPending(null);
  };
  const chooseOutcome = (value) => {
    if (!preview || !outcomeDriver) return;
    const label = copy(({ reached: 'outcomeReached', notReached: 'outcomeNotReached', resolved: 'outcomeResolved', followUp: 'outcomeFollowUp' })[value]);
    recordEvent('call_outcome', { driverId: outcomeDriver.id, outcome: value, outcomeLabel: label });
    setOutcome(label); setOutcomeDriver(null);
  };
  return <ExperiencePage navigation={navigation} title={copy('driversTitle')} subtitle={copy('driversSubtitle')}>
    {!preview ? <Card style={styles.disconnected}><Ionicons name="people-outline" size={26} color={colors.textMuted} /><AppText variant="h3">{copy('driverNotConnected')}</AppText><AppText muted>{copy('disconnectedBody')}</AppText><ActionButton label={copy('driverExistingRecords')} tone="secondary" onPress={() => navigation.navigate('Driver assignments')} /></Card> : <>
      <View style={styles.stackHeading}><AppText variant="h3">{copy('driverPreviewHeading')}</AppText><StatusPill>{copy('previewOnly')}</StatusPill></View>
      {DRIVER_FIXTURES.map((driver) => <Card key={driver.id} style={styles.driverCard}>
        <View style={styles.driverCardHead}><View style={styles.grow}><AppText variant="h3">{copy(driver.name)}</AppText><AppText variant="caption" mono>{copy(driver.vehicle)}</AppText></View><StatusPill tone={driver.status === 'statusDriving' ? 'blue' : driver.status === 'statusPlant' ? 'amber' : 'green'}>{copy(driver.status)}</StatusPill></View>
        <View style={styles.summaryGrid}><SummaryItem label={copy('driverHours')} value={driver.hours} /><SummaryItem label={copy('driverRest')} value={driver.rest} /><SummaryItem label={copy('driverScore')} value={driver.score} /></View>
        <View style={styles.actionButtons}><ActionButton label={copy('driverCall')} tone="secondary" onPress={() => startCall(driver)} style={styles.actionButton} /><ActionButton label={copy('driverTimeline')} onPress={() => navigation.navigate('Driver timeline', { driverId: driver.id, driverName: copy(driver.name) })} style={styles.actionButton} /></View>
      </Card>)}
      {pending ? <Card style={styles.warningPanel}><AppText variant="h3">{copy(motion === 'moving' ? 'motionMoving' : 'motionUnknown')}</AppText><AppText muted>{copy('callUnavailable')}</AppText><View style={styles.actionButtons}><ActionButton label={copy('cancel')} tone="secondary" onPress={() => setPending(null)} style={styles.actionButton} /><ActionButton label={copy('confirmEmergencyCall')} onPress={continueCall} style={styles.actionButton} /></View></Card> : null}
      {outcomeDriver ? <Card style={styles.section}><AppText variant="h3">{copy('driverCallOutcome')}</AppText><View style={styles.chips}>{CALL_OUTCOMES.map((value) => <ActionButton key={value} tone="secondary" label={copy(`outcome${value[0].toUpperCase()}${value.slice(1)}`)} onPress={() => chooseOutcome(value)} style={styles.chipButton} />)}</View></Card> : null}
      <Feedback>{outcome ? `${outcome} · ${copy('previewOnly')}` : feedback}</Feedback><LocalEventFeed events={events} copy={copy} />
    </>}
  </ExperiencePage>;
}

const LIVE_FIXTURES = [
  { id: 'live-sos', vehicle: 'truckSos', status: 'stopped', actionId: 'preview-sos', left: '16%', top: '18%' },
  { id: 'live-eta', vehicle: 'truckEta', status: 'moving', actionId: 'preview-eta', left: '62%', top: '16%' },
  { id: 'live-plant', vehicle: 'truckPlant', status: 'idling', actionId: 'preview-idle', left: '38%', top: '45%' },
  { id: 'live-tracking', vehicle: 'truckTracking', status: 'unknown', actionId: 'preview-tracking', left: '73%', top: '60%' },
  { id: 'live-papers', vehicle: 'truckPapers', status: 'offline', actionId: 'preview-papers', left: '18%', top: '69%' },
];
const LIVE_STATUS_COPY = { moving: 'statusMoving', stopped: 'statusStopped', idling: 'statusIdling', offline: 'statusOffline', unknown: 'statusUnknownFilter' };
function FilterPills({ values, selected, onSelect, copy, labelFor }) {
  return <View style={styles.filterBlock}><AppText variant="caption" weight="semibold">{copy(labelFor.title)}</AppText><View style={styles.chips}>{values.map((value) => <ActionButton key={value} tone="secondary" selected={selected === value} label={copy(labelFor[value] || TYPE_COPY[value] || value)} onPress={() => onSelect(value)} style={styles.chipButton} />)}</View></View>;
}
export function ManagerLiveSurface({ navigation }) {
  const copy = useManagerCopy();
  const { preview } = useExperience();
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  useEffect(() => { if (!preview) { setStatusFilter('all'); setActionFilter('all'); setSelectedId(null); } }, [preview]);
  const rows = LIVE_FIXTURES.filter((row) => (statusFilter === 'all' || row.status === statusFilter) && (actionFilter === 'all' || ACTION_FIXTURES.find((action) => action.id === row.actionId)?.type === actionFilter));
  const selected = rows.find((row) => row.id === selectedId) || rows[0];
  const selectedAction = ACTION_FIXTURES.find((action) => action.id === selected?.actionId);
  const openAction = (intent) => selectedAction && navigation.navigate('Manager action detail', { actionId: selectedAction.id, intent });
  return <ExperiencePage navigation={navigation} title={copy('liveTitle')} subtitle={copy('liveSubtitle')}>
    {!preview ? <Card style={styles.disconnected}><Ionicons name="map-outline" size={26} color={colors.textMuted} /><AppText variant="h3">{copy('liveNotConnected')}</AppText><AppText muted>{copy('disconnectedBody')}</AppText><ActionButton label={copy('liveExistingRecords')} tone="secondary" onPress={() => navigation.navigate('Fleet map')} /></Card> : <>
      <View style={styles.stackHeading}><AppText variant="h3">{copy('mapSketchTitle')}</AppText><StatusPill>{copy('previewOnly')}</StatusPill></View>
      <View style={styles.liveMap}>
        <View style={styles.mapGridRow} /><View style={styles.mapGridColumn} />
        {rows.map((row) => <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={`${copy(row.vehicle)} · ${copy(LIVE_STATUS_COPY[row.status])}`} accessibilityState={{ selected: selected?.id === row.id }} onPress={() => setSelectedId(row.id)} style={[styles.liveMarker, { left: row.left, top: row.top }, selected?.id === row.id && styles.liveMarkerSelected]}><Ionicons name="bus-outline" size={18} color={selected?.id === row.id ? colors.white : colors.primary} /></Pressable>)}
        <AppText variant="caption" muted style={styles.mapCaption}>{copy('mapSketchBody')}</AppText>
      </View>
      <FilterPills values={['all', 'moving', 'stopped', 'idling', 'offline', 'unknown']} selected={statusFilter} onSelect={setStatusFilter} copy={copy} labelFor={{ title: 'liveFilterStatus', all: 'statusAll', ...LIVE_STATUS_COPY }} />
      <FilterPills values={['all', ...new Set(ACTION_FIXTURES.map((action) => action.type))]} selected={actionFilter} onSelect={setActionFilter} copy={copy} labelFor={{ title: 'liveFilterCard', all: 'statusAll' }} />
      {selected && selectedAction ? <Card style={styles.actionCard}><View style={styles.headingMeta}><StatusPill>{copy(LIVE_STATUS_COPY[selected.status])}</StatusPill><StatusPill>{copy(TYPE_COPY[selectedAction.type])}</StatusPill></View><AppText variant="caption" color={colors.primaryDeep}>{copy('selectedVehicle')}</AppText><AppText variant="h3">{copy(selected.vehicle)}</AppText><AppText>{copy(selectedAction.fact)}</AppText><AppText variant="caption" muted>{copy('mapSketchBody')}</AppText><View style={styles.actionButtons}><ActionButton label={copy('viewCard')} tone="secondary" onPress={() => openAction()} style={styles.actionButton} /><ActionButton label={copy('call')} onPress={() => openAction('call')} style={styles.actionButton} /></View></Card> : <Card><AppText muted>{copy('noLiveMatches')}</AppText></Card>}
    </>}
  </ExperiencePage>;
}

const TIMELINE_FIXTURE = [
  { id: 'time-trip', time: '09:40', text: 'timelineTrip', uncertain: false },
  { id: 'time-fuel', time: '10:55', text: 'timelineFuel', uncertain: false },
  { id: 'time-jam', time: '11:20', text: 'timelineJam', uncertain: false },
  { id: 'time-uncertain', time: '11:35', text: 'timelineUncertain', uncertain: true },
  { id: 'time-handover', time: '12:05', text: 'timelineHandover', uncertain: false },
  { id: 'time-card', time: '12:40', text: 'timelineAction', uncertain: false },
  { id: 'time-office', time: '13:05', text: 'timelineMessage', uncertain: false },
  { id: 'time-paper', time: '13:20', text: 'timelinePaper', uncertain: false },
];
export function DriverTimeline({ navigation, route }) {
  const copy = useManagerCopy();
  const { preview, events, papers } = useExperience();
  const driverId = route.params?.driverId || 'preview-driver-sunil';
  const name = route.params?.driverName || copy('driverSunil');
  const driverSample = DRIVER_FIXTURES.find((driver) => driver.id === driverId) || DRIVER_FIXTURES[0];
  const driverEvents = events.filter((event) => event.payload?.driverId === driverId);
  return <ExperiencePage navigation={navigation} title={copy('timelineTitle')} subtitle={copy('timelineSubtitle')}>
    {!preview ? <Card><AppText variant="h3">{copy('timelineNotConnected')}</AppText><AppText muted>{copy('disconnectedBody')}</AppText></Card> : <>
      <Card style={styles.actionCard}><View style={styles.headingMeta}><StatusPill>{copy('previewOnly')}</StatusPill><AppText variant="h2">{name}</AppText></View><AppText variant="caption" mono>{copy(driverSample.vehicle)}</AppText><View style={styles.summaryGrid}><SummaryItem label={copy('driving')} value={driverSample.hours} /><SummaryItem label={copy('rest')} value={driverSample.rest} /></View><AppText variant="caption" color={colors.warning}>{copy('timelineUncertain')}</AppText></Card>
      <View style={styles.section}><AppText variant="h3">{copy('exampleTimeline')}</AppText>{TIMELINE_FIXTURE.map((item) => <TimelineRow key={item.id} time={item.time} label={copy(item.text)} uncertain={item.uncertain} copy={copy} />)}{driverEvents.map((event) => <TimelineRow key={event.id} time={new Date(event.at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} label={`${copy(EVENT_COPY[event.type] || 'eventOutcome')}${event.payload?.label ? ` · ${event.payload.label}` : ''}`} copy={copy} />)}</View>
      <Card style={styles.actionCard}><AppText variant="h3">{copy('weeklySummary')}</AppText><View style={styles.summaryGrid}><SummaryItem label={copy('onTime')} value="9 / 10" /><SummaryItem label={copy('scoreTrend')} value="+4" /></View><View style={styles.summaryGrid}><SummaryItem label={copy('papersAccepted')} value={papers.length ? String(papers.filter((paper) => paper.status === 'accepted').length) : '7'} /><SummaryItem label={copy('papersRejected')} value="1" /></View><AppText variant="caption" muted>{copy('timelineSummaryNote')}</AppText></Card>
      <LocalEventFeed events={events} copy={copy} driverId={driverId} />
    </>}
  </ExperiencePage>;
}
function SummaryItem({ label, value }) { return <View style={styles.summaryItem}><AppText variant="caption" muted>{label}</AppText><AppText variant="h3" mono>{value}</AppText></View>; }
function TimelineRow({ time, label, uncertain, copy }) { return <View style={styles.timelineRow}><View style={styles.timelineTime}><AppText variant="caption" mono muted>{time}</AppText><View style={[styles.timelineDot, uncertain && styles.timelineDotUnknown]} /></View><View style={[styles.timelineContent, uncertain && styles.timelineUnknown]}><AppText variant="small">{label}</AppText>{uncertain ? <AppText variant="caption" color={colors.warning}>{copy('uncertainInterval')}</AppText> : null}</View></View>; }

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 }, helpfulRoot: { gap: 14 },
  disconnected: { gap: 12, alignItems: 'flex-start' }, stackHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  actionCard: { gap: 14 }, cardHeading: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 }, cardContent: { gap: 14, paddingTop: 8 },
  headingMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, pill: { minHeight: 28, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, justifyContent: 'center' }, pillBlue: { backgroundColor: colors.infoBg }, pillRed: { backgroundColor: colors.expiredBg }, pillAmber: { backgroundColor: colors.pendingBg }, pillGreen: { backgroundColor: colors.validBg },
  cardContentHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, collapsedFact: { paddingTop: 8 }, factsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' }, driverSide: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, backgroundColor: colors.blueTint, borderRadius: radius.md }, evidenceBlock: { gap: 10, padding: 14, backgroundColor: colors.background, borderRadius: radius.md }, locationLine: { flexDirection: 'row', alignItems: 'center', gap: 8 }, sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, priorityPanel: { gap: 5, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },
  actionButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, actionButton: { flexGrow: 1, flexBasis: 130 }, warningPanel: { gap: 12, padding: 14, backgroundColor: colors.pendingBg, borderRadius: radius.md }, section: { gap: 12 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chipButton: { flexGrow: 0, flexBasis: 'auto' }, feedback: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.validBg }, outcome: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }, motionPicker: { gap: 8, padding: 12, backgroundColor: colors.blueTint, borderRadius: radius.md },
  eventRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 8 }, eventDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  mapSketch: { minHeight: 118, borderRadius: radius.md, backgroundColor: colors.infoBg, overflow: 'hidden', justifyContent: 'center', padding: 12 }, mapRoute: { height: 3, width: '65%', alignSelf: 'center', backgroundColor: colors.primary, transform: [{ rotate: '-12deg' }] }, mapMarker: { position: 'absolute', width: 32, height: 32, borderRadius: radius.full, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, mapMarkerStart: { left: '16%', top: '32%' }, mapMarkerEnd: { right: '16%', top: '52%' }, mapMarkerDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary }, mapCaption: { position: 'absolute', left: 10, right: 10, bottom: 7 },
  helpCard: { minHeight: 80 }, helpRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, helpIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center' },
  driverCard: { gap: 14 }, driverCardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, filterBlock: { gap: 8 }, liveMap: { height: 280, borderRadius: radius.lg, backgroundColor: colors.infoBg, overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: colors.border }, mapGridRow: { position: 'absolute', left: 0, right: 0, top: '50%', height: 1, backgroundColor: colors.border }, mapGridColumn: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, backgroundColor: colors.border }, liveMarker: { position: 'absolute', width: 48, height: 48, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, liveMarkerSelected: { backgroundColor: colors.primaryDeep, borderColor: colors.white },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, summaryItem: { flex: 1, minWidth: 120, padding: 12, gap: 5, borderRadius: radius.md, backgroundColor: colors.background }, timelineRow: { flexDirection: 'row', gap: 12, minHeight: 52 }, timelineTime: { width: 56, alignItems: 'center', gap: 5 }, timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }, timelineDotUnknown: { backgroundColor: colors.warning }, timelineContent: { flex: 1, minHeight: 44, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 4 }, timelineUnknown: { padding: 10, borderRadius: radius.sm, backgroundColor: colors.pendingBg },
});
