import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { c, r } from '../theme';
import { Btn, Card, ErrorLine, Page, StatusList, TitleBlock, Txt, useDriverCopy } from '../kit';
import { ArrowUpIcon, CheckIcon, ExternalIcon, PinOffIcon, WarnIcon } from '../icons';
import { openFixSettings, requestSetupPermissions, useDriverSetup } from '../permissions';
import { useDriverData } from '../../telematics/context/DriverDataContext';
import { AppHeader } from '../shell';

function Benefit({ children }) {
  return (
    <View style={st.benefit}>
      <View style={st.benefitTick}><CheckIcon color={c.okInk} /></View>
      <Txt size={15} style={{ flex: 1 }}>{children}</Txt>
    </View>
  );
}

function Step({ n, title, sub, active, first }) {
  return (
    <View style={[st.stepRow, !first && st.divider]}>
      <View style={[st.stepNum, !active && st.stepNumIdle]}><Txt size={14} weight="extrabold" color={active ? '#fff' : c.primary}>{n}</Txt></View>
      <View style={{ flex: 1 }}>
        <Txt size={15} weight="bold">{title}</Txt>
        <Txt size={13} color={c.muted}>{sub}</Txt>
      </View>
    </View>
  );
}

/** 05 Location setup — explains why, then asks Android's own popups once. */
export function LocationSetupScreen({ navigation }) {
  const { t } = useDriverCopy();
  const setup = useDriverSetup();
  const [busy, setBusy] = useState(false);
  const onContinue = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const status = await requestSetupPermissions();
      await setup.refresh();
      navigation.navigate(status.ok ? 'Location ready' : 'Location guide', { mode: 'setup' });
    } finally { setBusy(false); }
  };
  return (
    <Page scroll top={28} bottom={32}>
      <StatusBar style="dark" />
      <View style={st.between}>
        <Txt size={14} weight="bold" color={c.muted}>{t('setupStep')}</Txt>
        <View style={{ flexDirection: 'row', gap: 6 }}>{[0, 1, 2].map((key) => <View key={key} style={st.progressSeg} />)}</View>
      </View>
      <View style={st.illustration}>
        <Svg width="100%" height={176} viewBox="0 0 350 176" preserveAspectRatio="xMidYMid slice">
          <Path d="M-10 140 C 70 120, 90 60, 170 70 S 290 30, 360 40" stroke="#fff" strokeWidth={18} strokeLinecap="round" fill="none" />
          <Path d="M-10 140 C 70 120, 90 60, 170 70 S 290 30, 360 40" stroke="#6D8AF3" strokeWidth={3} strokeDasharray="2 10" strokeLinecap="round" fill="none" />
          <Circle cx="175" cy="70" r="46" fill="#2F58EE" fillOpacity={0.12} />
          <Circle cx="175" cy="70" r="26" fill="#2F58EE" fillOpacity={0.2} />
          <Path d="M175 44c-11 0-19 8-19 18 0 14 19 32 19 32s19-18 19-32c0-10-8-18-19-18z" fill="#213EA7" />
          <Circle cx="175" cy="62" r="7" fill="#fff" />
        </Svg>
      </View>
      <TitleBlock title={t('locTitle')} sub={t('locSub')} size={28} top={22} />
      <View style={{ marginTop: 18, gap: 10 }}>
        <Benefit>{t('locBenefit1')}</Benefit>
        <Benefit>{t('locBenefit2')}</Benefit>
        <Benefit>{t('locBenefit3')}</Benefit>
      </View>
      <Card style={{ marginTop: 20, padding: 0 }}>
        <Step n={1} title={t('locStepLocation')} sub={t('locStepLocationSub')} active first />
        <Step n={2} title={t('locStepNotif')} sub={t('locStepNotifSub')} />
      </Card>
      <View style={{ flex: 1, minHeight: 24 }} />
      <Btn label={t('continue')} onPress={onContinue} loading={busy} />
      <Txt size={13} color={c.muted} center style={{ marginTop: 12 }}>
        {t('locPrivacy')}
        <Txt size={13} weight="bold" color={c.primary} accessibilityRole="link" onPress={() => Alert.alert(t('locHow'), t('locHowBody'))}>{t('locHow')}</Txt>
      </Txt>
    </Page>
  );
}

function GuideStep({ n, children, extra }) {
  return (
    <View style={st.guideStep}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={st.stepNum}><Txt size={14} weight="extrabold" color="#fff">{n}</Txt></View>
        <Txt size={15} style={{ flex: 1 }}>{children}</Txt>
      </View>
      {extra}
    </View>
  );
}

