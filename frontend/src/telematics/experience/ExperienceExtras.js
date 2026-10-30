import React, { useEffect, useState } from 'react';
import { View, Image, Linking, Platform, Pressable, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as ImagePicker from 'expo-image-picker';
import { AppText, Card, TextField, colors } from '../../components/ui';
import { useLanguage } from '../../context/LanguageContext';
import { useExperience } from './ExperienceContext';
import { useTelematicsApi } from '../context/TelematicsApiContext';
import { fingerprintPickedAsset } from './captureFingerprint';
import { VoiceAttachment } from './ReportExperience';
import { ExperiencePage, ActionButton, ChoiceRow, useExperienceCopy } from './ExperienceUI';

function Panel({ title, children }) { return <Card style={{ gap: 12 }}><AppText variant="h3">{title}</AppText>{children}</Card>; }
function Row({ title, detail, onPress, icon = 'chevron-forward' }) { return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={{ minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}><View style={{ flex: 1 }}><AppText weight="semibold">{title}</AppText>{detail ? <AppText variant="small" muted>{detail}</AppText> : null}</View><Ionicons name={icon} size={23} color={colors.primary} /></Pressable>; }
function Toggle({ label, value, onValueChange }) { return <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 15, minHeight: 56 }}><AppText style={{ flex: 1 }}>{label}</AppText><Switch accessibilityLabel={label} value={value} onValueChange={onValueChange} trackColor={{ true: colors.primary }} /></View>; }
export function ExperienceSettings({ navigation }) {
  const c = useExperienceCopy(); const { language, setLanguage } = useLanguage(); const { settings, setSettings } = useExperience(); const [error, setError] = useState('');
  useEffect(() => () => { Speech.stop(); }, []);
  const choices = keys => keys.map(key => ({ value: key, label: c(key) }));
  const test = async () => { try { const voices = await Speech.getAvailableVoicesAsync(); const code = language === 'bn' ? 'bn' : language === 'hi' ? 'hi' : 'en'; const matching = voices.filter(v => v.language?.startsWith(code)); const speaker = matching.find(v => v.name?.toLowerCase().includes(settings.voiceGender)) || matching[0]; if (!speaker) { setError(c('voiceUnavailable')); return; } Speech.stop(); Speech.speak(c('testPhrase'), { language: code, voice: speaker.identifier, rate: settings.voiceSpeed, volume: settings.volume === 'quiet' ? 0.35 : settings.volume === 'loud' ? 1 : 0.7, onError: () => setError(c('voiceUnavailable')) }); } catch { setError(c('voiceUnavailable')); } };
  return <ExperiencePage title={c('settings')} navigation={navigation}><AppText muted>{c('localSettings')}</AppText><Panel title={c('language')}><ChoiceRow label={c('language')} value={language || 'en'} onValueChange={setLanguage} options={[{ value: 'en', label: 'English' }, { value: 'hi', label: 'हिन्दी' }, { value: 'bn', label: 'বাংলা' }]} /></Panel><Panel title={c('voice')}><Toggle label={c('voice')} value={settings.voice} onValueChange={voice => setSettings({ voice })} /><ChoiceRow label={c('speaker')} value={settings.voiceGender} onValueChange={voiceGender => setSettings({ voiceGender })} options={choices(['male', 'female'])} /><ChoiceRow label={c('speed')} value={settings.voiceSpeed} onValueChange={voiceSpeed => setSettings({ voiceSpeed })} options={[0.8, 1, 1.2].map(value => ({ value, label: `${value}×` }))} /><ChoiceRow label={c('volume')} value={settings.volume} onValueChange={volume => setSettings({ volume })} options={choices(['normal', 'loud', 'quiet'])} /><ActionButton label={c('testVoice')} onPress={test} disabled={!settings.voice} />{error ? <AppText color={colors.error}>{error}</AppText> : null}</Panel><Panel title={c('appearance')}><ChoiceRow label={c('appearance')} value={settings.theme} onValueChange={theme => setSettings({ theme })} options={choices(['day', 'night', 'auto'])} />{settings.theme === 'auto' && <AppText variant="small" muted>{c('autoNote')}</AppText>}<ChoiceRow label={c('orientation')} value={settings.orientation} onValueChange={orientation => setSettings({ orientation })} options={choices(['auto', 'north', 'heading'])} /><Toggle label={c('simple')} value={settings.simpleMode} onValueChange={simpleMode => setSettings({ simpleMode })} /><Toggle label={c('dataSaver')} value={settings.dataSaver} onValueChange={dataSaver => setSettings({ dataSaver })} /><Toggle label={c('prompts')} value={settings.prompts} onValueChange={prompts => setSettings({ prompts })} /></Panel><Panel title={c('settings')}>{[['offlineMaps', 'Offline maps'], ['battery', 'Battery help'], ['privacy', 'Privacy & consent'], ['introduction', 'Experience introduction'], ['previewActivity', 'Preview activity']].map(([key, route]) => <Row key={key} title={c(key)} onPress={() => navigation.navigate(route)} />)}</Panel></ExperiencePage>;
}
export function OfflineMaps({ navigation }) {
  const c = useExperienceCopy(); const { preview, settings, setSettings, recordEvent } = useExperience(); const [ready, setReady] = useState(false); const [progress, setProgress] = useState(0);
  useEffect(() => { setReady(false); setProgress(0); }, [preview]);
  useEffect(() => { if (!progress || progress >= 100) return undefined; const timer = setTimeout(() => setProgress(p => Math.min(100, p + 20)), 250); return () => clearTimeout(timer); }, [progress]);
  useEffect(() => { if (progress === 100) setReady(true); }, [progress]);
  return <ExperiencePage title={c('offlineMaps')} navigation={navigation}><Panel title={c('offlineMaps')}><AppText muted>{c('noMaps')}</AppText><Toggle label={c('wifi')} value={settings.wifiOnly !== false} onValueChange={wifiOnly => setSettings({ wifiOnly })} />{preview && <><AppText weight="bold">{c('sampleCorridor')}</AppText><AppText>{c('size')}</AppText>{progress > 0 && !ready && <AppText accessibilityLiveRegion="polite">{progress}%</AppText>}<ActionButton disabled={progress > 0 && !ready} label={c(ready ? 'remove' : 'download')} onPress={() => { recordEvent(ready ? 'PACK_REMOVED' : 'PACK_PREVIEW_STARTED'); setReady(false); setProgress(ready ? 0 : 20); }} />{ready && <AppText color={colors.success}>{c('ready')}</AppText>}</>}</Panel></ExperiencePage>;
}
export function BatteryHelp({ navigation }) { const c = useExperienceCopy(); const [error, setError] = useState(''); return <ExperiencePage title={c('battery')} navigation={navigation}><Panel title={c('battery')}><AppText>{c('batterySteps')}</AppText><ActionButton label={c('openSettings')} tone="secondary" onPress={async () => { try { if (Platform.OS === 'web') throw Error(); await Linking.openSettings(); } catch { setError(c('settingsOpenFailed')); } }} />{error ? <AppText color={colors.error}>{error}</AppText> : null}</Panel></ExperiencePage>; }
export function PrivacyConsent({ navigation }) {
  const c = useExperienceCopy();
  const service = useTelematicsApi();
  const { preview, consent, setConsent, recordEvent } = useExperience();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    let active = true;
    service.consent()
      .then((res) => {
        const granted = res?.data?.granted ?? res?.granted ?? false;
        if (active) setConsent(granted);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [service]);

  const toggle = async () => {
    if (!preview || loading) return;
    setApiError('');
    setLoading(true);
    try {
      if (consent) {
        await service.withdrawConsent();
        setConsent(false);
        recordEvent('CONSENT_WITHDRAWN');
      } else {
        await service.grantConsent({ purpose: 'location_tracking', version: '1.0' });
        setConsent(true);
        recordEvent('CONSENT_GRANTED');
      }
    } catch (err) {
      setApiError(err?.response?.data?.message || 'Could not update consent. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ExperiencePage title={c('privacy')} navigation={navigation}>
      <Panel title={c('privacy')}>
        <AppText>{c('privacyBody')}</AppText>
        {consent && <AppText color={colors.success}>{c('accepted')}</AppText>}
        {apiError ? <AppText color={colors.error}>{apiError}</AppText> : null}
        <ActionButton disabled={!preview || loading} label={loading ? 'Updating…' : c(consent ? 'withdraw' : 'accept')} onPress={toggle} />
      </Panel>
    </ExperiencePage>
  );
}
export function DriverHelp({ navigation }) { const c = useExperienceCopy(); const [message, setMessage] = useState(''); return <ExperiencePage title={c('help')} navigation={navigation}><AppText>{c('helpBody')}</AppText><Panel title={c('help')}>{['callManager', 'callOwner', 'messageOffice', 'breakdown'].map(key => <Row key={key} title={c(key)} onPress={() => key === 'messageOffice' ? navigation.navigate('Conversation preview') : setMessage(c(key === 'breakdown' ? 'nearbyUnavailable' : 'noContact'))} icon={key === 'breakdown' ? 'construct-outline' : key === 'messageOffice' ? 'chatbubble-outline' : 'call-outline'} />)}{message ? <AppText accessibilityLiveRegion="polite" color={colors.warning}>{message}</AppText> : null}</Panel><Panel title={c('guide')}><AppText>{c('guideBody')}</AppText><Row title={c('battery')} onPress={() => navigation.navigate('Battery help')} /><Row title={c('privacy')} onPress={() => navigation.navigate('Privacy & consent')} /></Panel></ExperiencePage>; }
export function ExperienceIntroduction({ navigation }) {
  const c = useExperienceCopy(); const { language, setLanguage } = useLanguage(); const [step, setStep] = useState(0); const steps = ['language', 'welcome', 'locationStep', 'privacy', 'battery', 'offlineMaps'];
  return <ExperiencePage title={c('introduction')} navigation={navigation}><AppText mono>{step + 1} / {steps.length}</AppText><Panel title={c(steps[step])}>{step === 0 ? <ChoiceRow label={c('language')} value={language || 'en'} onValueChange={setLanguage} options={[{ value: 'en', label: 'English' }, { value: 'hi', label: 'हिन्दी' }, { value: 'bn', label: 'বাংলা' }]} /> : step === 1 ? <>{['routesValue', 'plantsValue', 'papersValue'].map((key, i) => <View key={key} style={{ flexDirection: 'row', gap: 16, alignItems: 'center', paddingVertical: 12 }}><Ionicons name={['navigate-circle-outline', 'business-outline', 'camera-outline'][i]} size={36} color={colors.primary} /><AppText style={{ flex: 1 }}>{c(key)}</AppText></View>)}</> : <AppText>{c({ 2: 'locationBody', 3: 'privacyBody', 4: 'batterySteps', 5: 'noMaps' }[step])}</AppText>}</Panel><ActionButton label={c(step === steps.length - 1 ? 'finish' : 'next')} onPress={() => step === steps.length - 1 ? navigation.goBack() : setStep(step + 1)} />{step > 0 && <ActionButton label={c('previous')} tone="secondary" onPress={() => setStep(step - 1)} />}</ExperiencePage>;
}
const samplePapers = [{ id: 'preview-lr', type: 'lr', status: 'approved', amount: null }, { id: 'preview-fuel', type: 'fuel', status: 'rejected', amount: null }, { id: 'preview-pod', type: 'pod', status: 'paid', amount: 2300 }];
export function PaperList({ navigation, review = false }) {
  const c = useExperienceCopy(); const { preview, papers, setPapers, recordEvent } = useExperience(); const [filter, setFilter] = useState('all'); const [kind, setKind] = useState('all'); const [vehicle, setVehicle] = useState(''); const [driver, setDriver] = useState('');
  const rows = preview ? [...samplePapers.filter(sample => !papers.some(p => p.id === sample.id)), ...papers] : [];
  return <ExperiencePage title={c(review ? 'reviewPapers' : 'money')} navigation={navigation}><AppText muted>{c('moneyNote')}</AppText><ChoiceRow label={c('statusFilter')} value={filter} onValueChange={setFilter} options={['all', 'received', 'read', 'approved', 'rejected', 'paid', 'queued'].map(key => ({ value: key, label: c(key) }))} />{review && <Panel title={c('reviewPapers')}><ChoiceRow label={c('typeFilter')} value={kind} onValueChange={setKind} options={['all', 'fuel', 'lr', 'pod', 'other'].map(value => ({ value, label: c(value) }))} /><TextField label={c('vehicle')} accessibilityLabel={c('vehicle')} value={vehicle} onChangeText={setVehicle} /><TextField label={c('driver')} accessibilityLabel={c('driver')} value={driver} onChangeText={setDriver} /></Panel>}{!rows.length && <Panel title={c('noPapers')}><AppText muted>{c('disconnectedBody')}</AppText></Panel>}{rows.filter(p => (filter === 'all' || p.status === filter) && (kind === 'all' || p.type === kind) && (!vehicle.trim() || (p.vehicle || 'WB 01 AB 2048').toLowerCase().includes(vehicle.trim().toLowerCase())) && (!driver.trim() || (p.driver || c('sample')).toLowerCase().includes(driver.trim().toLowerCase()))).map(p => <Card key={p.id} onPress={() => navigation.navigate(review ? 'Paper review detail' : 'Paper detail', { paperId: p.id })} accessibilityLabel={`${c(p.type)} · ${c(p.status)}`} style={{ gap: 8 }}><View style={{ flexDirection: 'row', gap: 12 }}><Ionicons name="document-text-outline" size={38} color={colors.primary} /><View style={{ flex: 1 }}><AppText variant="h3">{c(p.type)} · {c('sample')}</AppText><AppText color={p.status === 'rejected' ? colors.error : colors.textMuted}>{c(p.status)}</AppText><AppText variant="small" muted>{c('vehicle')}: {p.vehicle || 'WB 01 AB 2048'} · {c('driver')}: {p.driver || c('sample')}</AppText><AppText>{c('amount')}: {p.amount == null ? c('unknown') : `₹${p.amount.toLocaleString('en-IN')}`}</AppText></View></View>{p.status === 'rejected' && <AppText color={colors.error}>{c('rejectReason')}</AppText>}</Card>)}<ActionButton disabled={!preview} label={c('capture')} onPress={() => navigation.navigate('Universal capture')} /><ActionButton disabled={!preview} label={c('addSample')} tone="secondary" onPress={() => { const id = `preview-${Date.now()}`; setPapers(current => [...current, { id, type: 'other', status: 'received', amount: null }]); recordEvent('PAPER_SAMPLE_ADDED', { id }); }} /><Panel title={c('advances')}><AppText muted>{c('noAdvances')}</AppText></Panel></ExperiencePage>;
}
export function DriverPapersReview(props) { return <PaperList {...props} review />; }
export function PaperDetail({ navigation, route, review = false }) {
  const c = useExperienceCopy(); const { preview, papers, setPapers, recordEvent } = useExperience(); const id = route.params?.paperId; const paper = preview ? papers.find(p => p.id === id) || samplePapers.find(p => p.id === id) : null; const [amount, setAmount] = useState(''); const [reason, setReason] = useState(''); const [editing, setEditing] = useState(false); const [error, setError] = useState('');
  if (!paper) return <ExperiencePage title={c('paper')} navigation={navigation}><AppText>{c('noPapers')}</AppText></ExperiencePage>;
  const update = patch => { setPapers(current => [...current.filter(p => p.id !== id), { ...paper, ...patch }]); recordEvent('PAPER_PREVIEW_UPDATED', { paperId: id, ...patch }); };
  return <ExperiencePage title={c(review ? 'reviewPapers' : 'paper')} navigation={navigation}><Panel title={`${c(paper.type)} · ${c('sample')}`}><AppText weight="bold">{c(paper.status)}</AppText>{paper.pages?.map((page, i) => <Image key={page.id} accessibilityLabel={`${c('page')} ${i + 1}`} source={{ uri: page.uri }} style={{ width: '100%', height: 280, resizeMode: 'contain', backgroundColor: colors.background }} />)}{!paper.pages?.length && <View style={{ minHeight: 140, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}><Ionicons name="document-text-outline" size={54} color={colors.primary} /><AppText muted>{c('sample')}</AppText></View>}<AppText>{c('amount')}: {paper.amount == null ? c('unknown') : `₹${paper.amount.toLocaleString('en-IN')}`}</AppText><AppText muted>{c('noPayment')}</AppText>{paper.status === 'rejected' && <><AppText color={colors.error}>{paper.reason || c('rejectReason')}</AppText><ActionButton label={c('retake')} onPress={() => navigation.navigate('Universal capture', { hint: paper.type, replaces: paper.id })} /></>}</Panel>{review && <Panel title={c('lowConfidence')}><AppText>{c('crossChecks')}</AppText><AppText>{c('links')}: {c('unlinked')}</AppText><ActionButton tone="secondary" label={c('edit')} onPress={() => setEditing(!editing)} />{editing && <><TextField label={c('field')} accessibilityLabel={c('field')} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} /><ActionButton label={c('saveEdit')} onPress={() => { if (!/^\d+(\.\d{1,2})?$/.test(amount)) { setError(c('lowConfidence')); return; } update({ amount: Number(amount), status: 'read' }); setEditing(false); setError(''); }} /></>}<ActionButton label={c('approve')} onPress={() => update({ status: 'approved' })} /><TextField label={c('reason')} accessibilityLabel={c('reason')} value={reason} onChangeText={setReason} /><ActionButton disabled={!reason.trim()} label={c('reject')} tone="secondary" onPress={() => update({ status: 'rejected', reason: reason.trim() })} />{error ? <AppText color={colors.error}>{error}</AppText> : null}</Panel>}</ExperiencePage>;
}
export function PaperReviewDetail(props) { return <PaperDetail {...props} review />; }
export function UniversalCapture({ navigation, route }) {
  const c = useExperienceCopy();
  const service = useTelematicsApi();
  const { preview, motion, draftPages, setDraftPages, setPapers, recordEvent } = useExperience();
  const [type, setType] = useState(route.params?.hint || 'other');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);
  const locked = !preview || motion !== 'stopped';

  const pick = async (camera) => {
    if (locked || busy) return;
    setError('');
    setBusy(true);
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) { setError(c('cameraDenied')); return; }
      }
      const result = await (camera
        ? ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
        : ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 1, selectionLimit: 10 }));
      if (!result.canceled) {
        const pages = await Promise.all(result.assets.map(async (asset, index) => ({
          id: `${Date.now()}-${index}`,
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          originalName: asset.fileName || null,
          fingerprint: await fingerprintPickedAsset(asset),
        })));
        setChecked(false);
        setDraftPages((current) =>
          [...current, ...pages.filter((page) => !current.some((old) => old.fingerprint === page.fingerprint))].slice(0, 10)
        );
        recordEvent('PAPER_PAGES_SELECTED', { count: result.assets.length });
      }
    } catch {
      setError(c('captureError'));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (locked || !draftPages.length || !checked || busy) return;
    setBusy(true);
    setError('');
    const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    try {
      const formData = new FormData();
      formData.append('clientId', clientId);
      formData.append('context', JSON.stringify({ docType: type, hint: route.params?.hint || null }));
      for (const page of draftPages) {
        formData.append('pages', { uri: page.uri, name: page.originalName || `page-${clientId}.jpg`, type: 'image/jpeg' });
      }
      const result = await service.captureCreate(formData);
      const id = result?.id || result?._id || clientId;
      setPapers((current) => [
        ...current,
        { id, type: result?.docType || type, status: result?.status || 'queued', amount: null, pages: draftPages, replaces: route.params?.replaces || null, at: new Date().toISOString(), _real: true },
      ]);
      recordEvent('CAPTURE_SUBMITTED', { id, pageCount: draftPages.length, docType: result?.docType });
      setDraftPages([]);
      navigation.replace('Paper detail', { paperId: id });
    } catch (err) {
      if (err?.response?.status === 403 || err?.response?.status === 404 || !err?.response) {
        const id = `preview-${clientId}`;
        setPapers((current) => [
          ...current,
          { id, type, status: 'queued', amount: null, pages: draftPages, replaces: route.params?.replaces || null, at: new Date().toISOString() },
        ]);
        recordEvent('CAPTURE_PREVIEW_QUEUED', { id, pageCount: draftPages.length });
        setDraftPages([]);
        navigation.replace('Paper detail', { paperId: id });
      } else {
        setError(c('captureError'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <ExperiencePage title={c('capture')} navigation={navigation}>
      <Panel title={c('quality')}>
        <AppText>{c('qualityBody')}</AppText>
        <AppText variant="small" muted>{c('duplicateNote')}</AppText>
        {locked && <AppText color={colors.warning}>{c('unavailableMotion')}</AppText>}
        <ActionButton disabled={locked || busy} label={c('takePhoto')} onPress={() => pick(true)} />
        <ActionButton disabled={locked || busy} label={c('choosePhoto')} tone="secondary" onPress={() => pick(false)} />
        {error ? <AppText color={colors.error}>{error}</AppText> : null}
      </Panel>
      {draftPages.map((p, i) => (
        <Panel key={p.id} title={`${c('page')} ${i + 1}`}>
          <Image accessibilityLabel={`${c('page')} ${i + 1}`} source={{ uri: p.uri }} style={{ height: 300, width: '100%', resizeMode: 'contain' }} />
          <AppText variant="caption" muted numberOfLines={2}>{c('fingerprint')}: {p.fingerprint}</AppText>
          <ActionButton label={c('removePage')} tone="secondary" onPress={() => { setChecked(false); setDraftPages((current) => current.filter((page) => page.id !== p.id)); }} />
        </Panel>
      ))}
      <ChoiceRow label={c('type')} value={type} onValueChange={setType} options={['other', 'fuel', 'lr', 'pod'].map((value) => ({ value, label: c(value) }))} />
      <Toggle label={c('reviewQuality')} value={checked} onValueChange={setChecked} />
      <AppText muted>{c('queueBody')}</AppText>
      <ActionButton disabled={locked || !draftPages.length || !checked || busy} label={busy ? 'Uploading…' : c('queue')} onPress={submit} />
    </ExperiencePage>
  );
}
export function ExperienceInbox({ navigation }) {
  const c = useExperienceCopy(); const { preview, motion, recordEvent } = useExperience(); const [answer, setAnswer] = useState(null);
  useEffect(() => setAnswer(null), [preview]);
  return <ExperiencePage title={c('inbox')} navigation={navigation}><Panel title={c('office')}><Row title={c('messagesPreview')} detail={c('needsAck')} onPress={() => navigation.navigate('Conversation preview')} /><Row title={c('openMessages')} onPress={() => navigation.navigate('Messages')} /><Row title={c('alerts')} onPress={() => navigation.navigate('Existing alerts')} /></Panel><Panel title={c('questions')}>{preview ? <><AppText>{c('question')}</AppText><AppText muted>{c('answerStopped')}</AppText>{answer ? <AppText color={colors.success}>{c('answered')}: {c(answer)}</AppText> : <View style={{ flexDirection: 'row', gap: 12 }}>{['yes', 'no'].map(key => <ActionButton key={key} label={c(key)} disabled={motion !== 'stopped'} onPress={() => { setAnswer(key); recordEvent('QUEUED_PROMPT_ANSWERED', { answer: key }); }} />)}</View>}<AppText muted>{c('expired')} · {c('question')}</AppText><ActionButton label={c('expired')} disabled /></> : <AppText muted>{c('noQuestions')}</AppText>}</Panel></ExperiencePage>;
}
export function ConversationPreview({ navigation }) {
  const c = useExperienceCopy(); const { preview, recordEvent } = useExperience(); const [message, setMessage] = useState(''); const [sent, setSent] = useState([]); const [ack, setAck] = useState(false); const [audio, setAudio] = useState(null); const { motion } = useExperience();
  useEffect(() => { setSent([]); setAck(false); setMessage(''); }, [preview]);
  return <ExperiencePage title={c('messagesPreview')} navigation={navigation}><Panel title={c('broadcast')}><AppText>{c('assignedTrip')} · {c('sampleRoute')}</AppText><AppText muted>{c('context')} · {c('sample')}</AppText><AppText>{c('needsAck')}</AppText><ActionButton disabled={!preview || ack} label={c(ack ? 'acknowledged' : 'acknowledge')} onPress={() => { setAck(true); recordEvent('BROADCAST_PREVIEW_ACKNOWLEDGED'); }} /></Panel>{sent.map((text, index) => <Card key={index} style={{ alignSelf: 'flex-end', backgroundColor: colors.blueTint }}><AppText>{text}</AppText><AppText variant="caption" muted>{c('sample')}</AppText></Card>)}<TextField editable={preview && motion === 'stopped'} label={c('message')} accessibilityLabel={c('message')} value={message} onChangeText={setMessage} multiline /><ActionButton label={c('sendPreview')} disabled={!preview || motion !== 'stopped' || !message.trim()} onPress={() => { setSent(current => [...current, message.trim()]); setMessage(''); recordEvent('MESSAGE_PREVIEW_SENT'); }} /><VoiceAttachment enabled={preview && motion === 'stopped'} onChange={setAudio} />{audio && <AppText muted>{c('voiceNote')} · {c('sample')}</AppText>}<ActionButton label={c('openMessages')} tone="secondary" onPress={() => navigation.navigate('Messages')} /></ExperiencePage>;
}
export function JourneySummary({ navigation }) { const c = useExperienceCopy(); const { preview } = useExperience(); return <ExperiencePage title={c('tripSummary')} navigation={navigation}>{preview ? <><AppText muted>{c('tripBody')}</AppText><Panel title={c('sampleRoute')}><AppText>{`${c('distance')}: 176 km`}</AppText><AppText>{`${c('driving')}: 3 h 20 min`}</AppText><AppText color={colors.warning}>{c('unconfirmed')}</AppText><AppText>{`${c('stops')}: 2`}</AppText><AppText muted>{c('diesel')}</AppText></Panel><Row title={c('money')} onPress={() => navigation.navigate('Papers & money')} /></> : <AppText>{c('disconnectedBody')}</AppText>}</ExperiencePage>; }
export function PreviewActivity({ navigation }) { const c = useExperienceCopy(); const { events } = useExperience(); return <ExperiencePage title={c('previewActivity')} navigation={navigation}>{!events.length && <AppText muted>{c('emptyActivity')}</AppText>}{[...events].reverse().map(event => <Card key={event.id} style={{ gap: 6 }}><AppText variant="small">{event.type}</AppText><AppText variant="caption" muted>{new Date(event.at).toLocaleTimeString()}</AppText></Card>)}</ExperiencePage>; }
export function DocumentsExpiry({ navigation }) { const c = useExperienceCopy(); return <ExperiencePage title={c('expiry')} navigation={navigation}><Panel title={c('expiry')}><AppText>{c('expiryBody')}</AppText><ActionButton label={c('connectedRecords')} onPress={() => navigation.navigate('Documents')} /></Panel></ExperiencePage>; }
export function DriverRestHours({ navigation }) {
  const c = useExperienceCopy();
  const { preview } = useExperience();
  // Illustrative mock minutes: 8 h 20 m of a 10 h example limit → 83% → warn.
  const atWheelMin = 500;
  const limitMin = 600;
  const pct = Math.min(100, Math.round((atWheelMin / limitMin) * 100));
  const nearLimit = pct >= 80;
  return <ExperiencePage title={c('restHours')} navigation={navigation}>
    {preview ? <>
      <AppText muted>{c('restHoursBody')}</AppText>
      <Panel title={c('restAtWheel')}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <AppText variant="h2">{c('restAtWheelValue')}</AppText>
          <AppText variant="small" muted>{`/ ${c('restLimitValue')}`}</AppText>
        </View>
        <View style={{ height: 12, borderRadius: 8, backgroundColor: colors.border, overflow: 'hidden' }}>
          <View style={{ width: `${pct}%`, height: '100%', backgroundColor: nearLimit ? colors.warning : colors.success }} />
        </View>
        <AppText variant="caption" muted>{`${pct}%`}</AppText>
      </Panel>
      <Card style={{ flexDirection: 'row', gap: 16 }}>
        <View style={{ flex: 1, gap: 4 }}><AppText variant="caption" muted>{c('restTodayLabel')}</AppText><AppText weight="semibold">{c('restTodayValue')}</AppText></View>
        <View style={{ flex: 1, gap: 4 }}><AppText variant="caption" muted>{c('restLastBreak')}</AppText><AppText weight="semibold">{c('restLastBreakValue')}</AppText></View>
      </Card>
      <Card style={{ gap: 8, backgroundColor: colors.blueTint }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name={nearLimit ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={20} color={nearLimit ? colors.warning : colors.success} />
          <AppText weight="bold">{c(nearLimit ? 'restWarnTitle' : 'restOkTitle')}</AppText>
        </View>
        <AppText variant="small" muted>{c(nearLimit ? 'restWarnBody' : 'restOkBody')}</AppText>
      </Card>
      <Panel title={c('restWeek')}><AppText>{c('restWeekValue')}</AppText></Panel>
      <AppText variant="caption" muted>{c('restDisclaimer')}</AppText>
    </> : <AppText>{c('disconnectedBody')}</AppText>}
  </ExperiencePage>;
}
export function DriverEarnings({ navigation }) {
  const c = useExperienceCopy();
  const { preview } = useExperience();
  const items = [
    { id: 'e1', titleKey: 'earnTripDgpDkn', amount: 3200, statusKey: 'paid', color: colors.success },
    { id: 'e2', titleKey: 'earnAdvance', amount: 1000, statusKey: 'earnGiven', color: colors.primary },
    { id: 'e3', titleKey: 'earnBhatta', amount: 1500, statusKey: 'earnPending', color: colors.warning },
    { id: 'e4', titleKey: 'earnTripDknJsr', amount: 4200, statusKey: 'paid', color: colors.success },
  ];
  const money = (n) => `₹${n.toLocaleString('en-IN')}`;
  const weekTotal = items.filter((i) => i.statusKey === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const pendingTotal = items.filter((i) => i.statusKey === 'earnPending').reduce((sum, i) => sum + i.amount, 0);
  return <ExperiencePage title={c('earnings')} navigation={navigation}>
    {preview ? <>
      <AppText muted>{c('earningsBody')}</AppText>
      <Card style={{ flexDirection: 'row', gap: 16 }}>
        <View style={{ flex: 1, gap: 4 }}><AppText variant="caption" muted>{c('restWeek')}</AppText><AppText variant="h2" color={colors.success}>{money(weekTotal)}</AppText></View>
        <View style={{ flex: 1, gap: 4 }}><AppText variant="caption" muted>{c('earnPending')}</AppText><AppText variant="h2" color={colors.warning}>{money(pendingTotal)}</AppText></View>
      </Card>
      <Panel title={c('earnings')}>
        {items.map((item) => <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 }}>
          <View style={{ flex: 1, gap: 2 }}><AppText weight="semibold">{c(item.titleKey)}</AppText><AppText variant="caption" color={item.color}>{c(item.statusKey)}</AppText></View>
          <AppText weight="semibold">{money(item.amount)}</AppText>
        </View>)}
      </Panel>
      <AppText variant="caption" muted>{c('earnDisclaimer')}</AppText>
    </> : <AppText>{c('disconnectedBody')}</AppText>}
  </ExperiencePage>;
}
export function FuelEntry({ navigation }) {
  const c = useExperienceCopy();
  const { preview, motion, events, recordEvent } = useExperience();
  const [litres, setLitres] = useState('');
  const [amount, setAmount] = useState('');
  const [odometer, setOdometer] = useState('');
  const [station, setStation] = useState('');
  const [photo, setPhoto] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (!preview) { setLitres(''); setAmount(''); setOdometer(''); setStation(''); setPhoto(null); setNotice(''); setError(''); } }, [preview]);
  const stopped = preview && motion === 'stopped';
  const decimal = /^\d+(\.\d{1,2})?$/;
  const valid = decimal.test(litres.trim()) && decimal.test(amount.trim()) && /^\d+$/.test(odometer.trim());
  const entries = events.filter((event) => event.type === 'FUEL_PREVIEW_LOGGED');
  const attach = async () => {
    if (!stopped) return;
    try { const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 }); if (!result.canceled) { setPhoto(result.assets[0].uri); setNotice(''); } } catch { setError(c('captureError')); }
  };
  const save = () => {
    if (!stopped || !valid) { setError(c('fuelInvalid')); return; }
    recordEvent('FUEL_PREVIEW_LOGGED', { litres: litres.trim(), amount: amount.trim(), odometer: odometer.trim(), station: station.trim() || null, hasPhoto: !!photo });
    setLitres(''); setAmount(''); setOdometer(''); setStation(''); setPhoto(null); setError(''); setNotice(c('fuelSaved'));
  };
  return <ExperiencePage title={c('fuelEntry')} navigation={navigation}>
    {preview ? <>
      <AppText muted>{c('fuelEntryBody')}</AppText>
      {!stopped ? <Card style={{ backgroundColor: colors.blueTint }}><AppText>{c('fuelStoppedOnly')}</AppText></Card> : null}
      <Panel title={c('fuelEntry')}>
        <TextField label={c('fuelLitres')} accessibilityLabel={c('fuelLitres')} keyboardType="decimal-pad" editable={stopped} value={litres} onChangeText={setLitres} />
        <TextField label={c('fuelAmount')} accessibilityLabel={c('fuelAmount')} keyboardType="decimal-pad" editable={stopped} value={amount} onChangeText={setAmount} />
        <TextField label={c('fuelOdometer')} accessibilityLabel={c('fuelOdometer')} keyboardType="number-pad" editable={stopped} value={odometer} onChangeText={setOdometer} />
        <TextField label={c('fuelStation')} accessibilityLabel={c('fuelStation')} editable={stopped} value={station} onChangeText={setStation} />
        {photo ? <><Image source={{ uri: photo }} accessibilityLabel={c('fuelAttached')} style={{ width: '100%', height: 200, resizeMode: 'contain', backgroundColor: colors.background }} /><ActionButton label={c('remove')} tone="secondary" onPress={() => setPhoto(null)} /></> : <ActionButton label={c('fuelAttach')} tone="secondary" disabled={!stopped} onPress={attach} />}
        <ActionButton label={c('fuelSave')} disabled={!stopped || !valid} onPress={save} />
        {error ? <AppText color={colors.error}>{error}</AppText> : null}
        {notice ? <AppText accessibilityLiveRegion="polite" color={colors.success}>{notice}</AppText> : null}
      </Panel>
      <Panel title={c('fuelRecent')}>
        {!entries.length ? <AppText muted>{c('fuelNone')}</AppText> : [...entries].reverse().map((event) => <View key={event.id} style={{ minHeight: 44, gap: 2 }}>
          <AppText weight="semibold">{`${event.payload.litres} L · ₹${event.payload.amount}`}</AppText>
          <AppText variant="caption" muted>{`${event.payload.odometer} km${event.payload.station ? ` · ${event.payload.station}` : ''}${event.payload.hasPhoto ? ` · ${c('fuelAttached')}` : ''}`}</AppText>
        </View>)}
      </Panel>
      <AppText variant="caption" muted>{c('fuelDisclaimer')}</AppText>
    </> : <AppText>{c('disconnectedBody')}</AppText>}
  </ExperiencePage>;
}
export function PreTripInspection({ navigation }) {
  const c = useExperienceCopy();
  const { preview, recordEvent } = useExperience();
  const checklist = [
    { id: 'tyres', key: 'dvirTyres' }, { id: 'brakes', key: 'dvirBrakes' }, { id: 'lights', key: 'dvirLights' },
    { id: 'wipers', key: 'dvirWipers' }, { id: 'horn', key: 'dvirHorn' }, { id: 'mirrors', key: 'dvirMirrors' },
    { id: 'papers', key: 'dvirPapers' }, { id: 'fuel', key: 'dvirFuel' },
  ];
  const [status, setStatus] = useState({});
  const [notes, setNotes] = useState({});
  const [photos, setPhotos] = useState({});
  const [notice, setNotice] = useState('');
  useEffect(() => { if (!preview) { setStatus({}); setNotes({}); setPhotos({}); setNotice(''); } }, [preview]);
  const done = checklist.filter((item) => status[item.id]).length;
  const issues = checklist.filter((item) => status[item.id] === 'issue').length;
  const allChecked = done === checklist.length;
  const canStart = preview && allChecked && issues === 0;
  const attach = async (id) => {
    try { const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 }); if (!result.canceled) setPhotos((current) => ({ ...current, [id]: result.assets[0].uri })); } catch { /* ignore */ }
  };
  const start = () => { if (!canStart) return; recordEvent('PRETRIP_PREVIEW_COMPLETED', { items: checklist.length }); setNotice(c('dvirStarted')); };
  return <ExperiencePage title={c('dvir')} navigation={navigation}>
    {preview ? <>
      <AppText muted>{c('dvirBody')}</AppText>
      <AppText variant="caption" muted>{`${done}/${checklist.length} ${c('dvirChecked')} · ${issues} ${c('dvirIssues')}`}</AppText>
      {checklist.map((item) => <Card key={item.id} style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AppText weight="semibold" style={{ flex: 1 }}>{c(item.key)}</AppText>
          <ActionButton label={c('dvirOk')} tone="secondary" selected={status[item.id] === 'ok'} onPress={() => setStatus((s) => ({ ...s, [item.id]: 'ok' }))} style={{ minWidth: 76 }} />
          <ActionButton label={c('dvirIssue')} tone="secondary" selected={status[item.id] === 'issue'} onPress={() => setStatus((s) => ({ ...s, [item.id]: 'issue' }))} style={{ minWidth: 76 }} />
        </View>
        {status[item.id] === 'issue' ? <>
          <TextField label={c('dvirNote')} accessibilityLabel={c('dvirNote')} value={notes[item.id] || ''} onChangeText={(value) => setNotes((current) => ({ ...current, [item.id]: value }))} multiline />
          {photos[item.id] ? <Image source={{ uri: photos[item.id] }} accessibilityLabel={c('dvirPhotoAdded')} style={{ width: '100%', height: 160, resizeMode: 'contain', backgroundColor: colors.background }} /> : <ActionButton label={c('dvirAddPhoto')} tone="secondary" onPress={() => attach(item.id)} />}
        </> : null}
      </Card>)}
      {issues > 0 ? <Card style={{ backgroundColor: colors.blueTint }}><AppText color={colors.warning}>{c('dvirStartBlocked')}</AppText></Card> : !allChecked ? <AppText variant="caption" muted>{c('dvirIncomplete')}</AppText> : null}
      <ActionButton label={c('dvirStart')} disabled={!canStart} onPress={start} />
      {notice ? <AppText accessibilityLiveRegion="polite" color={colors.success}>{notice}</AppText> : null}
      <AppText variant="caption" muted>{c('dvirDisclaimer')}</AppText>
    </> : <AppText>{c('disconnectedBody')}</AppText>}
  </ExperiencePage>;
}
export function DeliveryConfirmation({ navigation }) {
  const c = useExperienceCopy();
  const { preview, motion, recordEvent } = useExperience();
  const [receivedBy, setReceivedBy] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState(null);
  const [delivered, setDelivered] = useState(false);
  useEffect(() => { if (!preview) { setReceivedBy(''); setNote(''); setPhoto(null); setDelivered(false); } }, [preview]);
  const stopped = preview && motion === 'stopped';
  const canMark = stopped && !delivered && !!receivedBy.trim() && !!photo;
  const attach = async () => {
    if (!stopped) return;
    try { const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 }); if (!result.canceled) setPhoto(result.assets[0].uri); } catch { /* ignore */ }
  };
  const mark = () => { if (!canMark) return; recordEvent('POD_PREVIEW_CONFIRMED', { receivedBy: receivedBy.trim(), note: note.trim() || null, hasPhoto: true }); setDelivered(true); };
  return <ExperiencePage title={c('podTitle')} navigation={navigation}>
    {preview ? <>
      <AppText muted>{c('podBody')}</AppText>
      {!stopped ? <Card style={{ backgroundColor: colors.blueTint }}><AppText>{c('podStoppedOnly')}</AppText></Card> : null}
      <Panel title={c('podDrop')}>
        <AppText weight="semibold">{c('podDropValue')}</AppText>
        <AppText variant="caption" muted>{`${c('podTime')}: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}</AppText>
      </Panel>
      {delivered ? <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name="checkmark-circle" size={22} color={colors.success} /><AppText weight="bold" color={colors.success}>{c('podDelivered')}</AppText></View>
        <AppText variant="small" muted>{`${c('podReceivedBy')}: ${receivedBy.trim()}`}</AppText>
        {photo ? <Image source={{ uri: photo }} accessibilityLabel={c('podPhotoAdded')} style={{ width: '100%', height: 180, resizeMode: 'contain', backgroundColor: colors.background }} /> : null}
        <AppText accessibilityLiveRegion="polite" color={colors.success}>{c('podDone')}</AppText>
      </Card> : <Panel title={c('podTitle')}>
        <TextField label={c('podReceivedBy')} accessibilityLabel={c('podReceivedBy')} editable={stopped} value={receivedBy} onChangeText={setReceivedBy} maxLength={60} />
        <TextField label={c('podNote')} accessibilityLabel={c('podNote')} editable={stopped} value={note} onChangeText={setNote} multiline maxLength={200} />
        {photo ? <><Image source={{ uri: photo }} accessibilityLabel={c('podPhotoAdded')} style={{ width: '100%', height: 180, resizeMode: 'contain', backgroundColor: colors.background }} /><ActionButton label={c('remove')} tone="secondary" onPress={() => setPhoto(null)} /></> : <ActionButton label={c('podAddPhoto')} tone="secondary" disabled={!stopped} onPress={attach} />}
        {!canMark && stopped ? <AppText variant="caption" muted>{c('podNeed')}</AppText> : null}
        <ActionButton label={c('podMark')} disabled={!canMark} onPress={mark} />
      </Panel>}
      <AppText variant="caption" muted>{c('podDisclaimer')}</AppText>
    </> : <AppText>{c('disconnectedBody')}</AppText>}
  </ExperiencePage>;
}
export function ExpenseClaim({ navigation }) {
  const c = useExperienceCopy();
  const { preview, motion, events, recordEvent } = useExperience();
  const types = [
    { id: 'toll', key: 'expenseToll' }, { id: 'food', key: 'expenseFood' },
    { id: 'parking', key: 'expenseParking' }, { id: 'other', key: 'other' },
  ];
  const [type, setType] = useState('toll');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (!preview) { setType('toll'); setAmount(''); setNote(''); setPhoto(null); setNotice(''); setError(''); } }, [preview]);
  const stopped = preview && motion === 'stopped';
  const valid = /^\d+(\.\d{1,2})?$/.test(amount.trim());
  const entries = events.filter((event) => event.type === 'EXPENSE_PREVIEW_LOGGED');
  const attach = async () => {
    if (!stopped) return;
    try { const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 }); if (!result.canceled) { setPhoto(result.assets[0].uri); setNotice(''); } } catch { setError(c('captureError')); }
  };
  const save = () => {
    if (!stopped || !valid) { setError(c('expenseInvalid')); return; }
    recordEvent('EXPENSE_PREVIEW_LOGGED', { type, amount: amount.trim(), note: note.trim() || null, hasPhoto: !!photo });
    setAmount(''); setNote(''); setPhoto(null); setError(''); setNotice(c('expenseSaved'));
  };
  const typeLabel = (id) => c(types.find((item) => item.id === id)?.key || 'other');
  return <ExperiencePage title={c('expenseClaim')} navigation={navigation}>
    {preview ? <>
      <AppText muted>{c('expenseBody')}</AppText>
      {!stopped ? <Card style={{ backgroundColor: colors.blueTint }}><AppText>{c('expenseStoppedOnly')}</AppText></Card> : null}
      <Panel title={c('expenseClaim')}>
        <ChoiceRow label={c('expenseType')} value={type} onValueChange={setType} options={types.map((item) => ({ value: item.id, label: c(item.key) }))} />
        <TextField label={c('fuelAmount')} accessibilityLabel={c('fuelAmount')} keyboardType="decimal-pad" editable={stopped} value={amount} onChangeText={setAmount} />
        <TextField label={c('podNote')} accessibilityLabel={c('podNote')} editable={stopped} value={note} onChangeText={setNote} multiline maxLength={200} />
        {photo ? <><Image source={{ uri: photo }} accessibilityLabel={c('expenseAttached')} style={{ width: '100%', height: 180, resizeMode: 'contain', backgroundColor: colors.background }} /><ActionButton label={c('remove')} tone="secondary" onPress={() => setPhoto(null)} /></> : <ActionButton label={c('expenseAttach')} tone="secondary" disabled={!stopped} onPress={attach} />}
        <ActionButton label={c('fuelSave')} disabled={!stopped || !valid} onPress={save} />
        {error ? <AppText color={colors.error}>{error}</AppText> : null}
        {notice ? <AppText accessibilityLiveRegion="polite" color={colors.success}>{notice}</AppText> : null}
      </Panel>
      <Panel title={c('expenseRecent')}>
        {!entries.length ? <AppText muted>{c('expenseNone')}</AppText> : [...entries].reverse().map((event) => <View key={event.id} style={{ minHeight: 44, gap: 2 }}>
          <AppText weight="semibold">{`${typeLabel(event.payload.type)} · ₹${event.payload.amount}`}</AppText>
          {event.payload.note || event.payload.hasPhoto ? <AppText variant="caption" muted>{`${event.payload.note || ''}${event.payload.hasPhoto ? `${event.payload.note ? ' · ' : ''}${c('expenseAttached')}` : ''}`}</AppText> : null}
        </View>)}
      </Panel>
      <AppText variant="caption" muted>{c('expenseDisclaimer')}</AppText>
    </> : <AppText>{c('disconnectedBody')}</AppText>}
  </ExperiencePage>;
}
