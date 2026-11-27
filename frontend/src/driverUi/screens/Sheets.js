import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../context/AuthContext';
import { useDriverData } from '../../telematics/context/DriverDataContext';
import { receiptRefuelTime } from '../../telematics/services/fuelReceipt';
import { fuelPayload, saveFuelEntry } from '../../telematics/services/fuelEntry';
import { recordId } from '../../telematics/services/telematicsApi';
import DateField from '../../telematics/workflows/DateField';
import { c, r } from '../theme';
import { Btn, Dot, ErrorLine, Txt, fmtLongDate, fmtNumber, useDriverCopy } from '../kit';
import { CameraIcon, FolderIcon, PinIcon } from '../icons';
import { callOwner } from '../data';

/** Shared bottom-sheet frame: dimmed backdrop, rounded white sheet, grab handle. */
function Sheet({ top, children, onClose }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={st.scrim}>
      <Pressable style={{ height: insets.top + top }} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[st.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={st.handle} />
          {children}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, value, onChangeText, editable = true, keyboardType = 'default', placeholder }) {
  return (
    <View style={{ flex: 1 }}>
      <Txt size={14} weight="semibold" style={{ marginBottom: 6 }}>{label}</Txt>
      <TextInput value={value} onChangeText={onChangeText} editable={editable} keyboardType={keyboardType} placeholder={placeholder} placeholderTextColor="#8A90A6" accessibilityLabel={label} style={[st.input, !editable && { opacity: 0.6 }]} />
    </View>
  );
}

const MAX_FILE = 10 * 1024 * 1024;

/**
 * 11 Add fuel receipt. Same pipeline as the full fuel form (OCR scan →
 * document upload → /mileage/fuel-log), so the refill feeds fill-to-fill
 * mileage. The slip is checkpointed locally before upload, so a retry reuses
 * the uploaded document instead of saving the refill twice.
 *
 * The design shows litres and date only. Rate is required by the server and is
 * shown only when the slip could not be read; full tank vs part fill is asked
 * because mileage is measured between full tanks.
 */
