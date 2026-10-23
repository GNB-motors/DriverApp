import React, { useEffect, useState } from 'react';
import { ScrollView, View, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, colors, spacing, radius } from '../../components/ui';
import { DEMO_SCENARIOS } from '../data/fixtures';
import { useTelematicsDemo } from '../context/TelematicsDemoContext';
import { DemoIndicator, SectionHeading, VehicleRow, DriverRow, AlertRow, DutyCard, KpiCard, DataState } from '../components';

const scenarioLabels = { ready: 'Overview', loading: 'Loading', empty: 'Empty', error: 'Error', staleGps: 'Stale GPS', phoneFallback: 'Phone GPS', unassigned: 'No truck' };
export default function FoundationPreviewScreen() {
  const service = useTelematicsDemo();
  const [scenario, setScenario] = useState('ready');
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [actionError, setActionError] = useState('');
  useEffect(() => {
    let active = true;
    setData(null); setError(false); setActionError('');
    service.setScenario(scenario);
    if (scenario === 'loading') return () => { active = false; };
    Promise.all(['vehicles', 'drivers', 'alerts'].map((key) => service.list(key)))
      .then(([vehicles, drivers, alerts]) => { if (active) setData({ vehicles, drivers, alerts }); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [service, scenario, revision]);
  const retry = () => { setScenario('ready'); setRevision((n) => n + 1); };
  const acknowledge = async (id) => {
    try { await service.acknowledgeAlert(id); setRevision((n) => n + 1); }
    catch (err) { setActionError(err.message); }
  };
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
    <View style={s.top}><View style={s.brand}><Ionicons name="navigate" size={18} color={colors.primary} /><AppText variant="label" color={colors.primaryDeep}>HIGHWAY SAHAYAK</AppText></View><View style={s.preview}><AppText variant="caption" muted>UI PREVIEW</AppText></View></View>
    <View style={s.heading}><AppText variant="small" muted>A little clarity. Every kilometre.</AppText><AppText variant="display">Built for the road.</AppText><AppText muted>Telematics foundation · Driver experience</AppText></View>
    <DemoIndicator />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.scenarios}>{DEMO_SCENARIOS.map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: scenario === item }} onPress={() => setScenario(item)} style={[s.pill, scenario === item && s.selected]}><AppText variant="small" weight="semibold" color={scenario === item ? colors.white : colors.textMuted}>{scenarioLabels[item]}</AppText></Pressable>)}</ScrollView>
    {error ? <DataState state="error" onRetry={retry} /> : !data ? <DataState state="loading" /> : !data.vehicles.length ? <DataState state="empty" /> : <>
      <DutyCard driver={data.drivers[0]} />
      <View style={s.metrics}><KpiCard label="Distance covered" value="184" unit="km" caption="Sample journey today" icon="navigate-outline" /><KpiCard label="Fuel efficiency" value="3.8" unit="km/L" caption="Sample trip average" icon="water-outline" /></View>
      <SectionHeading title="Your truck" caption="The right information, at a glance." />
      {scenario === 'unassigned' ? <View style={s.unassigned}><Ionicons name="bus-outline" size={28} color={colors.primary} /><AppText variant="h3">No truck linked yet</AppText><AppText muted center>Your manager can link a truck. Change truck will be available in the Driver phase.</AppText></View> : <VehicleRow vehicle={data.vehicles[0]} />}
      <SectionHeading title="Needs your attention" caption="Useful updates for a smoother day." />
      <View style={s.list}>{data.alerts.map((alert) => <AlertRow key={alert.id} alert={alert} onPress={() => acknowledge(alert.id)} />)}</View>
      {actionError ? <AppText color={colors.error}>{actionError}</AppText> : null}
      <SectionHeading title="People behind the wheel" caption="Shared components for the fleet views." />
      <View style={s.list}>{data.drivers.map((driver) => <DriverRow key={driver.id} driver={driver} />)}</View>
    </>}
    <View style={s.footer}><Ionicons name="shield-checkmark-outline" size={18} color={colors.textMuted} /><AppText variant="caption" muted center>Design preview only. No live tracking or emergency delivery.</AppText></View>
  </ScrollView></SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, page: { padding: spacing.lg, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }, brand: { flexDirection: 'row', alignItems: 'center', gap: 8 }, preview: { backgroundColor: colors.surface, padding: 8, borderRadius: radius.sm },
  heading: { gap: 8, marginTop: 32, marginBottom: 4 }, scenarios: { gap: 8, paddingTop: 8, paddingBottom: 24 }, pill: { minHeight: 48, paddingHorizontal: 18, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' }, selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16, marginBottom: 8 }, list: { gap: 12 }, unassigned: { padding: 28, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, alignItems: 'center', gap: 12 }, footer: { alignItems: 'center', gap: 8, marginTop: 32 },
});
