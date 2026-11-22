import React, { useEffect, useState } from 'react';
import { Linking, Platform, View, TouchableOpacity, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card, colors, radius, spacing, Badge } from '../../components/ui';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { DriverInbox } from '../screens/DriverScreens';
import { OperationalForm, RecordList, RecordDetail } from '../workflows/OperationalScreens';
import { FleetRecords } from '../workflows/FleetOperationalScreens';
import { ActionButton, ExperiencePage, UnavailableScreen, useExperienceCopy } from './ExperienceUI';

export function ExperienceSettings({ navigation }) {
  const c = useExperienceCopy();
  const { language, setLanguage } = useLanguage();
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => { Speech.stop(); }, []);

  const testVoice = async () => {
    setError('');
    setPlaying(true);
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const code = ['hi', 'bn'].includes(language) ? language : 'en';
      const voice = voices.find(item => item.language?.toLowerCase().startsWith(code));
      if (!voice) {
        setError(c('voiceUnavailable'));
        setPlaying(false);
        return;
      }
      await Speech.stop();
      Speech.speak(c('testPhrase'), {
        language: code,
        voice: voice.identifier,
        onDone: () => setPlaying(false),
        onError: () => {
          setError(c('voiceFailed'));
          setPlaying(false);
        },
      });
    } catch {
      setError(c('voiceFailed'));
      setPlaying(false);
    }
  };

  const LANGUAGES = [
    { code: 'en', title: 'English', subtitle: 'English · Latin Script', glyph: 'A' },
    { code: 'hi', title: 'हिन्दी', subtitle: 'Hindi · देवनागरी लिपि', glyph: 'अ' },
    { code: 'bn', title: 'বাংলা', subtitle: 'Bengali · বাংলা লিপি', glyph: 'অ' },
  ];

  return (
    <ExperiencePage
      title={c('settings')}
      subtitle="Display language, voice guidance and background permissions."
      navigation={navigation}
    >
      {/* ── 1. DISPLAY LANGUAGE ── */}
      <Card style={{ gap: 14 }}>
        <View>
          <AppText variant="h3" weight="bold">{c('language')}</AppText>
          <AppText variant="caption" muted style={{ marginTop: 2 }}>
            Applied immediately across the whole app including numbers, dates, and reports.
          </AppText>
        </View>

        <View style={{ gap: 10 }}>
          {LANGUAGES.map((item) => {
            const isSelected = language === item.code || (!language && item.code === 'en');
            return (
              <TouchableOpacity
                key={item.code}
                onPress={() => setLanguage(item.code)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 14,
                  borderRadius: radius.md,
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected ? colors.primary : colors.border,
                  backgroundColor: isSelected ? colors.blueTint : colors.surface,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: isSelected ? colors.primary : '#F1F5F9',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AppText
                      weight="bold"
                      color={isSelected ? colors.white : '#475569'}
                      style={{ fontSize: 16 }}
                    >
                      {item.glyph}
                    </AppText>
                  </View>
                  <View>
                    <AppText weight="bold" color={isSelected ? colors.primaryDeep : colors.text}>
                      {item.title}
                    </AppText>
                    <AppText variant="caption" muted>
                      {item.subtitle}
                    </AppText>
                  </View>
                </View>

                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                ) : (
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: '#CBD5E1',
                    }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* ── 2. SPOKEN GUIDANCE & VOICE ── */}
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="volume-high-outline" size={20} color={colors.primary} />
          <AppText variant="h3" weight="bold">Spoken Guidance & Audio</AppText>
        </View>
        <AppText variant="small" muted>
          Listen to spoken summaries of your morning reports and fleet notifications in your chosen language.
        </AppText>
        <ActionButton
          label={playing ? "Playing voice sample…" : c('testVoice')}
          onPress={testVoice}
          disabled={playing}
        />
        {error ? <AppText color={colors.error} variant="caption">{error}</AppText> : null}
      </Card>

      {/* ── 3. BACKGROUND ALERTS & BATTERY OPTIMIZATION ── */}
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="battery-charging-outline" size={20} color="#D97706" />
          <AppText variant="h3" weight="bold">Background Alerts & Battery</AppText>
        </View>
        <AppText variant="small" muted>
          Ensure real-time push alerts, emergency SOS alarms, and background updates are never delayed or put to sleep by your device.
        </AppText>
        <ActionButton
          label="Review Battery & Alert Restrictions"
          tone="secondary"
          onPress={() => navigation.navigate('Battery help')}
        />
      </Card>

      {user?.role === 'DRIVER' && (
        <>
          <ActionButton label="Privacy & consent" tone="secondary" onPress={() => navigation.navigate('Privacy & consent')} />
          <ActionButton label="Location sharing" tone="secondary" onPress={() => navigation.navigate('Location sharing')} />
        </>
      )}
    </ExperiencePage>
  );
}

export function BatteryHelp({ navigation }) {
  const [error, setError] = useState('');

  return (
    <ExperiencePage
      title="Background Alerts & Battery"
      subtitle="Keep fleet alerts and live location running without sleep restrictions."
      navigation={navigation}
    >
      {/* ── 1. WHAT IS THIS & WHY IS IT NEEDED ── */}
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
          <AppText variant="h3" weight="bold">Why Is This Needed?</AppText>
        </View>
        <AppText variant="small" muted>
          Modern Android devices (Samsung, Xiaomi/Redmi, Vivo, Oppo) automatically restrict or kill background apps to conserve battery life.
        </AppText>
        <AppText variant="small" muted>
          If GNB Motors is restricted by Android battery saver, you may experience:
        </AppText>
        <View style={{ gap: 8, paddingLeft: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <Ionicons name="alert-circle-outline" size={16} color="#DC2626" style={{ marginTop: 2 }} />
            <AppText variant="caption" style={{ flex: 1, lineHeight: 18 }}>
              <AppText variant="caption" weight="bold" color="#DC2626">Delayed Push Alerts: </AppText>
              SOS alarms, fuel theft, and vehicle speed violations won’t ring on your phone until you unlock it and open the app.
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <Ionicons name="navigate-outline" size={16} color="#D97706" style={{ marginTop: 2 }} />
            <AppText variant="caption" style={{ flex: 1, lineHeight: 18 }}>
              <AppText variant="caption" weight="bold" color="#D97706">Driver GPS Stops: </AppText>
              For drivers on trips, phone GPS location sharing will freeze when the phone screen turns off.
            </AppText>
          </View>
        </View>
      </Card>

      {/* ── 2. SIMPLE STEPS TO FIX ── */}
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="checkmark-done-circle-outline" size={22} color="#16A34A" />
          <AppText variant="h3" weight="bold">How to Disable Battery Restrictions</AppText>
        </View>

        {[
          { step: '1', title: 'Open App Settings', desc: 'Tap the button below to open this app’s system settings.' },
          { step: '2', title: 'Tap Battery / App Battery Usage', desc: 'Find the Battery or Battery Saver section.' },
          { step: '3', title: 'Select "Unrestricted"', desc: 'Choose "Unrestricted", "No restrictions", or "Don\'t optimize".' },
          { step: '4', title: 'Enable Autostart (Xiaomi / Vivo / Oppo)', desc: 'If available, turn ON "Autostart" and "Allow background activity".' },
        ].map((item) => (
          <View key={item.step} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: '#1E293B',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 2,
              }}
            >
              <AppText variant="caption" weight="bold" color="#FFFFFF">
                {item.step}
              </AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="small" weight="bold">{item.title}</AppText>
              <AppText variant="caption" muted>{item.desc}</AppText>
            </View>
          </View>
        ))}
      </Card>

      {/* ── 3. ACTION BUTTON ── */}
      <ActionButton
        label="Open Device App Settings"
        disabled={Platform.OS === 'web'}
        onPress={async () => {
          try {
            await Linking.openSettings();
          } catch {
            setError('Could not open device settings automatically. Please open Phone Settings > Apps > GNB Motors.');
          }
        }}
      />
      {error ? <AppText color={colors.error} variant="caption">{error}</AppText> : null}
    </ExperiencePage>
  );
}
// These aliases use the existing authenticated, persisted workflows.
export function UniversalCapture(props) { return <OperationalForm {...props} route={{ ...props.route, name: 'Upload document', params: { scope: 'personal' } }} />; }
export function FuelEntry(props) { return <OperationalForm {...props} route={{ ...props.route, name: 'Add fuel' }} />; }
export function PaperList(props) { return <RecordList {...props} route={{ ...props.route, params: { kind: 'documents' } }} />; }
export function PaperDetail(props) { return props.route?.params?.id ? <RecordDetail {...props} route={{ ...props.route, params: { ...props.route.params, kind: 'documents' } }} /> : <UnavailableScreen {...props} />; }
export function DriverPapersReview(props) { return <FleetRecords {...props} route={{ ...props.route, name: 'Fleet documents' }} />; }
export const ExperienceInbox = DriverInbox;
export function DocumentsExpiry(props) { return <RecordList {...props} route={{ ...props.route, params: { kind: 'documents' } }} />; }
