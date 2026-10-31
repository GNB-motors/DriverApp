import React, { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { AppText, Card } from '../../components/ui';
import { useLanguage } from '../../context/LanguageContext';
import { DriverInbox } from '../screens/DriverScreens';
import { OperationalForm, RecordList, RecordDetail } from '../workflows/OperationalScreens';
import { FleetRecords } from '../workflows/FleetOperationalScreens';
import { ActionButton, ExperiencePage, UnavailableScreen, useExperienceCopy } from './ExperienceUI';

export function ExperienceSettings({ navigation }) {
  const c = useExperienceCopy();
  const { language, setLanguage } = useLanguage();
  const [error, setError] = useState('');
  useEffect(() => () => { Speech.stop(); }, []);
  const testVoice = async () => {
    setError('');
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const code = ['hi', 'bn'].includes(language) ? language : 'en';
      const voice = voices.find(item => item.language?.toLowerCase().startsWith(code));
      if (!voice) { setError(c('voiceUnavailable')); return; }
      await Speech.stop();
      Speech.speak(c('testPhrase'), { language: code, voice: voice.identifier, onError: () => setError(c('voiceFailed')) });
    } catch { setError(c('voiceFailed')); }
  };
  return <ExperiencePage title={c('settings')} navigation={navigation}>
    <Card style={{ gap: 12 }}><AppText variant="h3">{c('language')}</AppText>{[['en', 'English'], ['hi', 'हिन्दी'], ['bn', 'বাংলা']].map(([value, label]) => <ActionButton key={value} label={label} tone="secondary" selected={language === value} onPress={() => setLanguage(value)} />)}</Card>
    <ActionButton label={c('testVoice')} onPress={testVoice} />{error ? <AppText accessibilityRole="alert">{error}</AppText> : null}
    <ActionButton label={c('battery')} tone="secondary" onPress={() => navigation.navigate('Battery help')} />
  </ExperiencePage>;
}
export function BatteryHelp({ navigation }) {
  const c = useExperienceCopy(); const [error, setError] = useState('');
  return <ExperiencePage title={c('battery')} navigation={navigation}><AppText>{c('batterySteps')}</AppText><ActionButton label={c('openSettings')} disabled={Platform.OS === 'web'} onPress={async () => { try { await Linking.openSettings(); } catch { setError(c('settingsOpenFailed')); } }} />{error ? <AppText accessibilityRole="alert">{error}</AppText> : null}</ExperiencePage>;
}
// These aliases use the existing authenticated, persisted workflows.
export function UniversalCapture(props) { return <OperationalForm {...props} route={{ ...props.route, name: 'Upload document', params: { scope: 'personal' } }} />; }
export function FuelEntry(props) { return <OperationalForm {...props} route={{ ...props.route, name: 'Add fuel' }} />; }
export function PaperList(props) { return <RecordList {...props} route={{ ...props.route, params: { kind: 'documents' } }} />; }
export function PaperDetail(props) { return props.route?.params?.id ? <RecordDetail {...props} route={{ ...props.route, params: { ...props.route.params, kind: 'documents' } }} /> : <UnavailableScreen {...props} />; }
export function DriverPapersReview(props) { return <FleetRecords {...props} route={{ ...props.route, name: 'Fleet documents' }} />; }
export const ExperienceInbox = DriverInbox;
export function DocumentsExpiry(props) { return <RecordList {...props} route={{ ...props.route, params: { kind: 'documents' } }} />; }
