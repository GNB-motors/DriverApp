import React from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText, Card, colors, spacing, radius } from '../../components/ui';

const tones = {
  unknown: { label: 'Status unavailable', color: colors.textMuted, background: colors.background, icon: 'help-circle-outline' },
  moving: { label: 'Moving', color: colors.success, background: colors.validBg, icon: 'navigate' },
  stopped: { label: 'Stopped', color: colors.spot.nebula, background: colors.background, icon: 'pause' },
  idling: { label: 'Idling', color: colors.warning, background: colors.pendingBg, icon: 'time-outline' },
  offline: { label: 'Offline', color: colors.textMuted, background: colors.background, icon: 'cloud-offline-outline' },
  caution: { label: 'Caution', color: colors.warning, background: colors.pendingBg, icon: 'alert-circle-outline' },
  critical: { label: 'Critical', color: colors.error, background: colors.expiredBg, icon: 'warning-outline' },
  info: { label: 'Info', color: colors.infoText, background: colors.infoBg, icon: 'information-circle-outline' },
};
export function StatusChip({ status }) {
  const tone = tones[status] || tones.info;
  return <View style={[s.chip, { backgroundColor: tone.background }]}><Ionicons name={tone.icon} size={12} color={tone.color} /><AppText variant="caption" weight="semibold" color={tone.color}>{tone.label}</AppText></View>;
}
export function FreshnessChip({ updatedAt, now = Date.now() }) {
  const elapsed = now - new Date(updatedAt).getTime();
  const valid = Number.isFinite(elapsed);
  const minutes = Math.max(0, Math.floor(elapsed / 60000));
  return <View style={s.inline}><Ionicons name="time-outline" color={colors.textMuted} size={13} /><AppText variant="caption" muted>{valid ? `Updated ${minutes < 1 ? 'just now' : `${minutes} min ago`}` : 'Update time unavailable'}</AppText></View>;
}
export function SectionHeading({ title, caption, titleStyle }) {
  return <View style={s.section}><AppText variant="h3" style={titleStyle}>{title}</AppText>{caption && <AppText variant="small" muted>{caption}</AppText>}</View>;
}
export function KpiCard({ label, value, unit, icon = 'analytics-outline', caption }) {
  return <Card style={s.kpi} padding={spacing.md}><View style={s.kpiIcon}><Ionicons name={icon} size={19} color={colors.primary} /></View><View style={s.number}><AppText variant="h1" mono>{value}</AppText>{unit && <AppText variant="small" muted style={s.unit}>{unit}</AppText>}</View><AppText variant="small" weight="semibold">{label}</AppText>{caption && <AppText variant="caption" muted>{caption}</AppText>}</Card>;
}
export function VehicleRow({ vehicle, onPress, now }) {
  const sources = { truck: 'Truck GPS', phone: "Driver’s phone", lastKnown: 'Last known position' };
  return <Card onPress={onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={`${vehicle.plate}, ${vehicle.status}`} padding={spacing.lg} style={s.vehicle}>
    <View style={s.between}><View style={s.vehicleIcon}><Ionicons name="bus-outline" size={26} color={colors.primary} /></View><StatusChip status={vehicle.status} /></View>
    <View style={s.vehicleTitle}><AppText variant="h2" mono>{vehicle.plate}</AppText><AppText variant="small" muted>{vehicle.model}</AppText></View>
    <View style={s.inline}><Ionicons name="location-outline" size={16} color={colors.textMuted} /><AppText variant="small" muted style={s.flex}>{vehicle.location}</AppText></View>
    <View style={s.rule} /><View style={s.between}><AppText variant="caption" color={colors.primaryDeep}>{sources[vehicle.source] || 'Source unavailable'}</AppText><FreshnessChip updatedAt={vehicle.updatedAt} now={now} /></View>
  </Card>;
}
export function DriverRow({ driver }) {
  return <Card style={s.rowCard}><View style={s.avatar}><AppText weight="semibold" color={colors.primaryDeep}>{driver.initials}</AppText></View><View style={s.flex}><AppText weight="semibold">{driver.name}</AppText><AppText variant="small" muted>{driver.vehicleId ? 'Truck linked' : 'No truck linked'}</AppText></View><AppText variant="caption" color={driver.state === 'Driving' ? colors.success : colors.textMuted}>{driver.state}</AppText></Card>;
}
export function AlertRow({ alert, onPress }) {
  const tone = tones[alert.severity] || tones.info;
  return <Card onPress={onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={alert.title} style={s.rowCard}><View style={[s.alertIcon, { backgroundColor: tone.background }]}><Ionicons name={tone.icon} color={tone.color} size={21} /></View><View style={s.flex}><AppText weight="semibold">{alert.title}</AppText><AppText variant="small" muted style={s.description}>{alert.description}</AppText><AppText variant="caption" color={tone.color}>{alert.acknowledged ? 'Acknowledged' : `${tone.label} · Tap to acknowledge`}</AppText></View>{onPress && <Ionicons name="chevron-forward" color={colors.textMuted} size={17} />}</Card>;
}
export function DutyCard({ driver }) {
  const progress = Math.min(1, Math.max(0, driver.drivingMinutes / driver.limitMinutes || 0));
  const remaining = Math.max(0, driver.limitMinutes - driver.drivingMinutes);
  return <LinearGradient colors={colors.heroGradient} style={s.duty}>
    <View style={s.between}><View style={s.inline}><View style={s.dutyDot} /><AppText variant="caption" weight="semibold" color={colors.onPrimary}>{driver.state === 'OFF_DUTY' ? 'OFF DUTY' : driver.state === 'REST' ? 'RESTING' : 'ON DUTY'}</AppText></View><AppText variant="caption" color={colors.onPrimaryMuted}>Driving summary</AppText></View>
    <AppText variant="small" color={colors.onPrimaryMuted} style={s.dutyLabel}>Your time on the road</AppText>
    <View style={s.number}><AppText variant="display" color={colors.white} mono>{`${Math.floor(driver.drivingMinutes / 60)}h ${driver.drivingMinutes % 60}m`}</AppText><AppText variant="small" color={colors.onPrimaryMuted} style={s.unit}>today</AppText></View>
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: driver.limitMinutes, now: driver.drivingMinutes }} accessibilityLabel="Daily driving time" style={s.track}><View style={[s.fill, { width: `${progress * 100}%` }]} /></View>
    <AppText variant="caption" color={colors.onPrimaryMuted}>{`${Math.floor(remaining / 60)}h ${remaining % 60}m until daily limit`}</AppText>
  </LinearGradient>;
}
export function DataState({ state, onRetry }) {
  if (state === 'loading') return <Card style={s.state}><ActivityIndicator color={colors.primary} /><AppText muted>Loading your fleet…</AppText></Card>;
  const error = state === 'error';
  return <Card style={s.state}><View style={s.vehicleIcon}><Ionicons name={error ? 'cloud-offline-outline' : 'file-tray-outline'} size={28} color={colors.primary} /></View><AppText variant="h3">{error ? 'Couldn’t load this view' : 'A clear road ahead'}</AppText><AppText muted center>{error ? 'Try again to reload from the server.' : 'No records are available.'}</AppText>{error && onRetry && <Pressable accessibilityRole="button" onPress={onRetry} style={s.retry}><AppText weight="semibold" color={colors.white}>Try again</AppText></Pressable>}</Card>;
}
const s = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 }, between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }, flex: { flex: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  section: { gap: 4, marginTop: 12, marginBottom: 12 }, kpi: { flex: 1, minWidth: 140, gap: 5, borderColor: colors.border }, kpiIcon: { marginBottom: 8 }, number: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }, unit: { marginBottom: 5 },
  vehicle: { borderColor: colors.border }, vehicleIcon: { width: 52, height: 52, borderRadius: radius.lg, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center' }, vehicleTitle: { marginTop: 18, marginBottom: 12, gap: 4 }, rule: { height: 1, backgroundColor: colors.border, marginVertical: 18 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 76, borderColor: colors.border }, avatar: { width: 44, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueTint }, alertIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' }, description: { marginTop: 4, marginBottom: 8 },
  duty: { borderRadius: radius.xl, padding: 24, gap: 10 }, dutyDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.spot.splash }, dutyLabel: { marginTop: 15 }, track: { height: 5, borderRadius: 3, backgroundColor: colors.onPrimaryFaint, overflow: 'hidden', marginTop: 8 }, fill: { height: '100%', backgroundColor: colors.onPrimary, borderRadius: 3 },
  state: { alignItems: 'center', padding: 28, gap: 14, borderColor: colors.border }, retry: { minHeight: 48, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.md },
});