function OptionMock({ t }) {
  const idle = [t('optWhileUsing'), t('optAsk'), t('optDeny')];
  return (
    <View style={st.mock} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={st.mockOn}>
        <View style={st.mockRadioOn} />
        <Txt size={14} weight="bold" color={c.okInk} style={{ flex: 1 }}>{t('optAlways')}</Txt>
        <ArrowUpIcon color={c.okInk} />
      </View>
      {idle.map((label) => (
        <View key={label} style={st.mockOff}><View style={st.mockRadio} /><Txt size={14} color={c.muted}>{label}</Txt></View>
      ))}
    </View>
  );
}

/**
 * 06 How to allow "All the time". Coming back from settings re-checks
 * silently: fixed → 07 (setup) or back to Home (guard). Still wrong → stay and
 * show the red line. The system popup is never asked again from here.
 */
export function LocationGuideScreen({ navigation, route }) {
  const mode = route.params?.mode || 'setup';
  const { t } = useDriverCopy();
  const setup = useDriverSetup();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const leaving = useRef(false);
  const status = setup.status;
  useEffect(() => {
    if (!status.ok || leaving.current) return;
    leaving.current = true;
    if (mode === 'setup') navigation.replace('Location ready');
    else navigation.goBack();
  }, [status.ok, mode, navigation]);
  const { refresh } = setup;
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  const checkAgain = async () => {
    setBusy(true);
    await setup.refresh();
    setChecked(true);
    setBusy(false);
  };
  const banner = status.location === 'none' ? t('guideBannerOff') : t('guideBanner');
  const stillLine = !checked || status.ok ? null
    : !status.locationOk ? (status.location === 'none' ? t('stillOff') : t('stillWhileUsing'))
      : !status.gpsOn ? t('gpsOffLine') : t('notifOffLine');
  return (
    <Page scroll top={24} bottom={28}>
      <StatusBar style="dark" />
      <View style={st.banner} accessibilityRole="alert">
        <WarnIcon color={c.badInk} />
        <Txt size={14} weight="semibold" color={c.badInk} style={{ flex: 1 }}>{status.locationOk ? (status.gpsOn ? t('notifOffLine') : t('gpsOffLine')) : banner}</Txt>
      </View>
      <TitleBlock title={t('guideTitle')} sub={t('guideSub')} size={26} top={18} />
      <View style={{ marginTop: 18, gap: 10 }}>
        <GuideStep n={1}>{t('guideStep1Pre')}<Txt size={15} weight="bold">{t('guideStep1Bold')}</Txt>{t('guideStep1Post')}</GuideStep>
        <GuideStep n={2}>{t('guideStep2Pre')}<Txt size={15} weight="bold">{t('guideStep2A')}</Txt> → <Txt size={15} weight="bold">{t('guideStep2B')}</Txt>{t('guideStep2Post')}</GuideStep>
        <GuideStep n={3} extra={<OptionMock t={t} />}>{t('guideStep3Pre')}<Txt size={15} weight="bold">{t('guideStep3Bold')}</Txt>{t('guideStep3Post')}</GuideStep>
      </View>
      <Txt size={14} color={c.muted} style={{ marginTop: 12 }}>{t('guideComeBack')}</Txt>
      {stillLine ? <View style={{ marginTop: 10 }}><ErrorLine>{stillLine}</ErrorLine></View> : null}
      <View style={{ flex: 1, minHeight: 24 }} />
      <Btn label={t('openSettings')} onPress={() => openFixSettings(status)} iconRight={<ExternalIcon color="#fff" />} />
      <Btn label={t('checkAgain')} tone="tint" height={48} size={16} onPress={checkAgain} loading={busy} style={{ marginTop: 10, borderRadius: r.lg }} />
    </Page>
  );
}

/** 07 All set — reached only once every check passes. */
export function LocationReadyScreen({ navigation }) {
  const { t } = useDriverCopy();
  const setup = useDriverSetup();
  const { tracking } = useDriverData();
  const [busy, setBusy] = useState(false);
  const goHome = async () => {
    setBusy(true);
    await setup.markDone();
    if (tracking.mode === 'off' && !tracking.busy) tracking.start(tracking.canBackground ? 'background' : 'foreground', false).catch(() => {});
    navigation.reset({ index: 0, routes: [{ name: 'Driver tabs' }] });
  };
  return (
    <Page top={28} bottom={32}>
      <StatusBar style="dark" />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={st.readyOuter}><View style={st.readyInner}><CheckIcon size={36} color="#fff" width={2.8} /></View></View>
        <Txt display size={30} weight="extrabold" track={-0.03} center style={{ marginTop: 24 }} accessibilityRole="header">{t('readyTitle')}</Txt>
        <Txt size={15} color={c.muted} center style={{ marginTop: 8, maxWidth: 290 }}>{t('readySub')}</Txt>
        <View style={{ marginTop: 28, alignSelf: 'stretch' }}>
          <StatusList rows={[
            { key: 'loc', label: t('location'), value: t('allTheTime'), ok: true },
            { key: 'gps', label: t('phoneGps'), value: t('on'), ok: true },
            { key: 'notif', label: t('notifications'), value: t('allowed'), ok: true },
          ]} />
        </View>
      </View>
      <Btn label={t('goHome')} onPress={goHome} loading={busy} />
    </Page>
  );
}

