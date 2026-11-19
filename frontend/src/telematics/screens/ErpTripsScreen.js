import React, { useRef, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { AppText, Button, Card, colors } from '../../components/ui';
import { pickFromCamera, pickFromGallery } from '../../utils/pickImage';
import { useTelematicsApi } from '../context/TelematicsApiContext';
import { recordId } from '../services/telematicsApi';
import { Screen, Choice, useRequest, RequestState } from '../components/FormControls';
import AttachmentPicker from '../workflows/AttachmentPicker';

const BILTY_STATES = ['PLACED', 'DISPATCHED', 'ADVANCE_PENDING', 'ADVANCE_PAID', 'CN_PENDING', 'CN_UPDATED', 'TRIP_CLOSED', 'POD_RECEIVED', 'UNLOADED', 'BILLED'];
export function ErpTripsScreen({ navigation }) {
  const service = useTelematicsApi();
  const [page, setPage] = useState(1);
  const request = useRequest(() => service.erpTrips(page), [service, page]);
  const rows = request.data?.data || [];
  const total = request.data?.meta?.total;
  return <Screen navigation={navigation} title="ERP trips & delivery documents"><RequestState request={request} />
    {rows.map((trip) => <Card key={trip._id} onPress={() => navigation.navigate('ERP trip', { id: trip._id })}><AppText variant="h3">{trip.tripNumber}</AppText><AppText>{trip.vehicleId?.registrationNumber || trip.vehicleNumber || ''} · {trip.state}</AppText><AppText>{trip.fromLocation?.name || trip.fromLocation || 'Origin'} → {trip.toLocation?.name || trip.toLocation || 'Destination'}</AppText></Card>)}
    {!request.loading && !request.error && !rows.length && <AppText>No ERP trips on this page.</AppText>}
    <AppText>Page {page}{total != null ? ` · ${total} trips` : ''}</AppText>
    <Button label="Previous" variant="secondary" disabled={page === 1 || request.loading} onPress={() => setPage(page - 1)} />
    <Button label="Next" variant="secondary" disabled={request.loading || (total != null ? page * 30 >= total : rows.length < 30)} onPress={() => setPage(page + 1)} />
  </Screen>;
}
export function ErpTripScreen({ navigation, route }) {
  const service = useTelematicsApi();
  const request = useRequest(() => service.erpTrip(route.params.id), [service, route.params.id]);
  const trip = request.data;
  const [kind, setKind] = useState('bilty');
  const [asset, setAsset] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const allowed = kind === 'bilty' ? BILTY_STATES.includes(trip?.state) : ['TRIP_CLOSED', 'POD_RECEIVED'].includes(trip?.state);
  async function pick(source) {
    try {
      let file;
      if (source === 'pdf') {
        const response = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
        if (!response.canceled) file = response.assets[0];
      } else file = await (source === 'camera' ? pickFromCamera : pickFromGallery)();
      if (file) { setAsset({ ...file, name: file.name || file.fileName || 'document.jpg' }); setError(''); setSaved(''); }
    } catch (failure) { setError(failure.message); }
  }
  async function upload() {
    if (sending.current || !asset || !allowed) return;
    sending.current = true; setBusy(true); setError('');
    try {
      await (kind === 'bilty' ? service.uploadBilty : service.uploadPod)(recordId(trip), asset);
      setSaved(`${kind === 'bilty' ? 'Bilty' : 'POD'} file stored. Fleet staff complete the CN/POD workflow.`);
      setAsset(null); request.reload();
    } catch (failure) { setError(failure.message); }
    finally { sending.current = false; setBusy(false); }
  }
  return <Screen navigation={navigation} title="ERP trip documents"><RequestState request={request} />
    {trip && <>
      <Card><AppText variant="h3">{trip.tripNumber}</AppText><AppText>{trip.state}</AppText><AppText>{trip.vehicleId?.registrationNumber || trip.vehicleNumber || ''}</AppText><AppText>Material: {trip.material?.name || trip.material || 'Unavailable'}</AppText></Card>
      <Choice label="Document" value={kind} onChange={(value) => { setKind(value); setAsset(null); setError(''); setSaved(''); }} disabled={busy} options={[["bilty", "Consignment note / bilty"], ["pod", "Proof of delivery"]]} />
      {allowed ? <><AttachmentPicker title={kind === 'bilty' ? 'Bilty' : 'POD'} asset={asset} disabled={busy} onCamera={() => pick('camera')} onGallery={() => pick('gallery')} onFile={() => pick('pdf')} onRemove={() => setAsset(null)} />
        <Button label="Upload document" loading={busy} disabled={!asset} onPress={upload} /></> : <AppText>{kind === 'pod' ? 'POD upload becomes available after the trip is closed.' : 'Bilty upload becomes available once the vehicle is placed.'}</AppText>}
    </>}
    {error ? <AppText color={colors.error}>{error}</AppText> : null}{saved ? <AppText>{saved}</AppText> : null}
  </Screen>;
}
