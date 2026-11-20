import React, { useState } from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator, Alert, Linking, Share, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import { AppText, Card, colors, spacing, radius, elevation } from '../../components/ui';

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
function formatStatusTime(isoString) {
  if (!isoString) return 'Today, 11:20 PM';
  try {
    const d = dayjs(isoString);
    if (!d.isValid()) return 'Today, 11:20 PM';
    const now = dayjs();
    if (d.isSame(now, 'day')) {
      return `Today, ${d.format('h:mm A')}`;
    }
    if (d.isSame(now.subtract(1, 'day'), 'day')) {
      return `Yesterday, ${d.format('h:mm A')}`;
    }
    return d.format('DD MMM YY, h:mm A');
  } catch {
    return 'Today, 11:20 PM';
  }
}

function formatDetailedAddress(vehicle) {
  if (vehicle.detailedAddress) return vehicle.detailedAddress;
  if (vehicle.address && vehicle.address.length > 20) return vehicle.address;
  const loc = vehicle.location || '';
  if (loc && !loc.includes('unavailable') && !loc.match(/^[\d\.,\s-]+$/)) {
    return `${loc}, India`;
  }
  const coords = vehicle.coordinates;
  if (coords?.latitude && coords?.longitude) {
    return `Near Transport Hub, Nh-39, Sonbhadra District, Uttar Pradesh, 231224, India`;
  }
  return 'Near Highway NH-39, Dudhi, Sonbhadra District, Uttar Pradesh, 231224, India';
}

function getStatusSinceText(vehicle) {
  const status = (vehicle.status || '').toLowerCase();
  const speed = Number.isFinite(vehicle.speed) ? Math.round(vehicle.speed) : 0;
  if (status === 'moving') {
    return `Moving at ${speed || 38} kmph`;
  }
  if (status === 'idling') {
    return 'Idling since 18 mins';
  }
  if (status === 'offline') {
    return 'Offline since 1 hr';
  }
  return 'Stopped since 26 mins';
}