/**
 * 08 Permission changed. Covers Home whenever a check fails after setup; the
 * header keeps SOS one tap away. It closes by itself once everything passes,
 * because the tab shell only renders it while `status.ok` is false.
 */
export function PermissionLostScreen({ navigation }) {
  const { t } = useDriverCopy();
  const { status } = useDriverSetup();
  const { data } = useDriverData();
  const openTrip = (data?.trips || []).find((trip) => trip.status === 'OPEN');
  const rows = [
    status.locationOk
      ? { key: 'loc', label: t('location'), value: status.location === 'always' ? t('allTheTime') : t('whileUsing'), ok: true }
      : { key: 'loc', label: t('location'), sub: status.location === 'none' ? t('nowNotAllowed') : t('nowWhileUsing'), value: t('fix'), ok: false, onPress: () => openFixSettings({ ...status, locationOk: false }) },
    status.gpsOn
      ? { key: 'gps', label: t('phoneGps'), value: t('on'), ok: true }
      : { key: 'gps', label: t('phoneGps'), sub: t('off'), value: t('fix'), ok: false, onPress: () => openFixSettings({ ...status, locationOk: true, gpsOn: false }) },
    status.notifications
      ? { key: 'notif', label: t('notifications'), value: t('allowed'), ok: true }
      : { key: 'notif', label: t('notifications'), sub: t('off'), value: t('fix'), ok: false, onPress: () => openFixSettings({ ...status, locationOk: true, gpsOn: true, notifications: false }) },
  ];
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppHeader navigation={navigation} locationOk={false} />
      <Page scroll insetTop={false} top={28} bottom={28}>
        <View style={st.lostIcon}><PinOffIcon color={c.badInk} /></View>
        <Txt display size={28} weight="extrabold" track={-0.03} style={{ marginTop: 18 }} accessibilityRole="header">{t('lostTitle')}</Txt>
        <Txt size={15} color={c.muted} style={{ marginTop: 8 }}>
          {openTrip ? <>{t('lostSubTripPre')}<Txt size={15} weight="bold">{`${openTrip.from} → ${openTrip.to}`}</Txt>{t('lostSubTripPost')}</> : t('lostSub')}
        </Txt>
        <View style={{ marginTop: 22 }}><StatusList rows={rows} /></View>
        {!status.locationOk ? <Txt size={14} color={c.muted} style={{ marginTop: 14 }}>{t('lostPath')}<Txt size={14} weight="bold">{t('optAlways')}</Txt></Txt> : null}
        <View style={{ flex: 1, minHeight: 24 }} />
        <Btn label={t('openSettings')} onPress={() => openFixSettings(status)} iconRight={<ExternalIcon color="#fff" />} />
        <Pressable onPress={() => navigation.navigate('Location guide', { mode: 'guard' })} accessibilityRole="button" style={st.textLink}>
          <Txt size={15} weight="bold" color={c.primary} center>{t('showMeHow')}</Txt>
        </Pressable>
      </Page>
    </View>
  );
}

const st = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressSeg: { width: 22, height: 6, borderRadius: 6, backgroundColor: c.primary },
  illustration: { marginTop: 24, height: 176, borderRadius: 24, backgroundColor: c.tint, borderWidth: 1, borderColor: c.tintBorder, overflow: 'hidden' },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitTick: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.okBg, alignItems: 'center', justifyContent: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  divider: { borderTopWidth: 1, borderTopColor: c.border },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  stepNumIdle: { backgroundColor: c.tint },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: r.lg, backgroundColor: c.badBg, borderWidth: 1, borderColor: c.badBorder },
  guideStep: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: r.xl, paddingVertical: 12, paddingHorizontal: 14 },
  mock: { marginTop: 12, marginLeft: 40, borderRadius: r.md, backgroundColor: c.bg, paddingVertical: 6, paddingHorizontal: 10 },
  mockOn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 6, borderRadius: r.sm, backgroundColor: c.okBg },
  mockOff: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 6 },
  mockRadioOn: { width: 18, height: 18, borderRadius: 9, borderWidth: 5, borderColor: c.okInk, backgroundColor: '#fff' },
  mockRadio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: c.inputBorder },
  readyOuter: { width: 112, height: 112, borderRadius: 56, backgroundColor: c.okBg, alignItems: 'center', justifyContent: 'center' },
  readyInner: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.okDot, alignItems: 'center', justifyContent: 'center' },
  lostIcon: { width: 72, height: 72, borderRadius: 22, backgroundColor: c.badBg, alignItems: 'center', justifyContent: 'center' },
  textLink: { marginTop: 12, minHeight: 44, justifyContent: 'center' },
});
