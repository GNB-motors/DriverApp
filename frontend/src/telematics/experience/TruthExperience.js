import React, { useEffect, useState } from 'react';
import { AppText, Card, colors } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useExperience } from './ExperienceContext';
import { ActionButton, ChoiceRow, ExperiencePage } from './ExperienceUI';
import { useTruthCopy } from './truthCopy';

export function truthRoleAllowed(role) { return ['OWNER', 'SUPER_ADMIN', 'SUPERADMIN'].includes(String(role || '').toUpperCase()); }
function Observation({ title, value, c, missing, delayed, n }) {
  return <Card style={{ gap: 8 }}><AppText weight="bold">{title}</AppText><AppText variant="h3" mono>{missing ? '—' : value}</AppText><AppText variant="caption" muted>{missing ? c('insufficient') : c('source')}</AppText>{delayed && !missing && <AppText variant="small" color={colors.warning}>{c('delayed')}</AppText>}{n != null && !missing && <AppText variant="caption" muted>{c('n')}: {n} · {c('small')}</AppText>}</Card>;
}
export function ExperienceTruth({ navigation }) {
  const { user } = useAuth(); const { preview, recordEvent } = useExperience(); const c = useTruthCopy();
  const [scenario, setScenario] = useState('missing'); const [notice, setNotice] = useState('');
  useEffect(() => { setScenario('missing'); setNotice(''); }, [preview]);
  const missing = scenario === 'missing'; const delayed = scenario === 'degraded';
  return <ExperiencePage title={c('title')} navigation={navigation}>
    {!truthRoleAllowed(user?.role) ? <AppText color={colors.warning}>{c('restricted')}</AppText> : !preview ? <><AppText>{c('disconnected')}</AppText><AppText muted>{c('live')}</AppText></> : <>
      <AppText color={colors.warning}>{c('sample')}</AppText><ChoiceRow label={c('scenario')} value={scenario} onValueChange={setScenario} options={['healthy', 'degraded', 'missing'].map(value => ({ value, label: c(value) }))} />
      <AppText variant="h3">{c('health')}</AppText>
      {[['sessions', '12'], ['streams', '9'], ['backlog', '3'], ['push', '8 / 10']].map(([key, value]) => <Observation key={key} title={c(key)} value={value} c={c} missing={missing} delayed={delayed} />)}
      <Card style={{ gap: 10 }}><AppText variant="h3">{c('model')}</AppText><AppText>{c('version')}: {missing ? '—' : 'preview-v1'}</AppText><AppText muted>{c('fit')}</AppText><AppText color={colors.warning}>{c('admission')}</AppText><AppText muted>{c('noAdmission')}</AppText></Card>
      <AppText variant="h3">{c('geo')}</AppText><AppText muted>{c('tile')}</AppText><AppText muted>{c('graph')}</AppText><Observation title={c('latency')} value="0.8 s" c={c} missing={missing} delayed={delayed} n={8} /><Observation title={c('errors')} value="1 / 20" c={c} missing={missing} delayed={delayed} n={20} /><AppText muted>{c('packs')}</AppText>
      <AppText variant="h3">{c('benchmark')}</AppText><Observation title={c('eta')} value="6 / 8" c={c} missing={missing} delayed={delayed} n={8} />{['fusion', 'capture', 'guidance'].map(key => <AppText key={key} muted>{c(key)} · {c('insufficient')}</AppText>)}
      <Card style={{ gap: 10 }}><AppText variant="h3">{c('device')}</AppText><AppText>{c('budget')}</AppText><AppText muted>{c('noValue')}</AppText></Card>
      <Card style={{ gap: 10 }}><AppText variant="h3">{c('alerts')}</AppText><AppText muted>{c('alertBody')}</AppText></Card>
      <ActionButton label={c('refresh')} onPress={() => { if (recordEvent('TRUTH_INSPECTION_PREVIEW', { scenario })) setNotice(c('refreshed')); }} />{notice && <AppText accessibilityLiveRegion="polite">{notice}</AppText>}<ActionButton label={c('activity')} tone="secondary" onPress={() => navigation.navigate('Preview activity')} />
    </>}
  </ExperiencePage>;
}
export default ExperienceTruth;