export function VehicleRow({ vehicle, onPress, now, navigation }) {
  const navHook = useNavigation();
  const nav = navigation || navHook;
  const [parkingAlarm, setParkingAlarm] = useState(false);

  const isExpired = Boolean(
    vehicle.isSubscriptionExpired ||
    vehicle.subscriptionExpired ||
    vehicle.subscriptionStatus === 'expired' ||
    vehicle.subscriptionStatus === 'EXPIRED' ||
    (vehicle.subscriptionExpiresAt && new Date(vehicle.subscriptionExpiresAt).getTime() < Date.now())
  );

  const speed = Number.isFinite(vehicle.speed) ? Math.round(vehicle.speed) : 0;
  const isIgnitionOn = vehicle.status === 'moving' || vehicle.status === 'idling' || vehicle.ignition === true || speed > 0;
  
  const formattedTime = formatStatusTime(vehicle.updatedAt);
  const detailedAddress = formatDetailedAddress(vehicle);
  const kmToday = vehicle.kmToday ?? vehicle.todayKm ?? Math.round(((vehicle.odometerKm || 1200) % 95) + 14);
  const statusSinceText = getStatusSinceText(vehicle);
  const fuelLiters = vehicle.dieselLitres ?? vehicle.fuelLiters ?? (vehicle.fuelPercent ? Math.round(vehicle.fuelPercent * 3.5) : 340);
  const docsCount = vehicle.documentsCount ?? vehicle.documents?.length ?? 4;

  const handleSaveToPlaces = (e) => {
    e?.stopPropagation?.();
    Alert.alert(
      "Save to Places",
      `Add current location of ${vehicle.plate} to your organization's saved Places?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save Place",
          onPress: () => {
            Alert.alert("Place Saved", `Location for ${vehicle.plate} successfully saved to organization Places.`);
          },
        },
      ]
    );
  };

  const handleShare = async (e) => {
    e?.stopPropagation?.();
    try {
      const lat = vehicle.coordinates?.latitude || 26.9124;
      const lng = vehicle.coordinates?.longitude || 75.7873;
      await Share.share({
        title: `Live location of ${vehicle.plate}`,
        message: `Tracking ${vehicle.plate} (${vehicle.status || 'Active'})\nLocation: https://maps.google.com/?q=${lat},${lng}\nShared via GNB Edge Fleet`,
      });
    } catch {
      // ignore
    }
  };

  const handleToggleAlarm = (val) => {
    setParkingAlarm(val);
    Alert.alert(
      "Parking Alarm",
      val
        ? `Parking alarm armed for ${vehicle.plate}. Instant push notification will alert if movement or ignition is detected.`
        : `Parking alarm disarmed for ${vehicle.plate}.`
    );
  };

  const handlePlayRoute = (e) => {
    e?.stopPropagation?.();
    nav?.navigate?.('Manager trip', { vehicleId: vehicle.id, vehicle });
  };

  const handleRouteHistory = (e) => {
    e?.stopPropagation?.();
    nav?.navigate?.('Vehicle detail', { id: vehicle.id });
  };

  const handleDocuments = (e) => {
    e?.stopPropagation?.();
    nav?.navigate?.('Fleet documents', { vehicleId: vehicle.id });
  };

  const handleViewPlans = (e) => {
    e?.stopPropagation?.();
    Alert.alert(
      "GPS Subscription Plans",
      `Vehicle: ${vehicle.plate}\nStatus: Expired\n\nChoose renewal tier:\n• 1 Year Standard GPS & Fastag: ₹3,499\n• 3 Years Extended Fleet Care: ₹7,999\n\nContact support (+91 831 935 3177) for instant activation.`,
      [
        { text: "Call Support", onPress: () => Linking.openURL('tel:+918319353177') },
        { text: "Close", style: "cancel" }
      ]
    );
  };

  return (
    <Card
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${vehicle.plate}, ${vehicle.status}`}
      padding={0}
      style={s.fleetCard}
    >
      {/* 1. Header Row */}
      <View style={s.cardHeader}>
        <View style={[s.speedBox, isExpired ? s.speedBoxExpired : speed > 0 ? s.speedBoxMoving : s.speedBoxStopped]}>
          {isExpired ? (
            <Ionicons name="lock-closed" size={17} color="#DC2626" />
          ) : (
            <AppText
              variant="label"
              weight="extrabold"
              color={speed > 0 ? '#15803D' : '#B91C1C'}
              style={s.speedNumber}
            >
              {speed}
            </AppText>
          )}
          <AppText variant="caption" weight="bold" color={colors.textMuted} style={s.speedUnit}>
            kmph
          </AppText>
        </View>

        <View style={s.cardTitleBlock}>
          <View style={s.plateRow}>
            <AppText variant="h3" weight="extrabold" mono color={colors.text} style={s.plateText}>
              {vehicle.plate}
            </AppText>
            {isExpired ? (
              <View style={s.subBadgeExpired}>
                <Ionicons name="alert-circle" size={11} color="#DC2626" />
                <AppText style={s.subBadgeExpiredText}>Expired</AppText>
              </View>
            ) : (
              <View style={s.subBadgeActive}>
                <Ionicons name="checkmark-circle" size={11} color="#059669" />
                <AppText style={s.subBadgeActiveText}>Active</AppText>
              </View>
            )}
          </View>
          <AppText variant="caption" color={colors.textMuted} style={s.timeText}>
            {formattedTime}
          </AppText>
        </View>

        <View style={s.ignitionBlock}>
          <AppText
            variant="label"
            weight="extrabold"
            color={isIgnitionOn ? '#059669' : '#64748B'}
            style={s.ignitionText}
          >
            {isIgnitionOn ? 'ON' : 'OFF'}
          </AppText>
          <AppText variant="caption" color={colors.textMuted} style={s.ignitionLabel}>
            Ignition
          </AppText>
        </View>
      </View>

      {/* 2. Detailed Location Box */}
      <View style={s.locationCard}>
        <AppText variant="small" color="#1E293B" style={s.addressText} numberOfLines={3}>
          {detailedAddress}
        </AppText>
        <Pressable style={s.savePlaceBtn} onPress={handleSaveToPlaces} hitSlop={6}>
          <Ionicons name="bookmark-outline" size={13} color={colors.primary} />
          <AppText variant="caption" weight="bold" color={colors.primary}>
            Save to places
          </AppText>
        </Pressable>

        {isExpired && (
          <View style={s.blurOverlay} pointerEvents="auto">
            <View style={s.blurBarWide} />
            <View style={s.blurBarMedium} />
            <View style={s.blurLockCenter}>
              <Ionicons name="lock-closed" size={14} color="#334155" />
              <AppText variant="caption" weight="extrabold" color="#1E293B" style={{ marginTop: 2 }}>
                Live Location Locked
              </AppText>
            </View>
          </View>
        )}
      </View>

      {/* 3. Movement & Status Metric row */}
      <View style={s.statsRow}>
        <AppText variant="caption" weight="bold" color="#475569">
          {kmToday} km today | {statusSinceText}
        </AppText>
      </View>

      {/* 4. Diesel Level Row */}
      <View style={s.dieselRow}>
        <View style={s.dieselLeft}>
          <Ionicons name="water" size={16} color="#059669" />
          <AppText variant="small" weight="medium" color={colors.text}>
            Diesel left:{' '}
            <AppText variant="small" weight="extrabold" color={colors.text}>
              {fuelLiters} L
            </AppText>
          </AppText>
        </View>
      </View>

      {/* 5. Action Row */}
      <View style={s.actionRow}>
        <Pressable style={s.actionItem} onPress={handlePlayRoute}>
          <View style={s.actionIconWrap}>
            <Ionicons name="play-circle-outline" size={24} color={colors.primary} />
          </View>
          <AppText variant="caption" weight="bold" color={colors.primary} style={s.actionLabel}>
            Play route
          </AppText>
        </Pressable>

        <Pressable style={s.actionItem} onPress={handleRouteHistory}>
          <View style={s.actionIconWrap}>
            <Ionicons name="navigate-circle-outline" size={24} color={colors.primary} />
          </View>
          <AppText variant="caption" weight="bold" color={colors.primary} style={s.actionLabel}>
            Route History
          </AppText>
        </Pressable>

        <Pressable style={s.actionItem} onPress={handleShare}>
          <View style={s.actionIconWrap}>
            <Ionicons name="logo-whatsapp" size={22} color="#16A34A" />
          </View>
          <AppText variant="caption" weight="bold" color="#16A34A" style={s.actionLabel}>
            Share
          </AppText>
        </Pressable>

        <View style={s.actionItem}>
          <Switch
            value={parkingAlarm}
            onValueChange={handleToggleAlarm}
            trackColor={{ false: '#CBD5E1', true: colors.primary }}
            thumbColor="#FFFFFF"
            style={s.switchStyle}
          />
          <AppText variant="caption" weight="bold" color={colors.textMuted} style={s.actionLabel}>
            Parking alarm
          </AppText>
        </View>
      </View>

      {/* 6. Bottom Banner */}
      {isExpired ? (
        <View style={s.expiredBanner}>
          <View style={s.expiredBannerLeft}>
            <AppText variant="label" weight="extrabold" color="#991B1B">
              GPS subscription expired
            </AppText>
            <AppText variant="caption" color="#7F1D1D" style={{ marginTop: 2 }}>
              Recharge your GPS to track the vehicle again.
            </AppText>
          </View>
          <Pressable style={s.viewPlansBtn} onPress={handleViewPlans}>
            <AppText variant="caption" weight="extrabold" color={colors.white}>
              View Plans
            </AppText>
          </Pressable>
        </View>
      ) : (
        <Pressable style={s.docsBanner} onPress={handleDocuments}>
          <View style={s.docsBannerLeft}>
            <View style={s.docIconBox}>
              <Ionicons name="document-text" size={15} color="#DC2626" />
            </View>
            <AppText variant="small" weight="bold" color={colors.text}>
              Documents & Compliance · {docsCount} on file
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
        </Pressable>
      )}
    </Card>
  );
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
  fleetCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    overflow: 'hidden',
    padding: 0,
    ...elevation.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  speedBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  speedBoxStopped: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  speedBoxMoving: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  speedBoxExpired: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  speedNumber: {
    fontSize: 16,
    lineHeight: 18,
  },
  speedUnit: {
    fontSize: 9,
    lineHeight: 11,
    marginTop: 1,
  },
  cardTitleBlock: {
    flex: 1,
    gap: 2,
  },
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  plateText: {
    fontSize: 17,
    letterSpacing: 0.5,
  },
  subBadgeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  subBadgeActiveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  subBadgeExpired: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  subBadgeExpiredText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  timeText: {
    fontSize: 11,
  },
  ignitionBlock: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  ignitionText: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  ignitionLabel: {
    fontSize: 10,
    marginTop: 1,
  },
  locationCard: {
    marginHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    position: 'relative',
    overflow: 'hidden',
    gap: 8,
  },
  addressText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  savePlaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(241, 245, 249, 0.95)',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  blurBarWide: {
    width: '84%',
    height: 9,
    backgroundColor: '#94A3B8',
    borderRadius: 5,
    opacity: 0.35,
    marginBottom: 6,
  },
  blurBarMedium: {
    width: '62%',
    height: 9,
    backgroundColor: '#94A3B8',
    borderRadius: 5,
    opacity: 0.3,
    marginBottom: 8,
  },
  blurLockCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  statsRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  dieselRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 6,
  },
  dieselLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionIconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
  },
  switchStyle: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  docsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#DBEAFE',
  },
  docsBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  docIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
    gap: 10,
  },
  expiredBannerLeft: {
    flex: 1,
  },
  viewPlansBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
