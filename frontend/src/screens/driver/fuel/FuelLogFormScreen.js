import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, View, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../../context/AuthContext';
import { AppText, Button, Card, TextField, colors, spacing } from '../../../components/ui';
import Select from '../../../components/ui/SelectField';
import AttachmentPicker from '../../../telematics/workflows/AttachmentPicker';
import DateField from '../../../telematics/workflows/DateField';
import { createTelematicsApi, recordId } from '../../../telematics/services/telematicsApi';
import { receiptRefuelTime } from '../../../telematics/services/fuelReceipt';
import { fuelPayload, saveFuelEntry } from '../../../telematics/services/fuelEntry';
import { searchGooglePlaces, getGooglePlace, placesConfigured } from '../../../services/googlePlaces';
import { savedLocationFromGoogle } from '../../../services/googlePlaceLocation';
import * as Crypto from 'expo-crypto';

function Choice({ label, value, options, onChange, disabled }) {
  return <View><AppText variant="label" muted>{label}</AppText><Select accessibilityLabel={label} selectedValue={value} onValueChange={onChange} enabled={!disabled}>
    <Select.Item label="Choose…" value="" />
    {options.map(([id, name]) => <Select.Item key={id} label={name} value={id} />)}
  </Select></View>;
}
function LocationChoice({ label, value, onChange, api, disabled }) {
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const sessionToken = useRef(Crypto.randomUUID());
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      const [saved, google] = await Promise.allSettled([
        api.fuelLocations(search),
        !disabled && placesConfigured() ? searchGooglePlaces(search, sessionToken.current) : Promise.resolve([]),
      ]);
      if (!active) return;
      setOptions(saved.status === 'fulfilled' ? saved.value : []);
      setPredictions(google.status === 'fulfilled' ? google.value : []);
      setError([saved, google].filter((result) => result.status === 'rejected').map((result) => result.reason.message).join(' '));
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [search, api, disabled]);
  async function selectGoogle(prediction) {
    if (saving || disabled) return;
    setSaving(true); setError('');
    try {
      const details = await getGooglePlace(prediction.place_id, sessionToken.current);
      const saved = await api.createSavedLocation(savedLocationFromGoogle(details, prediction.description));
      const row = { ...saved, _id: recordId(saved) };
      setSelected(row); onChange(row._id); setSearch(''); setPredictions([]);
      sessionToken.current = Crypto.randomUUID();
    } catch (failure) { setError(failure.message); }
    finally { setSaving(false); }
  }
  const choices = options.map((row) => [recordId(row), row.name]);
  if (value && !choices.some(([id]) => id === value)) choices.unshift([value, selected?.name || 'Saved location selected']);
  return <View><TextField label={`Search ${label.toLowerCase()}`} value={search} onChangeText={setSearch} editable={!disabled && !saving} />
    <Choice label={label} value={value} onChange={(id) => { setSelected(options.find((row) => recordId(row) === id)); onChange(id); }} disabled={disabled || saving} options={choices} />
    {predictions.map((prediction) => <Button key={prediction.place_id} variant="secondary" label={prediction.description} disabled={disabled || saving} onPress={() => selectGoogle(prediction)} />)}
    {predictions.length > 0 && <Image accessibilityLabel="Powered by Google" source={{ uri: 'https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png' }} style={{ width: 120, height: 15, marginTop: 8 }} resizeMode="contain" />}
    {saving && <AppText>Saving selected location…</AppText>}
    {error ? <AppText color={colors.error}>{error}</AppText> : null}
  </View>;
}

