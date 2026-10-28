import React, { useState } from 'react';
import { AppText, Button, Card, TextField, colors } from '../../components/ui';
import { useTelematicsApi } from '../context/TelematicsApiContext';
import { Screen, Choice, useRequest, RequestState } from '../components/FormControls';

export default function StopReasonsScreen({ navigation }) {
  const service = useTelematicsApi();
  const request = useRequest(() => service.myStops(), [service]);
  const [id, setId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  async function save() {
    if (busy || !id || !purpose) return;
    setBusy(true); setError('');
    try { await service.explainStop(id, purpose, note); setSaved('Stop explanation saved.'); setId(''); setPurpose(''); setNote(''); request.reload(); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <Screen navigation={navigation} title="Explain a stop"><RequestState request={request} />
    <AppText muted>Unanswered stops from your assigned trucks in the last 14 days. Up to 50 are shown at a time.</AppText>
    {request.data?.map((stop) => <Card key={stop._id} onPress={() => { if (!busy) { setId(stop._id); setError(''); setSaved(''); } }}><AppText weight="bold">{stop.registrationNumber} · {stop.dwellMinutes} min</AppText><AppText>{new Date(stop.startAt).toLocaleString()}</AppText><AppText>{id === stop._id ? 'Selected' : 'Tap to explain'}</AppText></Card>)}
    {request.data?.length === 0 && <AppText>No unanswered stops.</AppText>}
    {id ? <><Choice label="Reason" value={purpose} onChange={setPurpose} disabled={busy} options={['FUEL', 'LOAD', 'UNLOAD', 'REST', 'OVERNIGHT', 'SERVICE', 'TOLL', 'QUEUE'].map((value) => [value, value.toLowerCase()])} />
      <TextField label="Note (optional)" value={note} onChangeText={setNote} maxLength={300} editable={!busy} multiline />
      <Button label="Save explanation" onPress={save} loading={busy} disabled={!purpose} /></> : null}
    {error ? <AppText color={colors.error}>{error}</AppText> : null}{saved ? <AppText>{saved}</AppText> : null}
  </Screen>;
}
