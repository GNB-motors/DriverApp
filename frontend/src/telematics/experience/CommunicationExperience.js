import React, { useEffect, useState } from 'react';
import { Image, View, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AppText, Card, TextField, colors } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useExperience } from './ExperienceContext';
import { ActionButton, ChoiceRow, ExperiencePage } from './ExperienceUI';
import { VoiceAttachment } from './ReportExperience';
import { useCommunicationCopy } from './communicationCopy';

const management = role => ['OWNER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(String(role || '').toUpperCase());
const sampleRecipients = [
  { id: 'sample-sunil', name: 'driver', duty: true },
  { id: 'sample-ajay', name: 'codriver', duty: true },
  { id: 'sample-office', name: 'office', duty: false },
];
const groupTypes = ['direct', 'crew', 'branch', 'plant', 'lane', 'manual'];
export function previewTimeValid(value) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }
export function previewDeliveryState(recipient, priority, index) {
  if (!recipient.duty && priority !== 'urgent') return 'waitingDuty';
  return ['read', 'delivered', 'sent'][index % 3];
}
function Paragraph({ children, warning = false }) { return <AppText variant="small" color={warning ? colors.warning : colors.textMuted}>{children}</AppText>; }
function MessageBubble({ text, mine, label }) { return <View style={[s.message, mine && s.mine]}><AppText variant="caption" muted>{label}</AppText><AppText>{text}</AppText></View>; }
function LocalActivity({ events, c, conversationId }) {
  const rows = events.filter(event => event.type.startsWith('COMMUNICATION_') && (!conversationId || event.payload.conversationId === conversationId)).slice(-8).reverse();
  return <Card style={s.stack}><AppText variant="h3">{c('activity')}</AppText>{rows.length ? rows.map(event => <View key={event.id}><AppText variant="small">{event.payload.label || c('local')}</AppText><AppText variant="caption" muted>{new Date(event.at).toLocaleTimeString()}</AppText></View>) : <Paragraph>{c('noActivity')}</Paragraph>}</Card>;
}
function ExistingMessages({ navigation, c }) { return <><Paragraph>{c('disconnected')}</Paragraph><ActionButton label={c('existing')} tone="secondary" onPress={() => navigation.navigate('Messages')} /></>; }

export function CommunicationHome({ navigation }) {
  const c = useCommunicationCopy();
  const { user } = useAuth();
  const { preview, events, recordEvent } = useExperience();
  const [groupName, setGroupName] = useState('');
  const [notice, setNotice] = useState('');
  const allowed = management(user?.role);
  useEffect(() => { setGroupName(''); setNotice(''); }, [preview]);
  const groups = events.filter(event => event.type === 'COMMUNICATION_GROUP_PREVIEW');
  return <ExperiencePage title={c('title')} navigation={navigation}>
    {!preview ? <ExistingMessages navigation={navigation} c={c} /> : <>
      <Paragraph>{c('sample')}</Paragraph><AppText variant="h3">{c('groups')}</AppText>
      {groupTypes.filter(type => type !== 'manual' || allowed).map(type => <Card key={type} style={s.stack}><AppText weight="bold">{c(type)}</AppText><Paragraph>{c('privacy')}</Paragraph><ActionButton label={c('open')} tone="secondary" onPress={() => navigation.navigate('Design conversation', { conversationId: `sample-${type}`, kind: type })} /></Card>)}
      {groups.map(event => <ActionButton key={event.id} label={event.payload.name} tone="secondary" onPress={() => navigation.navigate('Design conversation', { conversationId: event.id, name: event.payload.name, kind: 'manual' })} />)}
      {allowed && <Card style={s.stack}><TextField label={c('groupName')} accessibilityLabel={c('groupName')} maxLength={60} value={groupName} onChangeText={setGroupName} /><ActionButton label={c('createGroup')} disabled={!groupName.trim()} onPress={() => { if (!preview || !groupName.trim()) return; recordEvent('COMMUNICATION_GROUP_PREVIEW', { name: groupName.trim(), label: c('groupCreated') }); setGroupName(''); setNotice(c('groupCreated')); }} /><ActionButton label={c('compose')} tone="secondary" onPress={() => navigation.navigate('New preview broadcast')} /></Card>}
      <Paragraph>{c('quietBody')}</Paragraph>{notice ? <AppText accessibilityLiveRegion="polite" color={colors.success}>{notice}</AppText> : null}<LocalActivity events={events} c={c} />
    </>}
  </ExperiencePage>;
}

