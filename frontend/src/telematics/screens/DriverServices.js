import React, { useState } from 'react';
import { View, Linking } from 'react-native';
import { AppText, Button, Card, colors } from '../../components/ui';
import { useLanguage } from '../../context/LanguageContext';
import { useTelematicsApi } from '../context/TelematicsApiContext';
import { useExperienceCopy } from '../experience/ExperienceUI';
import { Screen, useRequest, RequestState } from '../components/FormControls';

const hm = (ms) => {
  if (ms == null || !Number.isFinite(ms)) return '—';
  const total = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
};
const levelColor = (level) => (level === 'RED' ? colors.error : level === 'AMBER' ? colors.warning : colors.success);

// The road reports the driver may raise (POST /app/v2/reports). The server
// attaches the place, heading, speed and time; the phone only sends the type.
const REPORT_TYPES = [
  ['ACCIDENT', 'typeAccident'],
  ['JAM', 'typeJam'],
  ['ROAD_BLOCKED', 'typeRoadBlocked'],
  ['WATERLOGGING', 'typeWaterlogging'],
  ['ROAD_WORKS', 'typeRoadWorks'],
  ['BROKEN_DOWN', 'typeBrokenDown'],
  ['CHECKPOST_QUEUE', 'typeCheckpostQueue'],
];

