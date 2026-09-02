import React, { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  AppText, Button, Card, Switch, Badge, StatusBadge, WalletHeroCard,
  WarningBanner, Loading, EmptyState, colors, spacing, radius,
} from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { apiConfigured } from '../../../services/client';
import { useApi } from '../../../hooks/useApi';
import walletService from '../../../services/walletService';
import tripService from '../../../services/tripService';
import billService from '../../../services/billService';
import fuelService from '../../../services/fuelService';
import documentService from '../../../services/documentService';

/** ERP trip state → StatusBadge vocabulary. */
const TRIP_BADGE = {
  PLACED: { key: 'assigned', label: 'Placed' },
  ADVANCE_PENDING: { key: 'pending', label: 'Advance pending' },
  ADVANCE_PAID: { key: 'confirmed', label: 'Advance paid' },
  CN_PENDING: { key: 'pending', label: 'CN pending' },
  CN_UPDATED: { key: 'confirmed', label: 'CN updated' },
  DISPATCHED: { key: 'in_transit', label: 'In transit' },
};
import dayjs from 'dayjs';

/**
 * 01 / 02 · Driver Home — on-duty and off-duty variants. UI-only demo.
 */
const QUICK_ACTIONS = [
  { key: 'fuel', icon: 'water', label: 'Add fuel' },
  { key: 'bill', icon: 'receipt-outline', label: 'Add bill', primary: true },
  { key: 'docs', icon: 'document-text-outline', label: 'Documents' },
  { key: 'sos', icon: 'alert', label: 'SOS', danger: true },
];

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [onDuty, setOnDuty] = useState(true);
  // Real data only — identity from the signed-in user, balance from the khata
  // summary, and the active trip from the trips list.
  const { user, token } = useAuth();
  const driverId = user?._id;
  const enabled = apiConfigured() && !!token;
  const { data: summary, refetch: refetchSummary } = useApi(
    () => walletService.getDriverSummary(driverId),
    [driverId],
    { enabled: enabled && !!driverId, fallback: null },
  );
  const { data: tripsApi, loading: tripsLoading, error: tripsError, refetch: refetchTrips } = useApi(
    () => tripService.listTrips(),
    [],
    { enabled, fallback: [] },
  );
  // Bill counts, last refuel and document expiry each have their own endpoint —
  // the khata summary carries balances only.
  const { data: billsApi, refetch: refetchBills } = useApi(
    () => billService.listBills(),
    [],
    { enabled, fallback: null },
  );
  const { data: fuelApi, refetch: refetchFuel } = useApi(
    () => fuelService.listFuelLogs({ limit: 1 }),
    [],
    { enabled, fallback: null },
  );
  const { data: docsApi, refetch: refetchDocs } = useApi(
    () => documentService.listDocuments('USER', driverId),
    [driverId],
    { enabled: enabled && !!driverId, fallback: null },
  );
  const onRefresh = () => { refetchSummary(); refetchTrips(); refetchBills(); refetchFuel(); refetchDocs(); };

  const rowsOf = (data) =>
    Array.isArray(data) ? data : (data?.results || data?.rows || data?.items || data?.data || []);

  // Identity from the signed-in user.
  const fullName = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  // /app/v1/trips → the driver's own ERP trips:
  // [{ tripNumber, state, fromLocation, toLocation, material, vehicleNumber,
  //    plannedQty, loadedQty, totalKm, tripDate, partyId: { name } }]
  const tripRowsAll = rowsOf(tripsApi);
  const monthStart = dayjs().startOf('month');
  const tripsThisMonth = tripRowsAll.filter((t) => t?.tripDate && dayjs(t.tripDate).isAfter(monthStart));
  const distanceKm = tripsThisMonth.reduce((n, t) => n + (Number(t?.totalKm) || 0), 0);

  const driver = {
    name: fullName || 'Driver',
    initials: ((fullName || 'D').trim()[0] || 'D').toUpperCase(),
    tripsThisMonth: String(tripsThisMonth.length),
    distance: distanceKm ? `${distanceKm.toLocaleString('en-IN')} km` : '—',
  };

  // Balance '—' until the summary responds. /khata/drivers/:id/summary → { totalAmount }
  const balance = summary
    ? `₹${Number(summary.totalAmount ?? 0).toLocaleString('en-IN')}`
    : '—';

  // Bill counts come from the driver's own bill list, not the khata summary.
  const billRows = rowsOf(billsApi);
  const pendingCount = billRows.filter((b) => b?.status === 'PENDING').length;
  const confirmedCount = billRows.filter((b) => b?.status === 'CONFIRMED').length;

  // Active trip — anything not yet closed out. ERP states, per
  // erpTrip.constants.js ERP_TRIP_STATES.
  const ACTIVE_TRIP_STATES = ['PLACED', 'ADVANCE_PENDING', 'ADVANCE_PAID', 'CN_PENDING', 'CN_UPDATED', 'DISPATCHED'];
  const activeRaw = tripRowsAll.find((tr) => ACTIVE_TRIP_STATES.includes(tr?.state)) || null;
  const activeTrip = activeRaw && {
    _id: activeRaw._id,
    id: activeRaw.tripNumber || '—',
    state: activeRaw.state,
    from: activeRaw.fromLocation || '—',
    to: activeRaw.toLocation || '—',
    plate: activeRaw.vehicleNumber || activeRaw.vehicleId?.registrationNumber || '—',
    material: activeRaw.material || '',
    party: activeRaw.partyId?.name || '',
    started: activeRaw.tripDate ? dayjs(activeRaw.tripDate).format('DD MMM') : '',
    distance: Number(activeRaw.totalKm) || 0,
  };

  // Licence / document expiry — real expiryDate off the driver's own documents.
  const expiringDoc = rowsOf(docsApi)
    .filter((d) => d?.expiryDate)
    .map((d) => ({ ...d, days: dayjs(d.expiryDate).diff(dayjs(), 'day') }))
    .filter((d) => d.days <= 45)
    .sort((a, b) => a.days - b.days)[0] || null;

  // Last refuel — most recent fuel log. /fuel-logs → [{ litres, totalAmount,
  // refuelTime, location, fuelType }]
  const lastLog = rowsOf(fuelApi)[0] || null;
  const lastRefuel = {
    litres: lastLog?.litres != null ? `${lastLog.litres} L` : '—',
    meta: lastLog
      ? [lastLog.refuelTime ? dayjs(lastLog.refuelTime).format('DD MMM') : null, lastLog.location].filter(Boolean).join(' · ')
      : 'No refuel logged yet',
    amount: lastLog?.totalAmount != null ? `₹${Number(lastLog.totalAmount).toLocaleString('en-IN')}` : '—',
  };

  const openWallet = () => navigation.navigate('Wallet');
  const onQuick = (key) => {
    if (key === 'fuel') navigation.navigate('FuelCapture');
    else if (key === 'bill') navigation.navigate('AddBill');
    else if (key === 'docs') navigation.navigate('MyDocuments');
    else if (key === 'sos') navigation.navigate('SOSOptions');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={{ flex: 1 }}>
          <AppText variant="small" weight="medium" muted>Namaste</AppText>
          <AppText variant="h3" weight="extrabold" numberOfLines={1}>{driver.name}</AppText>
        </View>
        <Pressable style={styles.bell} hitSlop={8} onPress={() => navigation.navigate('Alerts')}>
          <Ionicons name="notifications-outline" size={21} color={colors.text} />
          <View style={styles.bellDot} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={tripsLoading} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Duty status */}
        <Card onPress={() => setOnDuty((v) => !v)} elevated="sm" padding={15} style={styles.dutyCard}>
          <View style={[styles.dutyIcon, { backgroundColor: onDuty ? colors.validBg : colors.background }]}>
            <Ionicons name="power" size={21} color={onDuty ? colors.success : colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.dutyTitleRow}>
              <AppText variant="bodyStrong" weight="bold">{onDuty ? 'On duty' : 'Off duty'}</AppText>
              {onDuty ? <View style={styles.dutyDot} /> : null}
            </View>
            <AppText variant="small" muted numberOfLines={1}>
              {onDuty ? 'Available for trips' : 'Not accepting trips'}
            </AppText>
          </View>
          <View pointerEvents="none"><Switch value={onDuty} /></View>
        </Card>

        {/* Wallet hero */}
        <WalletHeroCard
          balance={balance}
          caption={pendingCount
            ? `${pendingCount} bill${pendingCount === 1 ? '' : 's'} awaiting confirmation`
            : `${confirmedCount} confirmed`}
          onPress={openWallet}
        />

        {tripsLoading ? (
          <Loading />
        ) : tripsError ? (
          <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={onRefresh} />
        ) : activeTrip ? (
          /* Active trip */
          <Card elevated="sm" padding={16} style={styles.gap}>
            <View style={styles.tripTop}>
              <Badge tone="neutral" label={activeTrip.id} />
              <StatusBadge status={TRIP_BADGE[activeTrip.state]?.key || 'in_transit'} label={TRIP_BADGE[activeTrip.state]?.label || activeTrip.state} dot />
            </View>
            <View style={styles.routeRow}>
              <AppText variant="bodyStrong" weight="bold" numberOfLines={1} style={{ flex: 1 }}>{activeTrip.from}</AppText>
              <AppText variant="small" muted>→</AppText>
              <AppText variant="bodyStrong" weight="bold" numberOfLines={1} style={{ flex: 1, textAlign: 'right' }}>{activeTrip.to}</AppText>
            </View>
            <View style={styles.tripMetaRow}>
              <AppText variant="caption" mono muted numberOfLines={1} style={styles.tripMetaLeft}>
                {[activeTrip.plate, activeTrip.material].filter(Boolean).join(' · ')}
              </AppText>
              {activeTrip.distance ? (
                <AppText variant="caption" mono muted numberOfLines={1} style={styles.tripMetaRight}>
                  {activeTrip.distance.toLocaleString('en-IN')} km
                </AppText>
              ) : null}
            </View>
            <Button variant="secondary" size="sm" label="Open trip" onPress={() => navigation.navigate('ActiveTrip', { id: activeTrip._id })} style={styles.gapSm} />
          </Card>
        ) : (
          /* Off-duty: no trip + licence warning + stats */
          <>
            <Card variant="outline" elevated="none" padding={20} style={[styles.gap, styles.emptyTrip]}>
              <View style={styles.emptyIcon}><Ionicons name="cube-outline" size={26} color={colors.textMuted} /></View>
              <AppText variant="bodyStrong" weight="bold" center>No trip assigned</AppText>
              <AppText variant="small" muted center style={styles.emptySub}>Go on duty to start receiving trips.</AppText>
              <Button size="md" label="Go on duty" onPress={() => setOnDuty(true)} style={styles.gapSm} />
            </Card>

            {expiringDoc ? (
              <WarningBanner
                tone={expiringDoc.days < 0 ? 'error' : 'warning'}
                title={expiringDoc.days < 0
                  ? `${expiringDoc.docType || 'Document'} has expired.`
                  : `${expiringDoc.docType || 'Document'} expires in ${expiringDoc.days} day${expiringDoc.days === 1 ? '' : 's'}.`}
                message="Renew it to keep taking trips."
                actionLabel="Open documents"
                onAction={() => navigation.navigate('MyDocuments')}
                style={styles.gap}
              />
            ) : null}

            <View style={[styles.statRow, styles.gap]}>
              <Card elevated="sm" padding={14} style={styles.statCard}>
                <AppText variant="label" muted>Trips this month</AppText>
                <AppText mono variant="h2" weight="semibold">{driver.tripsThisMonth}</AppText>
              </Card>
              <Card elevated="sm" padding={14} style={styles.statCard}>
                <AppText variant="label" muted>Distance</AppText>
                <AppText mono variant="h2" weight="semibold">{driver.distance}</AppText>
              </Card>
            </View>
          </>
        )}

        {/* Quick actions */}
        <View style={[styles.grid, styles.gap]}>
          {QUICK_ACTIONS.map((a) => (
            <Pressable
              key={a.key}
              style={[styles.gridItem, a.primary && styles.gridPrimary, a.danger && styles.gridDanger]}
              onPress={() => onQuick(a.key)}
            >
              <Ionicons name={a.icon} size={22} color={a.primary ? colors.white : a.danger ? colors.error : colors.primary} />
              <AppText variant="small" weight="bold" center color={a.primary ? colors.white : a.danger ? colors.error : colors.text}>
                {a.label}
              </AppText>
            </Pressable>
          ))}
        </View>

        {/* Last refuel */}
        <Card elevated="sm" padding={14} style={styles.gap}>
          <View style={styles.lastRow}>
            <View style={styles.lastIcon}><Ionicons name="water" size={20} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <AppText variant="label" muted>Last refuel</AppText>
              <AppText variant="small" mono muted>{lastRefuel.litres} · {lastRefuel.meta}</AppText>
            </View>
            <AppText mono variant="h3" weight="semibold">{lastRefuel.amount}</AppText>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 22, paddingBottom: 12,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18 },
  bell: {
    width: 46, height: 46, borderRadius: 14, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0A1024', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  bellDot: {
    position: 'absolute', top: 11, right: 12, width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.accent, borderWidth: 1.5, borderColor: colors.surface,
  },
  scroll: { paddingHorizontal: 22, paddingTop: 6, gap: 14 },
  gap: { marginTop: 0 },
  gapSm: { marginTop: 12 },

  dutyCard: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  dutyIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dutyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dutyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },

  tripTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  route: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeText: { flexShrink: 1, maxWidth: '38%' },
  dashed: { flex: 1, height: 0, borderTopWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed' },
  tripMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 8 },
  tripMetaLeft: { flex: 1, flexShrink: 1 },
  tripMetaRight: { flexShrink: 0 },

  emptyTrip: { alignItems: 'center', borderStyle: 'dashed' },
  emptyIcon: {
    width: 56, height: 56, borderRadius: radius.lg, backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  emptySub: { marginTop: 4 },

  statRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, gap: 4 },

  grid: { flexDirection: 'row', gap: 10 },
  gridItem: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: 16, gap: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  gridPrimary: { backgroundColor: colors.primary, borderColor: colors.primaryDeep },
  gridDanger: { backgroundColor: colors.expiredBg, borderColor: '#F0CFCB' },

  lastRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lastIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' },
});