export function ConversationDesign({ navigation, route }) {
  const c = useCommunicationCopy();
  const { preview, motion, events, recordEvent } = useExperience();
  const conversationId = route?.params?.conversationId || 'sample-direct';
  const [message, setMessage] = useState(''); const [photo, setPhoto] = useState(null); const [voice, setVoice] = useState(null); const [pin, setPin] = useState(false); const [notice, setNotice] = useState('');
  const [call, setCall] = useState(null); const [target, setTarget] = useState('driver');
  const stopped = preview && motion === 'stopped';
  useEffect(() => { setMessage(''); setPhoto(null); setVoice(null); setPin(false); setNotice(''); setCall(null); }, [preview, conversationId]);
  const messages = events.filter(event => event.type === 'COMMUNICATION_MESSAGE_PREVIEW' && event.payload.conversationId === conversationId);
  const missed = events.filter(event => event.type === 'COMMUNICATION_CALL_OUTCOME' && event.payload.conversationId === conversationId && event.payload.outcome === 'notReached').length;
  const attach = async () => { if (!stopped) return; try { const value = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 }); if (!value.canceled) setPhoto(value.assets[0].uri); } catch { setNotice(c('attachmentError')); } };
  const send = () => {
    if (!stopped || (!message.trim() && !photo && !voice && !pin)) return;
    recordEvent('COMMUNICATION_MESSAGE_PREVIEW', { conversationId, text: message.trim(), photo: !!photo, voice: !!voice, samplePin: pin, label: c('local') });
    setMessage(''); setPhoto(null); setVoice(null); setPin(false); setNotice(c('local'));
  };
  return <ExperiencePage title={route?.params?.name || c('conversation')} navigation={navigation}>
    {!preview ? <ExistingMessages navigation={navigation} c={c} /> : <>
      <Paragraph>{c('sample')}</Paragraph><MessageBubble text={c('incoming')} label={c('office')} />
      {messages.map(event => <View key={event.id}><MessageBubble mine text={event.payload.text || c('attached')} label={c('sampleMessage')} />{event.payload.photo || event.payload.voice ? <Paragraph>{c('attached')}</Paragraph> : null}{event.payload.samplePin && <Paragraph>{c('locationNote')}</Paragraph>}</View>)}
      {!stopped && <Paragraph warning>{c('locked')}</Paragraph>}
      <TextField label={c('message')} accessibilityLabel={c('message')} placeholder={c('placeholder')} multiline maxLength={2000} editable={stopped} value={message} onChangeText={setMessage} />
      <ChoiceRow label={c('template')} value={null} options={['stoppedTemplate', 'papersTemplate'].map(value => ({ value, label: c(value) }))} onValueChange={value => { if (stopped) setMessage(c(value)); }} />
      <ActionButton label={c('photo')} tone="secondary" disabled={!stopped} onPress={attach} />
      {photo && <><Image source={{ uri: photo }} accessibilityLabel={c('attached')} style={s.photo} /><Paragraph>{c('imagePaper')}</Paragraph><ActionButton label={c('remove')} tone="secondary" onPress={() => setPhoto(null)} /></>}
      <VoiceAttachment key={`${conversationId}:${messages.length}:${preview}`} enabled={stopped} onChange={setVoice} />
      <ActionButton label={c('location')} disabled={!stopped || pin} tone="secondary" onPress={() => setPin(true)} />{pin && <Paragraph>{c('locationNote')}</Paragraph>}
      <ActionButton label={c('send')} disabled={!stopped || (!message.trim() && !photo && !voice && !pin)} onPress={send} />
      <Paragraph>{c('textRead')}</Paragraph><ActionButton label={c('listen')} tone="secondary" onPress={() => setNotice(c('voiceUnavailable'))} />
      <Card style={s.stack}><AppText variant="h3">{c('call')}</AppText><Paragraph>{c('safety')}</Paragraph>{motion !== 'stopped' && <Paragraph warning>{c('moving')}</Paragraph>}<ChoiceRow label={c('recipient')} value={target} onValueChange={setTarget} options={['driver', 'codriver', 'office', 'owner'].map(value => ({ value, label: c(value) }))} /><ActionButton label={c('call')} tone="secondary" onPress={() => setCall('confirm')} />
        {call === 'confirm' && <><Paragraph>{c('callNote')}</Paragraph><ActionButton label={c('confirmCall')} onPress={() => { if (!preview) return; recordEvent('COMMUNICATION_CALL_PREVIEW', { conversationId, target, label: c('callNote') }); setCall('outcome'); }} /><ActionButton label={c('cancel')} tone="secondary" onPress={() => setCall(null)} /></>}
        {call === 'outcome' && <ChoiceRow label={c('outcome')} value={null} options={['reached', 'notReached', 'resolved', 'followUp'].map(value => ({ value, label: c(value) }))} onValueChange={outcome => { if (!preview) return; recordEvent('COMMUNICATION_CALL_OUTCOME', { conversationId, target, outcome, label: c(outcome) }); setCall(null); setNotice(c('callRecorded')); }} />}
        {missed >= 2 && <><ActionButton label={c('callCodriver')} tone="secondary" onPress={() => { setTarget('codriver'); setCall('confirm'); }} /><Paragraph>{c('voiceAlternative')}</Paragraph></>}
      </Card>
      {notice ? <AppText accessibilityLiveRegion="polite">{notice}</AppText> : null}<LocalActivity events={events} c={c} conversationId={conversationId} />
    </>}
  </ExperiencePage>;
}