export default function FuelLogFormScreen({ navigation }) {
  const { user, token, organization, invalidateSession } = useAuth();
  const insets = useSafeAreaInsets();
  const org = recordId(organization) || recordId(user.orgId);
  const api = useMemo(() => createTelematicsApi({ baseURL: process.env.EXPO_PUBLIC_API_URL, token, user, orgId: org, onUnauthorized: () => invalidateSession(token) }), [token, user, org, invalidateSession]);
  const draftKey = `fuel-web-flow:${org}:${user._id}`;
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState(user.role === 'DRIVER' ? user._id : '');
  const [previous, setPrevious] = useState(null);
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [previousError, setPreviousError] = useState('');
  const [fields, setFields] = useState({ litres: '', rate: '', location: '', fillingType: 'PARTIAL', odometerReading: '', refuelTime: new Date().toISOString(), routeSource: '', routeDestination: '' });
  const [docs, setDocs] = useState({ fuel: null, odometer: null });
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [progress, setProgress] = useState(null);
  const [done, setDone] = useState(false);
  const sending = useRef(false);
  const locked = !!draft || busy || scanning;
  const change = (key, value) => setFields((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [list, saved] = await Promise.all([api.fuelVehicles(), AsyncStorage.getItem(draftKey)]);
        if (!active) return;
        setVehicles(list);
        if (saved) {
          const restored = JSON.parse(saved);
          setDraft(restored); setFields(restored.fields); setDocs({ fuel: restored.fuel, odometer: restored.odometer });
          setVehicleId(restored.payload.vehicleId); setDriverId(restored.payload.driverId);
        } else if (user.role === 'DRIVER') setVehicleId(list[0]?.id || '');
        if (user.role !== 'DRIVER') setDrivers(await api.fuelDrivers());
        if (active) setReady(true);
      } catch (failure) { if (active) setError(failure.message); }
    }
    load();
    return () => { active = false; };
  }, [api, draftKey, user.role, loadAttempt]);
  useEffect(() => {
    let active = true;
    setPrevious(null); setPreviousError('');
    if (!vehicleId) return;
    setLoadingPrevious(true);
    api.fuelLastOdometer(vehicleId).then((row) => { if (active) setPrevious(row); })
      .catch((failure) => { if (active) setPreviousError(failure.message); })
      .finally(() => { if (active) setLoadingPrevious(false); });
    if (user.role !== 'DRIVER' && !draft) api.fuelAssignment(vehicleId).then((assignment) => {
      if (active) setDriverId(recordId(assignment?.driverId) || '');
    }).catch(() => { if (active) setNotice('Select the driver; no assignment suggestion is available.'); });
    return () => { active = false; };
  }, [api, vehicleId, user.role, draft]);

  async function pick(slot, camera) {
    if (locked) return;
    setError(''); setNotice('');
    try {
      if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) throw new Error('Camera permission is required.');
      const result = await (camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync)({ mediaTypes: ['images'], quality: 0.85 });
      if (result.canceled || !result.assets?.length) return;
      const item = result.assets[0];
      if ((item.fileSize || 0) > 10 * 1024 * 1024) throw new Error('Choose an image smaller than 10 MB.');
      const asset = { ...item, name: item.fileName || 'photo.jpg' };
      const uploadedAt = new Date().toISOString();
      setDocs((old) => ({ ...old, [slot]: { asset, ocr: null } }));
      if (slot === 'fuel') change('refuelTime', uploadedAt);
      setScanning(true);
      try {
        const ocr = await api.fuelScan(asset, slot === 'fuel' ? 'FUEL_RECEIPT' : 'ODOMETER');
        setDocs((old) => ({ ...old, [slot]: { asset, ocr } }));
        if (slot === 'fuel') setFields((old) => ({ ...old,
          ...(ocr.volume && { litres: String(ocr.volume), rate: ocr.rate ? String(ocr.rate) : old.rate, location: ocr.location || old.location }),
          refuelTime: receiptRefuelTime(ocr.datetime, uploadedAt),
        }));
        else if (ocr.reading) {
          const reading = parseFloat(String(ocr.reading).replace(/[^\d.]/g, ''));
          if (Number.isFinite(reading)) change('odometerReading', String(reading));
        }
        setNotice('Review the extracted values before saving.');
      } catch (failure) { setError(`OCR failed: ${failure.message}. The image is attached; enter the values manually.`); }
      finally { setScanning(false); }
    } catch (failure) { setError(failure.message); }
  }
  async function checkpoint(next) {
    await AsyncStorage.setItem(draftKey, JSON.stringify(next));
    setDraft(next);
  }
  async function save() {
    if (sending.current || scanning || !ready) return;
    sending.current = true; setBusy(true); setError('');
    try {
      if (!docs.fuel && !draft?.documentId) throw new Error('Fuel slip is required.');
      const frozen = draft || { fields, payload: fuelPayload(fields, vehicleId, driverId, previous), ...docs };
      await checkpoint(frozen);
      await saveFuelEntry(api, frozen, checkpoint, (event) => setProgress(event.total ? Math.round(100 * event.loaded / event.total) : null));
      setDone(true);
      await AsyncStorage.removeItem(draftKey).catch(() => setNotice('Saved. Local draft cleanup failed; check history before another entry.'));
    } catch (failure) { setError(failure.message); }
    finally { sending.current = false; setBusy(false); setProgress(null); }
  }
  function startSeparateEntry() {
    const message = 'Check fuel history first. A timed-out submission may already be saved. Starting a separate entry can create another fuel log.';
    const reset = async () => {
      try { await AsyncStorage.removeItem(draftKey); setDraft(null); setError(''); setNotice('You can edit this as a separate entry.'); }
      catch (failure) { setError(failure.message); }
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm(message)) reset();
    } else Alert.alert('Start a separate entry?', message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Start separate entry', onPress: reset }]);
  }
  const text = (key, label, numeric = false) => <TextField label={label} value={fields[key]} onChangeText={(value) => change(key, value)} editable={!locked} keyboardType={numeric ? 'decimal-pad' : 'default'} />;
  const attachment = (slot, title) => <AttachmentPicker title={title} asset={docs[slot]?.asset} disabled={locked} onCamera={() => pick(slot, true)} onGallery={() => pick(slot, false)} onRemove={() => setDocs((old) => ({ ...old, [slot]: null }))} imagesOnly />;
  return <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}><ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: insets.bottom + spacing.lg }} keyboardShouldPersistTaps="handled">
    <Button label="Back" variant="ghost" onPress={() => navigation.goBack()} disabled={busy} />
    <AppText variant="h2">Log fuel entry</AppText>
    {done ? <><AppText>Fuel entry saved on the server.</AppText><Button label="Done" onPress={() => navigation.goBack()} /></> : <>
      {!ready && <AppText>Loading fuel entry…</AppText>}
      {!ready && error ? <Button label="Retry loading" onPress={() => { setError(''); setLoadAttempt((value) => value + 1); }} /> : null}
      <Choice label="Vehicle" value={vehicleId} options={vehicles.map((row) => [row.id, row.registrationNumber])} onChange={(id) => { setVehicleId(id); change('odometerReading', ''); }} disabled={locked || user.role === 'DRIVER'} />
      {user.role === 'DRIVER' ? <AppText>Driver: {[user.firstName, user.lastName].filter(Boolean).join(' ')}</AppText> : <Choice label="Driver" value={driverId} options={drivers.map((row) => [recordId(row), [row.firstName, row.lastName].filter(Boolean).join(' ')])} onChange={setDriverId} disabled={locked} />}
      {loadingPrevious ? <AppText>Loading previous fuel reading…</AppText> : previous ? <Card><AppText>Previous odometer: {previous.odometerReading ?? 'Unavailable'} km</AppText><AppText>Previous refuel: {new Date(previous.refuelTime).toLocaleString()}</AppText></Card> : <AppText>No previous fuel log.</AppText>}
      {previousError ? <AppText color={colors.error}>Previous reading unavailable: {previousError}</AppText> : null}
      {attachment('fuel', 'Fuel slip')}
      {fields.fillingType === 'FULL_TANK' && attachment('odometer', 'Odometer photo (optional)')}
      {scanning && <AppText accessibilityRole="alert">Reading image…</AppText>}
      <AppText>Fuel type: Diesel</AppText>
      <Choice label="Filling type" value={fields.fillingType} options={[["PARTIAL", "Partial fill"], ["FULL_TANK", "Full tank"]]} onChange={(value) => change('fillingType', value)} disabled={locked} />
      {text('litres', 'Litres', true)}{text('rate', 'Rate per litre (₹)', true)}
      {fields.fillingType === 'FULL_TANK' && <>{text('odometerReading', 'Odometer (km, optional)', true)}<AppText muted>Leave blank to use the truck odometer at the refuel time, when available.</AppText></>}
      {text('location', 'Pump location')}
      <DateField label="Refuel date and time" value={fields.refuelTime} onChange={(value) => change('refuelTime', value)} disabled={locked} />
      <LocationChoice label="Source location" value={fields.routeSource} onChange={(value) => change('routeSource', value)} api={api} disabled={locked} />
      <LocationChoice label="Destination location" value={fields.routeDestination} onChange={(value) => change('routeDestination', value)} api={api} disabled={locked} />
      {draft && <AppText>Retrying the same entry. Uploaded documents are reused.</AppText>}
      {progress !== null && <AppText>Uploading: {progress}%</AppText>}
      <Button label={draft ? 'Retry submission' : 'Save entry'} onPress={save} loading={busy} disabled={!ready || scanning || loadingPrevious} />
      {draft && <Button label="Start separate entry" variant="ghost" disabled={busy} onPress={startSeparateEntry} />}
    </>}
    {notice ? <AppText>{notice}</AppText> : null}{error ? <AppText accessibilityRole="alert" color={colors.error}>{error}</AppText> : null}
  </ScrollView></View>;
}