export function RoadReport({ navigation }) {
  const c = useExperienceCopy();
  const service = useTelematicsApi();
  const [busy, setBusy] = useState('');
  const [sent, setSent] = useState('');
  const [error, setError] = useState('');
  async function report(type, label) {
    if (busy) return;
    setBusy(type); setSent(''); setError('');
    try {
      await service.createRoadReport({ type, clientId: `${type}-${Date.now()}` });
      setSent(`${c('reported')}: ${label}. ${c('thankYou')}`);
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }
  return <Screen navigation={navigation} title={c('reportRoad')}>
    <Card style={{ gap: 10 }}>
      <AppText variant="label" muted>{c('whatAhead')}</AppText>
      {REPORT_TYPES.map(([type, key]) => <Button key={type} label={c(key)} variant="secondary" loading={busy === type} disabled={!!busy} onPress={() => report(type, c(key))} />)}
    </Card>
    {sent ? <AppText color={colors.success}>{sent}</AppText> : null}
    {error ? <AppText color={colors.error}>{error}</AppText> : null}
  </Screen>;
}

// Rest & hours — the driver's own duty state (GET /app/v2/duty/today).
export function DriverRestHours({ navigation }) {
  const c = useExperienceCopy();
  const service = useTelematicsApi();
  const request = useRequest(() => service.dutyToday(), [service]);
  const duty = request.data;
  return <Screen navigation={navigation} title={c('restHours')}>
    <RequestState request={request} />
    {duty && <>
      <Card style={{ gap: 6 }}>
        <AppText variant="label" muted>{c('atWheel')}</AppText>
        <AppText variant="h2" color={levelColor(duty.level)}>{hm(duty.continuousDrivingMs)}</AppText>
        <AppText>{c('restLimit')} {hm(duty.limitMs)} · {hm(duty.remainingMs)} {c('restLeft')}</AppText>
      </Card>
      {duty.daily && <Card style={{ gap: 4 }}>
        <AppText variant="label" muted>{c('today')}</AppText>
        <AppText>{c('work')} {hm(duty.daily.workMs)} {c('of')} {hm(duty.daily.limitMs)}</AppText>
        {duty.spreadOver && <AppText>{c('spreadOver')} {hm(duty.spreadOver.ms)} {c('of')} {hm(duty.spreadOver.limitMs)}</AppText>}
      </Card>}
      {Array.isArray(duty.warnings) && duty.warnings.length > 0 && <Card style={{ gap: 8 }}>
        <AppText variant="label" muted>{c('warnings')}</AppText>
        {duty.warnings.map((w, i) => <AppText key={w.code || i} color={levelColor(w.level)}>{w.message}</AppText>)}
      </Card>}
      {duty.evidence && <Card style={{ gap: 4 }}>
        <AppText variant="label" muted>{c('evidence')}</AppText>
        <AppText muted>{(duty.evidence.counted?.length || 0)} {c('counted')}, {(duty.evidence.excluded?.length || 0)} {c('excluded')} {c('intervals')}</AppText>
        {duty.basis?.citation ? <AppText variant="caption" muted>{duty.basis.citation}</AppText> : null}
      </Card>}
    </>}
  </Screen>;
}

// Privacy & consent — the DPDP notice and the driver's own consent state.
export function PrivacyConsent({ navigation }) {
  const c = useExperienceCopy();
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
  return <Screen navigation={navigation} title={c('privacyConsent')}>
    <RequestState request={request} />
    {data && <>
      <Card style={{ gap: 8 }}>
        <AppText variant="h3">{notice?.title || c('consentNotice')}</AppText>
        {notice?.body ? <AppText>{notice.body}</AppText> : null}
        {Array.isArray(notice?.items) && notice.items.map((it, i) => <AppText key={i} muted>• {it.purpose} ({it.dataClass})</AppText>)}
      </Card>
      <Card style={{ gap: 6 }}>
        <AppText variant="label" muted>{c('yourConsent')}</AppText>
        <AppText color={granted ? colors.success : colors.warning}>{granted ? c('granted') : c('notGranted')}</AppText>
        {data.state?.grantedAt ? <AppText variant="caption" muted>{c('grantedOn')} {new Date(data.state.grantedAt).toLocaleDateString()}</AppText> : null}
      </Card>
      {granted
        ? <Button label={c('withdrawConsent')} variant="danger" loading={busy} onPress={withdraw} />
        : <Button label={c('iAgree')} loading={busy} disabled={!notice?.version} onPress={grant} />}
      {error ? <AppText color={colors.error}>{error}</AppText> : null}
    </>}
  </Screen>;
}

// Help menu — contacts, breakdown help and the office's cards about this driver.
export function DriverHelp({ navigation }) {
  const c = useExperienceCopy();
  const service = useTelematicsApi();
  const request = useRequest(() => service.helpMenu(), [service]);
  const [breakdown, setBreakdown] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const data = request.data;
  async function act(action) {
    setError('');
    if (action.kind === 'CALL' && action.target?.mobile) {
      Linking.openURL(`tel:${action.target.mobile}`).catch(() => setError(c('dialerFailed')));
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
  return <Screen navigation={navigation} title={c('help')}>
    <RequestState request={request} />
    {data && <>
      <Card style={{ gap: 10 }}>
        <AppText variant="label" muted>{c('getHelp')}</AppText>
        {(data.actions || []).map((action) => action.future
          ? <AppText key={action.id} muted>{action.label} ({c('comingSoon')})</AppText>
          : <Button key={action.id} label={action.target?.name ? `${action.label} · ${action.target.name}` : action.label} variant={action.kind === 'SOS' ? 'danger' : 'secondary'} disabled={!action.available || busy} onPress={() => act(action)} />)}
      </Card>
      {breakdown && <Card style={{ gap: 6 }}>
        <AppText variant="label" muted>{c('nearestHelp')}</AppText>
        {breakdown.incidentNumber ? <AppText>{c('officeAlerted')} · {breakdown.incidentNumber}</AppText> : null}
        {(breakdown.workshops || []).length
          ? breakdown.workshops.map((w) => <AppText key={w.id}>{w.name || c('workshop')} · {w.distanceKm != null ? `${w.distanceKm} km` : `${Math.round(w.distanceM)} m`}</AppText>)
          : <AppText muted>{c('noWorkshop')}</AppText>}
      </Card>}
      {Array.isArray(data.cards) && data.cards.length > 0 && <Card style={{ gap: 8 }}>
        <AppText variant="label" muted>{c('fromOffice')}</AppText>
        {data.cards.map((card) => <View key={card.id} style={{ gap: 2 }}>
          <AppText weight="semibold">{card.label || card.type}</AppText>
          {card.fact ? <AppText muted>{card.fact}</AppText> : null}
          {card.canReply ? <AppText variant="caption" color={colors.primary}>{card.replyHint || c('addYourSide')}</AppText> : null}
        </View>)}
      </Card>}
      {error ? <AppText color={colors.error}>{error}</AppText> : null}
    </>}
  </Screen>;
}

// Helpful cards — the office's cards about this driver, with the right of reply
// (GET /app/v2/help → data.cards).
export function HelpfulCards({ navigation }) {
  const c = useExperienceCopy();
  const service = useTelematicsApi();
  const request = useRequest(() => service.helpMenu(), [service]);
  const cards = request.data?.cards || [];
  return <Screen navigation={navigation} title={c('helpfulCards')}>
    <RequestState request={request} />
    {request.data && (cards.length
      ? cards.map((card) => <Card key={card.id} style={{ gap: 4 }}>
        <AppText weight="semibold">{card.label || card.type}</AppText>
        {card.fact ? <AppText muted>{card.fact}</AppText> : null}
        {card.raisedAt ? <AppText variant="caption" muted>{new Date(card.raisedAt).toLocaleString()}</AppText> : null}
        {card.canReply ? <Button label={c('crewMessages')} variant="secondary" onPress={() => navigation.navigate('Messages')} /> : null}
      </Card>)
      : <AppText muted>{c('noHelpfulCards')}</AppText>)}
  </Screen>;
}

// Plant & gate — the live visit (GET /app/v2/visits/active) and the site card
// (GET /app/v2/sites/:siteId/card): the queue range, the suggested gate and the
// papers for this gate.
export function SiteCard({ navigation, route }) {
  const c = useExperienceCopy();
  const service = useTelematicsApi();
  const paramSiteId = route?.params?.siteId;
  const request = useRequest(async () => {
    let siteId = paramSiteId;
    if (!siteId) {
      const active = await service.visitsActive();
      siteId = active?.visit?.siteId;
    }
    if (!siteId) return { none: true };
    const result = await service.siteCard(siteId);
    return { card: result?.card || null };
  }, [service, paramSiteId]);
  const card = request.data?.card;
  const queue = card?.queue;
  return <Screen navigation={navigation} title={c('siteCard')}>
    <RequestState request={request} />
    {request.data?.none ? <Card><AppText muted>{c('notAtPlant')}</AppText></Card> : null}
    {card && <>
      <Card style={{ gap: 6 }}>
        <AppText variant="h3">{card.name || c('siteCard')}</AppText>
        {queue?.now ? <AppText>{c('queueNow')}: {queue.now.count} {c('trucks')}</AppText> : null}
        {queue && (queue.p20 != null || queue.p80 != null) ? <AppText muted>{c('usually')} {queue.p20 ?? '—'}–{queue.p80 ?? '—'}</AppText> : null}
      </Card>
      {card.gateDirection?.text ? <Card style={{ gap: 4 }}>
        <AppText variant="label" muted>{c('suggestedGate')}</AppText>
        <AppText>{card.gateDirection.text}</AppText>
      </Card> : null}
      {Array.isArray(card.gates) && card.gates.length > 0 && <Card style={{ gap: 4 }}>
        <AppText variant="label" muted>{c('gates')}</AppText>
        {card.gates.map((g) => <AppText key={g.id}>{g.label}{g.vehicles != null ? ` · ${g.vehicles} ${c('trucks')}` : ''}</AppText>)}
      </Card>}
      {Array.isArray(card.papers?.checklist) && card.papers.checklist.length > 0 && <Card style={{ gap: 4 }}>
        <AppText variant="label" muted>{c('papersForGate')}</AppText>
        {card.papers.checklist.map((p) => <AppText key={p.type}>• {p.label}</AppText>)}
      </Card>}
    </>}
  </Screen>;
}