export function ReceiptSheet({ navigation }) {
  const { t, lang } = useDriverCopy();
  const { user, organization } = useAuth();
  const { data, service, refresh } = useDriverData();
  const org = recordId(organization) || recordId(user.orgId);
  const draftKey = `driverUi:fuel-receipt:${org}:${user._id}`;
  const vehicleId = data?.vehicle?.id || '';
  const [slip, setSlip] = useState(null);
  const [scan, setScan] = useState('idle');
  const [fields, setFields] = useState({ litres: '', rate: '', location: '', fillingType: '', odometerReading: '', refuelTime: new Date().toISOString(), routeSource: '', routeDestination: '' });
  const [draft, setDraft] = useState(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [picker, setPicker] = useState(false);
  const sending = useRef(false);
  const locked = !!draft || busy;
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(draftKey).then((saved) => {
      if (!active) return;
      if (saved) {
        const restored = JSON.parse(saved);
        setDraft(restored); setFields(restored.fields); setSlip(restored.fuel); setScan(restored.scan || 'done');
      }
      setReady(true);
    }).catch(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [draftKey]);
  const change = (key, value) => setFields((old) => ({ ...old, [key]: value }));

  async function pick(source) {
    if (locked) return;
    setError('');
    try {
      let item;
      if (source === 'camera') {
        if (!(await ImagePicker.requestCameraPermissionsAsync()).granted) throw new Error(t('cameraDenied'));
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
        if (result.canceled || !result.assets?.length) return;
        item = result.assets[0];
      } else {
        const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
        if (result.canceled || !result.assets?.length) return;
        item = result.assets[0];
      }
      if ((item.fileSize || item.size || 0) > MAX_FILE) throw new Error(t('fileTooBig'));
      const asset = { ...item, name: item.fileName || item.name || 'receipt.jpg', mimeType: item.mimeType || (item.name?.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg') };
      const uploadedAt = new Date().toISOString();
      setSlip({ asset, ocr: null });
      setScan('reading');
      try {
        const ocr = await service.fuelScan(asset, 'FUEL_RECEIPT');
        setSlip({ asset, ocr });
        const volume = Number(ocr?.volume);
        const rate = Number(ocr?.rate);
        setFields((old) => ({
          ...old,
          litres: volume > 0 ? String(volume) : old.litres,
          rate: rate > 0 ? String(rate) : old.rate,
          location: typeof ocr?.location === 'string' && ocr.location.trim() ? ocr.location.trim() : old.location,
          refuelTime: receiptRefuelTime(ocr?.datetime, uploadedAt),
        }));
        setScan(volume > 0 ? 'done' : 'failed');
      } catch {
        setScan('failed');
        change('refuelTime', uploadedAt);
      }
    } catch (failure) { setError(failure.message); }
  }
  const ocrRate = Number(slip?.ocr?.rate) > 0;
  const showRate = !!slip && scan !== 'reading' && (!ocrRate || !(Number(fields.rate) > 0));
  async function checkpoint(next) {
    await AsyncStorage.setItem(draftKey, JSON.stringify(next));
    setDraft(next);
  }
  async function save() {
    if (sending.current || !ready || scan === 'reading') return;
    setError('');
    if (!draft) {
      if (!slip) { setError(t('slipRequired')); return; }
      if (!(Number(fields.litres) > 0)) { setError(t('litresInvalid')); return; }
      if (!(Number(fields.rate) > 0)) { setError(t('rateInvalid')); return; }
      if (!fields.fillingType) { setError(t('chooseFill')); return; }
      if (!vehicleId) { setError(t('noTruck')); return; }
    }
    sending.current = true; setBusy(true);
    try {
      const frozen = draft || { fields, scan, payload: fuelPayload(fields, vehicleId, user._id, null), fuel: { asset: { uri: slip.asset.uri, name: slip.asset.name, mimeType: slip.asset.mimeType }, ocr: slip.ocr }, odometer: null };
      await checkpoint(frozen);
      await saveFuelEntry(service, frozen, checkpoint, (event) => setProgress(event.total ? Math.round((100 * event.loaded) / event.total) : null));
      await AsyncStorage.removeItem(draftKey).catch(() => {});
      refresh().catch(() => {});
      navigation.goBack();
    } catch (failure) { setError(failure.message); }
    finally { sending.current = false; setBusy(false); setProgress(null); }
  }
  async function cancel() {
    // An unsent checkpoint stays so the next open retries the same receipt.
    navigation.goBack();
  }
  function startOver() {
    Alert.alert(t('startOver'), t('startOverConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('startOver'), style: 'destructive', onPress: async () => {
        await AsyncStorage.removeItem(draftKey).catch(() => {});
        setDraft(null); setSlip(null); setScan('idle'); setError('');
        setFields((old) => ({ ...old, litres: '', rate: '', location: '', fillingType: '', refuelTime: new Date().toISOString() }));
      } },
    ]);
  }
  const fileStatus = scan === 'reading' ? { color: c.muted, dot: c.inputBorder, text: t('reading') }
    : scan === 'done' ? { color: c.okText, dot: c.okDot, text: t('readLitres', { litres: fmtNumber(Number(fields.litres)) }) }
      : { color: c.watchInk, dot: c.watchDot, text: t('readFailed') };
  return (
    <Sheet top={60} onClose={() => !busy && navigation.goBack()}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        <Txt display size={24} weight="extrabold" track={-0.03} style={{ marginTop: 16 }} accessibilityRole="header">{t('receiptTitle')}</Txt>
        <Txt size={14} color={c.muted} style={{ marginTop: 4 }}>{t('receiptSub')}</Txt>
        <View style={st.pickRow}>
          <Pressable onPress={() => pick('camera')} disabled={locked} accessibilityRole="button" style={({ pressed }) => [st.pickBtn, st.pickPrimary, (pressed || locked) && { opacity: 0.8 }]}>
            <CameraIcon color={c.primary} /><Txt size={15} weight="bold" color={c.primary}>{t('takePhoto')}</Txt>
          </Pressable>
          <Pressable onPress={() => pick('file')} disabled={locked} accessibilityRole="button" style={({ pressed }) => [st.pickBtn, (pressed || locked) && { opacity: 0.8 }]}>
            <FolderIcon color={c.ink} /><Txt size={15} weight="bold">{t('chooseFile')}</Txt>
          </Pressable>
        </View>
        <Txt size={13} color={c.muted} style={{ marginTop: 8 }}>{t('fileHint')}</Txt>
        {slip ? (
          <View style={st.fileRow}>
            <View style={st.thumb} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <View style={[st.thumbLine, { backgroundColor: c.inputBorder }]} /><View style={[st.thumbLine, { width: '70%' }]} /><View style={st.thumbLine} /><View style={[st.thumbLine, { width: '50%', backgroundColor: c.inputBorder }]} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt size={15} weight="bold" numberOfLines={1}>{slip.asset?.name}</Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessibilityLiveRegion="polite">
                <Dot color={fileStatus.dot} size={8} /><Txt size={13} weight="semibold" color={fileStatus.color} style={{ flexShrink: 1 }}>{fileStatus.text}</Txt>
              </View>
            </View>
            {!locked ? <Pressable onPress={() => pick('camera')} accessibilityRole="button" style={st.retake}><Txt size={15} weight="bold" color={c.primary}>{t('retake')}</Txt></Pressable> : null}
          </View>
        ) : null}
        <View style={st.fieldRow}>
          <Field label={t('dieselL')} value={fields.litres} onChangeText={(value) => change('litres', value.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" editable={!locked} />
          {Platform.OS === 'web' ? (
            <View style={{ flex: 1 }}><DateField label={t('refillDate')} value={fields.refuelTime} onChange={(value) => change('refuelTime', value)} disabled={locked} includeTime={false} /></View>
          ) : <View style={{ flex: 1 }}>
            <Txt size={14} weight="semibold" style={{ marginBottom: 6 }}>{t('refillDate')}</Txt>
            <Pressable onPress={() => !locked && setPicker(true)} accessibilityRole="button" accessibilityLabel={`${t('refillDate')}: ${fmtLongDate(fields.refuelTime, lang)}`} style={[st.input, { justifyContent: 'center' }, locked && { opacity: 0.6 }]}>
              <Txt size={17} weight="semibold" numberOfLines={1}>{fmtLongDate(fields.refuelTime, lang)}</Txt>
            </Pressable>
          </View>}
        </View>
        {picker && Platform.OS !== 'web' ? (
          <DateTimePicker value={new Date(fields.refuelTime)} mode="date" maximumDate={new Date()} onChange={(event, next) => {
            setPicker(false);
            if (event.type === 'dismissed' || !next) return;
            const current = new Date(fields.refuelTime);
            next.setHours(current.getHours(), current.getMinutes(), 0, 0);
            change('refuelTime', (next > new Date() ? new Date() : next).toISOString());
          }} />
        ) : null}
        {showRate ? (
          <View style={st.fieldRow}>
            <Field label={t('ratePerL')} value={fields.rate} onChangeText={(value) => change('rate', value.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" editable={!locked} />
            <Field label={t('pumpName')} value={fields.location} onChangeText={(value) => change('location', value)} editable={!locked} />
          </View>
        ) : null}
        <Txt size={14} weight="semibold" style={{ marginTop: 14, marginBottom: 6 }}>{t('tankFilled')}</Txt>
        <View style={st.fillRow} accessibilityRole="radiogroup">
          {[['FULL_TANK', t('fullTank')], ['PARTIAL', t('partFill')]].map(([value, label]) => {
            const on = fields.fillingType === value;
            return (
              <Pressable key={value} onPress={() => !locked && change('fillingType', value)} accessibilityRole="radio" accessibilityState={{ checked: on, disabled: locked }} style={[st.fillChip, on && st.fillChipOn]}>
                <Txt size={15} weight="bold" color={on ? c.primary : c.ink}>{label}</Txt>
              </Pressable>
            );
          })}
        </View>
        <View style={{ marginTop: 12, gap: 6 }}>
          {draft ? <Txt size={13} color={c.muted}>{t('retrySaved')}</Txt> : null}
          {draft && error && !busy ? <Pressable onPress={startOver} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' }}><Txt size={14} weight="bold" color={c.primary}>{t('startOver')}</Txt></Pressable> : null}
          {progress != null ? <Txt size={13} color={c.muted}>{t('uploading', { p: progress })}</Txt> : null}
          <ErrorLine>{error}</ErrorLine>
        </View>
        <View style={{ flex: 1, minHeight: 20 }} />
        <View style={st.actionsRow}>
          <Btn label={t('cancel')} tone="tint" onPress={cancel} disabled={busy} size={16} style={{ flex: 1 }} />
          <Btn label={t('saveReceipt')} onPress={save} loading={busy} disabled={!ready || scan === 'reading'} style={{ flex: 2 }} />
        </View>
      </ScrollView>
    </Sheet>
  );
}

const SOS_TYPES = [['BREAKDOWN', 'sosBreakdown'], ['ACCIDENT', 'sosAccident'], ['MEDICAL', 'sosMedical'], ['THEFT', 'sosTheft']];
const FIX_MAX_AGE = 120000;
const HOLD_MS = 2000;

/** Recent fix + a place name from the phone's own geocoder (one lookup, on open). */
function useSosFix() {
  const [fix, setFix] = useState(null);
  const [place, setPlace] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') ({ status } = await Location.requestForegroundPermissionsAsync());
        if (status !== 'granted') { if (alive) setFailed(true); return; }
        const last = await Location.getLastKnownPositionAsync({ maxAge: FIX_MAX_AGE, requiredAccuracy: 100 }).catch(() => null);
        if (alive && last?.coords && !last.mocked) setFix(last);
        const now = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (!alive || !now?.coords || now.mocked) return;
        setFix(now);
        const [address] = await Location.reverseGeocodeAsync({ latitude: now.coords.latitude, longitude: now.coords.longitude }).catch(() => []);
        if (alive && address) setPlace([address.street || address.name, address.district || address.subregion || address.city].filter(Boolean).join('|'));
      } catch { if (alive) setFailed(true); }
    })();
    return () => { alive = false; };
  }, []);
  return { fix, place, failed };
}

/**
 * 12 SOS sheet. Holding the red button for 2 s sends the report, so it cannot
 * be sent by a brush. The report is saved locally before sending and retried
 * with the same id, so a retry never creates a second emergency.
 */
export function SosSheet({ navigation }) {
  const { t } = useDriverCopy();
  const { user } = useAuth();
  const { service, mutate } = useDriverData();
  const orgId = typeof user.orgId === 'object' ? user.orgId?._id : user.orgId;
  const draftKey = `sos:${orgId}:${user._id}`;
  const draft = useRef(null);
  const inFlight = useRef(false);
  const hold = useRef(new Animated.Value(0)).current;
  const holding = useRef(null);
  const [type, setType] = useState('BREAKDOWN');
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [sent, setSent] = useState(null);
  const [error, setError] = useState('');
  const [ownerError, setOwnerError] = useState('');
  const { fix, place, failed } = useSosFix();
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(draftKey).then((stored) => {
      if (!active) return;
      if (stored) {
        const saved = JSON.parse(stored);
        draft.current = saved; setLocked(true); setType(saved.payload.type);
        if (saved.result) setSent(saved.result);
      }
      setReady(true);
    }).catch(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [draftKey]);

  async function submit() {
    if (!ready || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      if (!draft.current) {
        const coords = fix && !fix.mocked && Date.now() - fix.timestamp <= FIX_MAX_AGE ? fix.coords : null;
        draft.current = { payload: {
          clientIncidentId: Crypto.randomUUID(), type, reportedAt: new Date().toISOString(),
          ...(coords && { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }),
        } };
        setLocked(true);
        await AsyncStorage.setItem(draftKey, JSON.stringify(draft.current));
      }
      const result = await service.reportSos(draft.current.payload);
      draft.current.result = result;
      await AsyncStorage.setItem(draftKey, JSON.stringify(draft.current)).catch(() => {});
      setSent(result);
      mutate(() => Promise.resolve()).catch(() => {});
    } catch {
      setError(t('sosFailed'));
    } finally { inFlight.current = false; setBusy(false); }
  }
  const startHold = () => {
    if (busy || !ready) return;
    setPressing(true);
    holding.current = Animated.timing(hold, { toValue: 1, duration: HOLD_MS, easing: Easing.linear, useNativeDriver: false });
    holding.current.start(({ finished }) => { setPressing(false); if (finished) { hold.setValue(0); submit(); } });
  };
  const endHold = () => {
    if (!holding.current) return;
    holding.current.stop(); holding.current = null;
    Animated.timing(hold, { toValue: 0, duration: 150, useNativeDriver: false }).start();
  };
  async function startNew() {
    await AsyncStorage.removeItem(draftKey).catch(() => {});
    draft.current = null; setLocked(false); setSent(null); setError('');
  }
  const ringOwner = async () => {
    setOwnerError('');
    try { if (!(await callOwner(service))) setOwnerError(t('ownerUnavailable')); }
    catch { setOwnerError(t('ownerUnavailable')); }
  };
  const placeParts = place ? place.split('|') : [];
  const placeText = placeParts.length === 2 ? `${placeParts[0]}, ${t('sosNear', { place: placeParts[1] })}` : placeParts[0] || null;
  const accuracy = Number.isFinite(fix?.coords?.accuracy) ? `±${Math.round(fix.coords.accuracy)} m` : null;
  const where = fix
    ? [placeText || `${fix.coords.latitude.toFixed(5)}, ${fix.coords.longitude.toFixed(5)}`, accuracy].filter(Boolean).join(' · ')
    : failed ? t('sosNoFix') : t('sosLocating');
  const holdLabel = busy ? t('sosSending') : pressing ? t('sosHolding') : locked && !sent ? t('sosRetry') : t('sosHold');
  return (
    <Sheet top={24} onClose={() => navigation.goBack()}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        <Txt display size={26} weight="extrabold" track={-0.03} color={c.sosText} style={{ marginTop: 16 }} accessibilityRole="header">{sent ? t('sosSentTitle') : t('sosTitle')}</Txt>
        <Txt size={14} color={c.muted} style={{ marginTop: 4 }}>{sent ? t('sosSentBody', { number: sent.incidentNumber || '' }) : t('sosSub')}</Txt>
        {!sent ? (
          <>
            <Txt size={14} weight="semibold" style={{ marginTop: 14, marginBottom: 8 }}>{t('sosWhat')}</Txt>
            <View style={{ gap: 8 }} accessibilityRole="radiogroup">
              {SOS_TYPES.map(([value, key]) => {
                const on = type === value;
                return (
                  <Pressable key={value} onPress={() => !locked && setType(value)} disabled={locked && !on} accessibilityRole="radio" accessibilityState={{ checked: on, disabled: locked }} style={[st.sosType, on ? st.sosTypeOn : st.sosTypeOff, locked && !on && { opacity: 0.5 }]}>
                    <Txt size={16} weight="semibold" style={{ flex: 1 }}>{t(key)}</Txt>
                    <View style={[st.radio, on && st.radioOn]}>{on ? <View style={st.radioDot} /> : null}</View>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
        <View style={st.whereRow} accessibilityLiveRegion="polite">
          <PinIcon color={c.primary} />
          <Txt size={14} style={{ flex: 1 }}>{where}</Txt>
        </View>
        <View style={{ marginTop: 8 }}><ErrorLine>{error || ownerError}</ErrorLine></View>
        <View style={{ flex: 1, minHeight: 16 }} />
        {sent ? (
          <Btn label={t('sosNew')} tone="danger" onPress={startNew} height={52} size={16} />
        ) : (
          <Pressable
            onPressIn={startHold}
            onPressOut={endHold}
            disabled={busy || !ready}
            accessibilityRole="button"
            accessibilityLabel={t('sosHold')}
            // Screen-reader users cannot time a 2-second hold; their double-tap
            // is already a deliberate confirmation, so it sends directly.
            accessibilityActions={[{ name: 'activate' }]}
            onAccessibilityAction={(event) => { if (event.nativeEvent.actionName === 'activate') submit(); }}
            style={st.holdBtn}
          >
            <Animated.View style={[st.holdFill, { width: hold.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
            <Txt size={18} weight="extrabold" color="#fff" center>{holdLabel}</Txt>
          </Pressable>
        )}
        <View style={st.callRow}>
          <Btn label={t('callOwner')} tone="danger" height={50} size={16} onPress={ringOwner} style={{ flex: 1, borderRadius: r.lg }} />
          <Btn label={t('call112')} tone="danger" height={50} size={16} onPress={() => Linking.openURL('tel:112').catch(() => {})} style={{ flex: 1, borderRadius: r.lg }} />
        </View>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" style={st.closeLink}>
          <Txt size={15} weight="bold" color={c.primary} center>{t('close')}</Txt>
        </Pressable>
      </ScrollView>
    </Sheet>
  );
}

const st = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: c.scrim },
  sheet: { flex: 1, backgroundColor: c.surface, borderTopLeftRadius: r.sheet, borderTopRightRadius: r.sheet, paddingTop: 10, paddingHorizontal: 20 },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 5, backgroundColor: c.track },
  pickRow: { marginTop: 16, flexDirection: 'row', gap: 10 },
  pickBtn: { flex: 1, minHeight: 96, alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: r.card, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
  pickPrimary: { borderWidth: 2, borderColor: c.primary, backgroundColor: c.tint },
  fileRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: r.xl, backgroundColor: c.bg },
  thumb: { width: 56, height: 72, borderRadius: 8, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, paddingVertical: 8, paddingHorizontal: 7, gap: 5 },
  thumbLine: { height: 4, borderRadius: 2, backgroundColor: c.track },
  retake: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  fieldRow: { marginTop: 14, flexDirection: 'row', gap: 10 },
  input: { height: 52, paddingHorizontal: 12, borderRadius: r.md, borderWidth: 1, borderColor: c.inputBorder, fontSize: 17, fontWeight: '600', color: c.ink, backgroundColor: c.surface },
  fillRow: { flexDirection: 'row', gap: 10 },
  fillChip: { flex: 1, minHeight: 48, borderRadius: r.md, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface },
  fillChipOn: { borderWidth: 2, borderColor: c.primary, backgroundColor: c.tint },
  actionsRow: { flexDirection: 'row', gap: 10 },
  sosType: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 8, paddingHorizontal: 14, borderRadius: r.lg },
  sosTypeOn: { backgroundColor: c.sosSelectedBg, borderWidth: 2, borderColor: c.sosSelectedBorder },
  sosTypeOff: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.inputBorder, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: c.sos },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: c.sos },
  whereRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: r.lg, backgroundColor: c.bg },
  holdBtn: { minHeight: 60, borderRadius: r.card, backgroundColor: c.sos, justifyContent: 'center', paddingHorizontal: 12, overflow: 'hidden' },
  holdFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#7E1520' },
  callRow: { marginTop: 10, flexDirection: 'row', gap: 10 },
  closeLink: { marginTop: 12, minHeight: 44, justifyContent: 'center' },
});
