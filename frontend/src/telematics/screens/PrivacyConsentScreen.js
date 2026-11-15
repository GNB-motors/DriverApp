import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { AppText, Button, Card, colors } from '../../components/ui';
import WorkspacePage from '../components/WorkspacePage';
import { useDriverData } from '../context/DriverDataContext';
import { stopGuidanceRuntime, useGuidanceRuntime } from '../guidance/GuidanceRuntimeContext';

export default function PrivacyConsentScreen({ navigation }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { service, tracking } = useDriverData();
  const runtime = useGuidanceRuntime();
  const [consent, setConsent] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const operation = useRef(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    let active = true;
    setConsent(null); setAccepted(false); setError('');
    service.consent(language || 'en').then(result => {
      if (active) setConsent(result);
    }).catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [service, language, revision]);

  const notice = consent?.notice;
  const granted = consent?.needsConsent === false && !!consent?.state?.grantedAt && !consent?.state?.withdrawnAt;
  async function decide(withdraw) {
    if (busy) return;
    setBusy(true); setError('');
    const signature = JSON.stringify([withdraw, notice?.version, notice?.language, consent?.state]);
    if (operation.current?.signature !== signature)
      operation.current = { signature, key: Crypto.randomUUID() };
    try {
      const result = withdraw
        ? await service.withdrawConsent(operation.current.key)
        : await service.grantConsent({ noticeVersion: notice.version, language: notice.language }, operation.current.key);
      const key = `navigation-consent:${user.orgId?._id || user.orgId}:${user._id}`;
      if (withdraw) {
        stopGuidanceRuntime(runtime);
        await tracking.stop();
        await AsyncStorage.removeItem(key);
      } else if (result.needsConsent === false && result.state?.grantedAt && !result.state?.withdrawnAt) {
        await AsyncStorage.setItem(key, JSON.stringify({ verifiedAt: Date.now(), noticeVersion: result.state.noticeVersion }));
      }
      if (mounted.current) { setConsent(result); setAccepted(false); }
      operation.current = null;
    } catch (failure) {
      if (mounted.current) setError(failure.message);
    } finally { if (mounted.current) setBusy(false); }
  }

  return <WorkspacePage navigation={navigation} title="Privacy & consent" label="HIGHWAY SAHAYAK">
    <View style={{ gap: 16 }}>
      {!!error && <AppText accessibilityRole="alert" color={colors.error}>{error}</AppText>}
      {!consent ? <>
        <AppText muted>{error ? 'The consent notice could not be loaded.' : 'Loading your fleet’s consent notice…'}</AppText>
        {!!error && <Button label="Retry" onPress={() => setRevision(value => value + 1)} />}
      </> : <>
        <AppText weight="semibold">{granted ? 'Location consent is active.' : consent.state?.withdrawnAt ? 'Location consent is withdrawn.' : 'Review the notice before choosing.'}</AppText>
        {notice?.version ? <Card>
          <AppText variant="h3">{notice.title}</AppText>
          <AppText muted>Version {notice.version} · {notice.language}</AppText>
          {!!notice.body && <AppText>{notice.body}</AppText>}
          {(notice.items || []).map((item, index) => <View key={`${item.dataClass}:${index}`} style={{ marginTop: 12 }}>
            <AppText weight="semibold">{item.dataClass}</AppText>
            <AppText>{item.purpose}</AppText>
          </View>)}
        </Card> : <AppText muted>Your fleet has not published a consent notice yet. Contact your manager.</AppText>}
        {!granted && !!notice?.version && <>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: accepted, disabled: busy }} disabled={busy} onPress={() => setAccepted(value => !value)} style={{ paddingVertical: 16 }}>
            <AppText weight="semibold">{accepted ? '☑' : '☐'} I have read this notice and agree to the uses described above.</AppText>
          </Pressable>
          <Button label="Agree to this notice" disabled={!accepted} loading={busy} onPress={() => decide(false)} />
        </>}
        {!!consent.state?.grantedAt && !consent.state?.withdrawnAt && <>
          <AppText muted>Withdrawing stops navigation and location sharing on this phone.</AppText>
          <Button label="Withdraw location consent" variant="danger" loading={busy} onPress={() => decide(true)} />
        </>}
      </>}
    </View>
  </WorkspacePage>;
}
