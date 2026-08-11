/**
 * ManagerHomeScreen.js — the ops queue, not a vanity dashboard.
 *
 * GET /api/erp/dashboard/summary returns every count on this screen in one call —
 * the same endpoint the web ERP Command Center uses, so the two agree.
 *
 * The layout is ordered by what needs doing (action queues first), then the state
 * of the board, then money. Counts are tappable and land on the filtered list,
 * which is the whole point: a number nobody can act on is decoration.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useAccess } from '../../context/AccessContext';
import { useErp } from '../../context/ErpContext';
import { fetchErpDashboardSummary } from '../../services/erpApi';
import {
  AppText, Card, Badge, MoneyText, colors, radius, spacing,
} from '../../components/ui';
import logger from '../../utils/logger';

export default function ManagerHomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const { can, resolved } = useAccess();
  const { pendingApprovalsCount } = useErp();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!token || !resolved) return;
    if (!can('dashboard.view')) { setLoading(false); return; }
    try {
      setSummary(await fetchErpDashboardSummary(token));
      setError(null);
    } catch (err) {
      // requireFeature answers 404 when the org has no ERP — not a failure.
      if (err?.statusCode !== 404) {
        logger.warn('ManagerHome', `Summary failed: ${err?.message}`);
        setError(err?.message || 'Could not load the dashboard.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, resolved, can]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ')
    || user?.name || 'there';
  const initials = (
    `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`
  ).toUpperCase() || 'M';

  const byState = summary?.tripsByState || {};

  // Only queues this role can actually act on.
  const queues = [
    {
      key: 'cn',
      label: 'CN pending',
      hint: 'Bilty not filed',
      icon: 'document-text-outline',
      count: summary?.pendingCnsCount,
      show: can('cn.view'),
      go: () => navigation.navigate('Consignments'),
    },
    {
      key: 'close',
      label: 'To close',
      hint: 'In transit, unloaded',
      icon: 'flag-outline',
      count: summary?.pendingTripCloseCount,
      show: can('trips.close'),
      go: () => navigation.navigate('TripList', { state: 'DISPATCHED' }),
    },
    {
      key: 'pod',
      label: 'POD pending',
      hint: 'Closed, no proof',
      icon: 'mail-open-outline',
      count: summary?.pendingPodCount,
      show: can('pod.view'),
      go: () => navigation.navigate('Pods'),
    },
    {
      key: 'unloading',
      label: 'Unloading',
      hint: 'Awaiting settlement',
      icon: 'swap-vertical-outline',
      count: summary?.pendingUnloadingCount,
      show: can('unloading.view'),
      go: () => navigation.navigate('UnloadingList'),
    },
  ].filter((q) => q.show);

  const shortcuts = [
    { label: 'Placements', icon: 'grid-outline', route: 'PlacementsAll', show: can('placements.view') },
    { label: 'Delivery orders', icon: 'clipboard-outline', route: 'DeliveryOrders', show: can('dos.view') },
    { label: 'Advances', icon: 'wallet-outline', route: 'Advances', show: can('advances.view') },
    { label: 'Consignments', icon: 'document-text-outline', route: 'Consignments', show: can('cn.view') },
    { label: 'PODs', icon: 'mail-open-outline', route: 'Pods', show: can('pod.view') },
    { label: 'Unloading', icon: 'swap-vertical-outline', route: 'UnloadingList', show: can('unloading.view') },
    { label: 'Sale bills', icon: 'receipt-outline', route: 'SaleBills', show: can('billing.view') },
    { label: 'Ledger', icon: 'book-outline', route: 'Ledger', show: can('ledger.view') },
  ].filter((s) => s.show);

  return (
    <View style={styles.flex}>
      <StatusBar style="dark" />

      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.avatar}>
          <AppText weight="extrabold" color={colors.primary} style={styles.avatarText}>
            {initials}
          </AppText>
        </View>
        <View style={styles.headerText}>
          <AppText variant="small" weight="medium" muted>
            {user?.role === 'OPS_EXECUTIVE' ? 'Ops Executive' : 'Manager'}
          </AppText>
          <AppText variant="h3" weight="extrabold" numberOfLines={1}>{name}</AppText>
        </View>
        <Pressable
          style={styles.bell}
          hitSlop={8}
          onPress={() => navigation.navigate('Notifications')}
          accessibilityRole="button"
          accessibilityLabel="Alerts"
        >
          <Ionicons name="notifications-outline" size={21} color="#3C4C47" />
          {pendingApprovalsCount > 0 ? <View style={styles.bellDot} /> : null}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {error ? (
          <Card variant="outline" padding={13} style={styles.errorCard}>
            <AppText variant="small" weight="semibold" color={colors.error}>{error}</AppText>
            <AppText variant="caption" muted style={styles.errorHint}>Pull down to retry.</AppText>
          </Card>
        ) : null}

        {/* Approvals first when there are any — it is the only blocking queue. */}
        {can('approvals.view') && pendingApprovalsCount > 0 ? (
          <Card
            padding={16}
            elevated="sm"
            onPress={() => navigation.navigate('Approvals')}
            style={[styles.card, styles.approvalCard]}
          >
            <View style={styles.approvalRow}>
              <View style={styles.approvalIcon}>
                <Ionicons name="checkmark-done" size={19} color={colors.warning} />
              </View>
              <View style={styles.approvalText}>
                <AppText variant="bodyStrong" weight="extrabold">
                  {pendingApprovalsCount} awaiting approval
                </AppText>
                <AppText variant="caption" muted weight="medium">
                  {can('approvals.decide')
                    ? 'Tap to review and decide'
                    : 'Owner or approver must decide these'}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.border} />
            </View>
          </Card>
        ) : null}

        {queues.length > 0 && (
          <>
            <AppText variant="label" muted style={styles.sectionTitle}>NEEDS ACTION</AppText>
            <View style={styles.queueGrid}>
              {queues.map((q) => (
                <Pressable key={q.key} onPress={q.go} style={styles.queueTile}>
                  <View style={styles.queueTop}>
                    <Ionicons name={q.icon} size={17} color={colors.primary} />
                    <AppText variant="h2" weight="extrabold" color={colors.primaryDeep}>
                      {loading ? '—' : (q.count ?? 0)}
                    </AppText>
                  </View>
                  <AppText variant="small" weight="bold" numberOfLines={1}>{q.label}</AppText>
                  <AppText variant="caption" muted numberOfLines={1}>{q.hint}</AppText>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {can('trips.view') && (
          <>
            <AppText variant="label" muted style={styles.sectionTitle}>THE BOARD</AppText>
            <Card padding={16} elevated="sm" style={styles.card}>
              {[
                ['PLACED', 'Placed', 'pending'],
                ['DISPATCHED', 'In transit', 'info'],
                ['TRIP_CLOSED', 'Closed', 'neutral'],
                ['POD_RECEIVED', 'POD in', 'info'],
                ['UNLOADED', 'Unloaded', 'info'],
                ['BILLED', 'Billed', 'valid'],
              ].map(([key, label, tone], i, arr) => (
                <Pressable
                  key={key}
                  onPress={() => navigation.navigate('TripList', { state: key })}
                  style={[styles.boardRow, i < arr.length - 1 && styles.boardRowBorder]}
                >
                  <Badge tone={tone} label={label} />
                  <AppText variant="bodyStrong" weight="extrabold" style={styles.boardCount}>
                    {loading ? '—' : (byState[key] ?? 0)}
                  </AppText>
                  <Ionicons name="chevron-forward" size={16} color={colors.border} />
                </Pressable>
              ))}
            </Card>
          </>
        )}

        {can('finance.view') && summary?.receivables ? (
          <>
            <AppText variant="label" muted style={styles.sectionTitle}>MONEY</AppText>
            <View style={styles.moneyRow}>
              <Card padding={16} elevated="sm" style={styles.moneyCard}>
                <AppText variant="caption" muted weight="medium">RECEIVABLE</AppText>
                <MoneyText
                  amount={summary.receivables.total}
                  compact
                  variant="h2"
                  weight="extrabold"
                  color={colors.primaryDeep}
                />
                {summary.receivables.overdue ? (
                  <View style={styles.overdueRow}>
                    <AppText variant="caption" muted weight="medium">overdue</AppText>
                    <MoneyText
                      amount={summary.receivables.overdue}
                      compact
                      variant="caption"
                      weight="bold"
                      color={colors.warning}
                    />
                  </View>
                ) : null}
              </Card>
              <Card padding={16} elevated="sm" style={styles.moneyCard}>
                <AppText variant="caption" muted weight="medium">PAYABLE</AppText>
                <MoneyText
                  amount={summary?.payables?.total}
                  compact
                  variant="h2"
                  weight="extrabold"
                  color={colors.primaryDeep}
                />
              </Card>
            </View>
          </>
        ) : null}

        {shortcuts.length > 0 && (
          <>
            <AppText variant="label" muted style={styles.sectionTitle}>ALL AREAS</AppText>
            <Card padding={0} elevated="sm" style={styles.card}>
              {shortcuts.map((s, i) => (
                <Pressable
                  key={s.route + s.label}
                  onPress={() => navigation.navigate(s.route)}
                  style={[styles.linkRow, i < shortcuts.length - 1 && styles.linkRowBorder]}
                >
                  <View style={styles.linkIcon}>
                    <Ionicons name={s.icon} size={17} color={colors.primary} />
                  </View>
                  <AppText variant="bodyStrong" weight="semibold" style={styles.linkLabel}>
                    {s.label}
                  </AppText>
                  <Ionicons name="chevron-forward" size={17} color={colors.border} />
                </Pressable>
              ))}
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 22, paddingBottom: 12 },
  avatar: {
    width: 48, height: 48, borderRadius: radius.full, backgroundColor: colors.tealTint,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 17 },
  headerText: { flex: 1 },
  bell: {
    width: 46, height: 46, borderRadius: 14, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute', top: 12, right: 13, width: 8, height: 8,
    borderRadius: radius.full, backgroundColor: colors.error,
  },
  scroll: { padding: 22, paddingBottom: 60 },
  card: { marginBottom: 14 },
  errorCard: {
    borderColor: colors.error, backgroundColor: colors.expiredBg,
    borderRadius: radius.md, marginBottom: 14,
  },
  errorHint: { marginTop: 3 },
  sectionTitle: { marginTop: 8, marginBottom: 12, letterSpacing: 0.5 },

  approvalCard: { borderLeftWidth: 3, borderLeftColor: colors.warning },
  approvalRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  approvalIcon: {
    width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.pendingBg,
    alignItems: 'center', justifyContent: 'center',
  },
  approvalText: { flex: 1 },

  queueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  queueTile: {
    width: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: 15, gap: 3, borderWidth: 1, borderColor: colors.border,
  },
  queueTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },

  boardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  boardRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  boardCount: { flex: 1, textAlign: 'right' },

  moneyRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  moneyCard: { flex: 1 },
  overdueRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },

  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14, paddingHorizontal: 16 },
  linkRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  linkIcon: {
    width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.tealTint,
    alignItems: 'center', justifyContent: 'center',
  },
  linkLabel: { flex: 1 },
});
