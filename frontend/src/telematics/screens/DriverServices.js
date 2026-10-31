import React, { useState } from 'react';
import { View, Linking } from 'react-native';
import { AppText, Button, Card, colors } from '../../components/ui';
import { useLanguage } from '../../context/LanguageContext';
import { useTelematicsApi } from '../context/TelematicsApiContext';
import { Screen, useRequest, RequestState } from '../components/FormControls';

// The road reports the driver may raise (POST /app/v2/reports). The server
// attaches the place, heading, speed and time; the phone only sends the type.
const REPORT_TYPES = [
  ['ACCIDENT', 'Accident'],
  ['JAM', 'Traffic jam'],
  ['ROAD_BLOCKED', 'Road blocked'],
  ['WATERLOGGING', 'Waterlogging'],
  ['ROAD_WORKS', 'Road works'],
  ['BROKEN_DOWN', 'Broken-down vehicle'],
  ['CHECKPOST_QUEUE', 'Checkpost queue'],
];

export function RoadReport({ navigation }) {
  const service = useTelematicsApi();
  const [busy, setBusy] = useState('');
  const [sent, setSent] = useState('');
  const [error, setError] = useState('');
  async function report(type, label) {
    if (busy) return;
    setBusy(type); setSent(''); setError('');
    try {
      await service.createRoadReport({ type, clientId: `${type}-${Date.now()}` });
      setSent(`Reported: ${label}. Thank you.`);
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }
  return <Screen navigation={navigation} title="Report the road">
    <Card style={{ gap: 10 }}>
      <AppText variant="label" muted>What is on the road ahead?</AppText>
      {REPORT_TYPES.map(([type, label]) => <Button key={type} label={label} variant="secondary" loading={busy === type} disabled={!!busy} onPress={() => report(type, label)} />)}
    </Card>
    {sent ? <AppText color={colors.success}>{sent}</AppText> : null}
    {error ? <AppText color={colors.error}>{error}</AppText> : null}
  </Screen>;
}

const hm = (ms) => {
  if (ms == null || !Number.isFinite(ms)) return '—';
  const total = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
};
const levelColor = (level) => (level === 'RED' ? colors.error : level === 'AMBER' ? colors.warning : colors.success);

// Rest & hours — the driver's own duty state (GET /app/v2/duty/today).
export function DriverRestHours({ navigation }) {
  const service = useTelematicsApi();
  const request = useRequest(() => service.dutyToday(), [service]);
  const duty = request.data;
  return <Screen navigation={navigation} title="Rest & hours">
    <RequestState request={request} />
    {duty && <>
      <Card style={{ gap: 6 }}>
        <AppText variant="label" muted>At the wheel (without statutory rest)</AppText>
        <AppText variant="h2" color={levelColor(duty.level)}>{hm(duty.continuousDrivingMs)}</AppText>
        <AppText>Legal limit {hm(duty.limitMs)} · {hm(duty.remainingMs)} left</AppText>
      </Card>
      {duty.daily && <Card style={{ gap: 4 }}>
        <AppText variant="label" muted>Today</AppText>
        <AppText>Work {hm(duty.daily.workMs)} of {hm(duty.daily.limitMs)}</AppText>
        {duty.spreadOver && <AppText>On duty (spread-over) {hm(duty.spreadOver.ms)} of {hm(duty.spreadOver.limitMs)}</AppText>}
      </Card>}
      {Array.isArray(duty.warnings) && duty.warnings.length > 0 && <Card style={{ gap: 8 }}>
        <AppText variant="label" muted>Warnings</AppText>
        {duty.warnings.map((w, i) => <AppText key={w.code || i} color={levelColor(w.level)}>{w.message}</AppText>)}
      </Card>}
      {duty.evidence && <Card style={{ gap: 4 }}>
        <AppText variant="label" muted>Evidence</AppText>
        <AppText muted>{(duty.evidence.counted?.length || 0)} interval(s) counted, {(duty.evidence.excluded?.length || 0)} excluded.</AppText>
        {duty.basis?.citation ? <AppText variant="caption" muted>{duty.basis.citation}</AppText> : null}
      </Card>}
    </>}
  </Screen>;
}

// Privacy & consent — the DPDP notice and the driver's own consent state.
export function PrivacyConsent({ navigation }) {
  const service = useTelematicsApi();
  const { language } = useLanguage();
  const request = useRequest(() => service.consent(), [service]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const data = request.data;
  const notice = data?.notice;
  const granted = Boolean(data?.state?.grantedAt && !data?.state?.withdrawnAt);
  const lang = ['en', 'hi', 'bn'].includes(language) ? language : 'en';
  async function grant() {
    if (!notice?.version) return;
    setBusy(true); setError('');
    try { await service.grantConsent({ noticeVersion: notice.version, language: lang }); request.reload(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function withdraw() {
    setBusy(true); setError('');
    try { await service.withdrawConsent(); request.reload(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <Screen navigation={navigation} title="Privacy & consent">
    <RequestState request={request} />
    {data && <>
      <Card style={{ gap: 8 }}>
        <AppText variant="h3">{notice?.title || 'Consent notice'}</AppText>
        {notice?.body ? <AppText>{notice.body}</AppText> : null}
        {Array.isArray(notice?.items) && notice.items.map((it, i) => <AppText key={i} muted>• {it.purpose} ({it.dataClass})</AppText>)}
      </Card>
      <Card style={{ gap: 6 }}>
        <AppText variant="label" muted>Your consent</AppText>
        <AppText color={granted ? colors.success : colors.warning}>{granted ? 'Granted' : 'Not granted'}</AppText>
        {data.state?.grantedAt ? <AppText variant="caption" muted>Granted {new Date(data.state.grantedAt).toLocaleDateString()}</AppText> : null}
      </Card>
      {granted
        ? <Button label="Withdraw consent" variant="danger" loading={busy} onPress={withdraw} />
        : <Button label="I agree" loading={busy} disabled={!notice?.version} onPress={grant} />}
      {error ? <AppText color={colors.error}>{error}</AppText> : null}
    </>}
  </Screen>;
}

// Help menu — contacts, breakdown help and the office's cards about this driver.
export function DriverHelp({ navigation }) {
  const service = useTelematicsApi();
  const request = useRequest(() => service.helpMenu(), [service]);
  const [breakdown, setBreakdown] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const data = request.data;
  async function act(action) {
    setError('');
    if (action.kind === 'CALL' && action.target?.mobile) {
      Linking.openURL(`tel:${action.target.mobile}`).catch(() => setError('Could not open the dialer.'));
      return;
    }
    if (action.kind === 'MESSAGE') { navigation.navigate('Messages'); return; }
    if (action.kind === 'SOS') { navigation.navigate('SOS'); return; }
    if (action.kind === 'BREAKDOWN') {
      setBusy(true);
      try { setBreakdown(await service.helpBreakdown({})); }
      catch (e) { setError(e.message); }
      finally { setBusy(false); }
    }
  }
  return <Screen navigation={navigation} title="Help">
    <RequestState request={request} />
    {data && <>
      <Card style={{ gap: 10 }}>
        <AppText variant="label" muted>Get help</AppText>
        {(data.actions || []).map((action) => action.future
          ? <AppText key={action.id} muted>{action.label} (coming soon)</AppText>
          : <Button key={action.id} label={action.target?.name ? `${action.label} · ${action.target.name}` : action.label} variant={action.kind === 'SOS' ? 'danger' : 'secondary'} disabled={!action.available || busy} onPress={() => act(action)} />)}
      </Card>
      {breakdown && <Card style={{ gap: 6 }}>
        <AppText variant="label" muted>Nearest help</AppText>
        {breakdown.incidentNumber ? <AppText>Office alerted · {breakdown.incidentNumber}</AppText> : null}
        {(breakdown.workshops || []).length
          ? breakdown.workshops.map((w) => <AppText key={w.id}>{w.name || 'Workshop'} · {w.distanceKm != null ? `${w.distanceKm} km` : `${Math.round(w.distanceM)} m`}</AppText>)
          : <AppText muted>No nearby workshop found.</AppText>}
      </Card>}
      {Array.isArray(data.cards) && data.cards.length > 0 && <Card style={{ gap: 8 }}>
        <AppText variant="label" muted>From the office</AppText>
        {data.cards.map((card) => <View key={card.id} style={{ gap: 2 }}>
          <AppText weight="semibold">{card.label || card.type}</AppText>
          {card.fact ? <AppText muted>{card.fact}</AppText> : null}
          {card.canReply ? <AppText variant="caption" color={colors.primary}>{card.replyHint || 'You can add your side in Messages.'}</AppText> : null}
        </View>)}
      </Card>}
      {error ? <AppText color={colors.error}>{error}</AppText> : null}
    </>}
  </Screen>;
}