export function BroadcastComposer({ navigation }) {
  const c = useCommunicationCopy(); const { user } = useAuth(); const { preview, motion, recordEvent } = useExperience();
  const [filter, setFilter] = useState('allDuty'); const [detail, setDetail] = useState(''); const [priority, setPriority] = useState('normal'); const [schedule, setSchedule] = useState('now'); const [time, setTime] = useState('09:00'); const [body, setBody] = useState(''); const [reviewed, setReviewed] = useState(false); const [selected, setSelected] = useState(sampleRecipients.map(row => row.id)); const [saved, setSaved] = useState(null); const [error, setError] = useState('');
  const canCompose = preview && management(user?.role) && motion === 'stopped';
  useEffect(() => { setReviewed(false); setSaved(null); setError(''); }, [filter, detail, priority, schedule, time, body, selected, preview]);
  useEffect(() => { setBody(''); setDetail(''); setSelected(sampleRecipients.map(row => row.id)); }, [preview]);
  const save = () => {
    if (!canCompose || !reviewed || !body.trim() || !selected.length) return;
    if (schedule === 'later' && !previewTimeValid(time)) { setError(c('invalidTime')); return; }
    const recipients = sampleRecipients.filter(row => selected.includes(row.id)).map((row, index) => ({ ...row, state: previewDeliveryState(row, priority, index), acknowledged: false }));
    const event = recordEvent('COMMUNICATION_BROADCAST_PREVIEW', { filter, detail: detail.trim(), priority, schedule, time: schedule === 'later' ? time : null, body: body.trim(), recipients, label: c('savedBroadcast') });
    setSaved(event?.id || null);
  };
  return <ExperiencePage title={c('broadcast')} navigation={navigation}>
    {!management(user?.role) ? <Paragraph warning>{c('scope')}</Paragraph> : !preview ? <Paragraph>{c('disconnected')}</Paragraph> : <>
      <Paragraph>{c('sample')}</Paragraph>{!canCompose && <Paragraph warning>{c('locked')}</Paragraph>}
      <ChoiceRow label={c('audience')} value={filter} onValueChange={setFilter} options={['allDuty', 'branch', 'lane', 'place', 'nearby', 'model', 'manual'].map(value => ({ value, label: c(value) }))} />
      <TextField label={c('detail')} accessibilityLabel={c('detail')} placeholder={c('detailHint')} editable={canCompose} maxLength={150} value={detail} onChangeText={setDetail} />
      <Paragraph>{c('audienceNote')}</Paragraph>
      <View style={s.stack}>{sampleRecipients.map(row => <ActionButton key={row.id} label={`${c(row.name)} · ${c(row.duty ? 'onDuty' : 'offDuty')}`} tone="secondary" selected={selected.includes(row.id)} disabled={!canCompose} onPress={() => setSelected(current => current.includes(row.id) ? current.filter(id => id !== row.id) : [...current, row.id])} />)}</View>
      <ChoiceRow label={c('priority')} value={priority} onValueChange={setPriority} options={['normal', 'urgent', 'needsAck'].map(value => ({ value, label: c(value) }))} />
      <ChoiceRow label={c('schedule')} value={schedule} onValueChange={setSchedule} options={['now', 'later'].map(value => ({ value, label: c(value) }))} />
      {schedule === 'later' && <><TextField label={c('time')} accessibilityLabel={c('time')} editable={canCompose} value={time} onChangeText={setTime} maxLength={5} /><Paragraph>{c('scheduleNote')}</Paragraph></>}
      <TextField label={c('message')} accessibilityLabel={c('message')} multiline editable={canCompose} value={body} onChangeText={setBody} maxLength={2000} />
      <Card style={s.stack}><AppText weight="bold">{c('quiet')}</AppText><Paragraph>{c('quietBody')}</Paragraph></Card>
      <ActionButton label={c('previewAudience')} disabled={!canCompose || !body.trim() || !selected.length} tone="secondary" onPress={() => setReviewed(true)} />
      {reviewed && <Card style={s.stack}>{sampleRecipients.filter(row => selected.includes(row.id)).map(row => <AppText key={row.id}>{c(row.name)} · {c(!row.duty && priority !== 'urgent' ? 'waitingDuty' : 'selected')}</AppText>)}</Card>}
      <ActionButton label={c('saveBroadcast')} disabled={!canCompose || !reviewed || !!saved} onPress={save} />
      {error && <AppText color={colors.error} accessibilityRole="alert">{error}</AppText>}{saved && <><Paragraph>{c('savedBroadcast')}</Paragraph><ActionButton label={c('viewReceipts')} onPress={() => navigation.navigate('Preview receipts', { broadcastId: saved })} /></>}
    </>}
  </ExperiencePage>;
}

export function CommunicationReceipts({ navigation, route }) {
  const c = useCommunicationCopy(); const { user } = useAuth(); const { preview, events, recordEvent } = useExperience();
  const broadcast = events.find(event => event.type === 'COMMUNICATION_BROADCAST_PREVIEW' && event.id === route?.params?.broadcastId) || events.filter(event => event.type === 'COMMUNICATION_BROADCAST_PREVIEW').slice(-1)[0];
  return <ExperiencePage title={c('receipts')} navigation={navigation}>
    {!management(user?.role) ? <Paragraph warning>{c('scope')}</Paragraph> : !preview ? <Paragraph>{c('disconnected')}</Paragraph> : !broadcast ? <><Paragraph>{c('noBroadcast')}</Paragraph><ActionButton label={c('compose')} onPress={() => navigation.navigate('New preview broadcast')} /></> : <>
      <Paragraph warning>{c('sampleStates')}</Paragraph><Card style={s.stack}><AppText>{broadcast.payload.body}</AppText><Paragraph>{c(broadcast.payload.priority)} · {broadcast.payload.time || c('now')}</Paragraph></Card>
      {broadcast.payload.recipients.map(row => {
        const acknowledged = events.some(event => event.type === 'COMMUNICATION_ACK_SAMPLE' && event.payload.broadcastId === broadcast.id && event.payload.recipientId === row.id);
        return <Card key={row.id} style={s.stack}><AppText weight="bold">{c(row.name)}</AppText><Paragraph>{c(row.state)} · {c(acknowledged ? 'acknowledged' : 'notAcknowledged')}</Paragraph>{broadcast.payload.priority === 'needsAck' && !acknowledged && <ActionButton label={c('acknowledge')} tone="secondary" onPress={() => recordEvent('COMMUNICATION_ACK_SAMPLE', { broadcastId: broadcast.id, recipientId: row.id, label: c('statusChanged') })} />}<ActionButton label={c('callRecipient')} tone="secondary" onPress={() => navigation.navigate('Design conversation', { conversationId: `sample-${row.id}` })} /></Card>;
      })}
    </>}
  </ExperiencePage>;
}

const s = StyleSheet.create({ stack: { gap: 12 }, message: { padding: 16, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 6, maxWidth: '94%' }, mine: { alignSelf: 'flex-end', backgroundColor: colors.blueTint }, photo: { height: 180, width: '100%', resizeMode: 'contain' } });
