/**
 * OwnerDashboardScreen.js
 *
 * GET /api/erp/dashboard/summary — the same endpoint the manager home and the
 * web command center use. Every number on this screen is real; the previous
 * version hardcoded "42 active trips" and "15 pending DOs", and its quick links
 * pointed at three route names that were never registered.
 *
 * The Owner sees a superset of the Manager view, so the framing here is money and
 * exceptions first — an owner opens the app to find out what needs them, not to
 * work the queue.
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

export default function OwnerDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const { can, organization } = useAccess();
  const { pendingApprovalsCount } = useErp();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setSummary(await fetchErpDashboardSummary(token));
      setError(null);
    } catch (err) {
      if (err?.statusCode !== 404) {
        logger.warn('OwnerDashboard', `Summary failed: ${err?.message}`);
        setError(err?.message || 'Could not load the dashboard.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ')
    || user?.name || 'Owner';
  const initials = (
    `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`
  ).toUpperCase() || 'O';

  const byState = summary?.tripsByState || {};
  const inTransit = byState.DISPATCHED ?? 0;
  const dash = loading ? '—' : undefined;

  // Route names here must match those registered in AppNavigator. The previous
  // version pointed at 'ErpOverview', 'ManagerTabs' and 'DeliveryOrderForm',
  // none of which existed.
  const links = [
    { label: 'Operations', hint: 'Trips, placements, PODs', icon: 'layers-outline', route: 'ERP', show: can('trips.view') },
    { label: 'Finance', hint: 'Receivables and ageing', icon: 'cash-outline', route: 'Finance', show: can('finance.view') },
    { label: 'Sale bills', hint: 'Invoices and outstanding', icon: 'receipt-outline', route: 'SaleBills', show: can('billing.view') },
    { label: 'Ledger', hint: 'Statements and balances', icon: 'book-outline', route: 'Ledger', show: can('ledger.view') },
    { label: 'Approvals', hint: 'Requests awaiting you', icon: 'checkmark-done-outline', route: 'Approvals', show: can('approvals.view') },
  ].filter((l) => l.show);

  return (
    <View style={styles.flex}>
      <StatusBar style="dark" />

      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.avatar}>
          <AppText weight="extrabold" color={colors.primary} style={styles.avatarText}>{initials}</AppText>
        </View>
        <View style={styles.headerText}>
          <AppText variant="small" weight="medium" muted numberOfLines={1}>
            {organization?.companyName || 'Fleet owner'}
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={colors.primary}
          />
        }
      >
        {error ? (
          <Card variant="outline" padding={13} style={styles.errorCard}>
            <AppText variant="small" weight="semibold" color={colors.error}>{error}</AppText>
            <AppText variant="caption" muted style={styles.errorHint}>Pull down to retry.</AppText>
          </Card>
        ) : null}

        {/* Money first — it is why an owner opens this. */}
        {can('finance.view') && (
          <View style={styles.moneyRow}>
            <Card padding={16} elevated="sm" style={styles.moneyCard}>
              <AppText variant="caption" muted weight="medium">RECEIVABLE</AppText>
              <MoneyText
                amount={dash ? null : summary?.receivables?.total}
                compact
                variant="h2"
                weight="extrabold"
                color={colors.primaryDeep}
              />
              {summary?.receivables?.overdue ? (
                <View style={styles.subRow}>
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
                amount={dash ? null : summary?.payables?.total}
                compact
                variant="h2"
                weight="extrabold"
                color={colors.primaryDeep}
              />
              {summary?.unadjustedReceipts?.total ? (
                <View style={styles.subRow}>
                  <AppText variant="caption" muted weight="medium">unadjusted</AppText>
                  <MoneyText
                    amount={summary.unadjustedReceipts.total}
                    compact
                    variant="caption"
                    weight="bold"
                  />
                </View>
              ) : null}
            </Card>
          </View>
        )}

        {/* Things needing a decision. Approvals are Owner-decidable, so this is
            actionable here in a way it is not for a manager. */}
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
                  {pendingApprovalsCount} need{pendingApprovalsCount === 1 ? 's' : ''} your approval
                </AppText>
                <AppText variant="caption" muted weight="medium">
                  Over-budget advances, shortages, margin breaches
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.border} />
            </View>
          </Card>
        ) : null}

        <AppText variant="label" muted style={styles.sectionTitle}>OPERATIONS</AppText>
        <View style={styles.statRow}>
          <StatTile label="In transit" value={dash ?? inTransit} />
          <StatTile label="Open DOs" value={dash ?? (summary?.pendingDosCount ?? 0)} />
          <StatTile label="Placed today" value={dash ?? (summary?.placementsTodayCount ?? 0)} />
        </View>

        <Card padding={16} elevated="sm" style={styles.card}>
          {[
            ['Awaiting CN', summary?.pendingCnsCount, 'Consignments'],
            ['Awaiting close', summary?.pendingTripCloseCount, 'TripList'],
            ['Awaiting POD', summary?.pendingPodCount, 'Pods'],
            ['Awaiting unloading', summary?.pendingUnloadingCount, 'UnloadingList'],
            ['Awaiting billing', summary?.pendingBillSubmissionCount, 'SaleBills'],
          ].map(([label, count, route], i, arr) => (
            <Pressable
              key={label}
              disabled={!route}
              onPress={route ? () => navigation.navigate(route) : undefined}
              style={[styles.queueRow, i < arr.length - 1 && styles.queueRowBorder]}
            >
              <AppText variant="small" weight="semibold" style={styles.queueLabel}>{label}</AppText>
              <AppText variant="bodyStrong" weight="extrabold" color={colors.primaryDeep}>
                {loading ? '—' : (count ?? 0)}
              </AppText>
              {route ? <Ionicons name="chevron-forward" size={15} color={colors.border} /> : <View style={styles.spacer} />}
            </Pressable>
          ))}
        </Card>

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
            <View key={key} style={[styles.boardRow, i < arr.length - 1 && styles.boardRowBorder]}>
              <Badge tone={tone} label={label} />
              <AppText variant="bodyStrong" weight="extrabold" style={styles.boardCount}>
                {loading ? '—' : (byState[key] ?? 0)}
              </AppText>
            </View>
          ))}
        </Card>

        {links.length > 0 && (
          <>
            <AppText variant="label" muted style={styles.sectionTitle}>GO TO</AppText>
            <Card padding={0} elevated="sm" style={styles.card}>
              {links.map((l, i) => (
                <Pressable
                  key={l.route}
                  onPress={() => navigation.navigate(l.route)}
                  style={[styles.linkRow, i < links.length - 1 && styles.linkRowBorder]}
                >
                  <View style={styles.linkIcon}>
                    <Ionicons name={l.icon} size={18} color={colors.primary} />
                  </View>
                  <View style={styles.linkText}>
                    <AppText variant="bodyStrong" weight="semibold">{l.label}</AppText>
                    <AppText variant="caption" muted weight="medium">{l.hint}</AppText>
                  </View>
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

function StatTile({ label, value }) {
  return (
    <View style={styles.statTile}>
      <AppText variant="h2" weight="extrabold" color={colors.primaryDeep}>{value}</AppText>
      <AppText variant="caption" muted weight="medium" numberOfLines={1}>{label}</AppText>
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

  moneyRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  moneyCard: { flex: 1 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },

  approvalCard: { borderLeftWidth: 3, borderLeftColor: colors.warning },
  approvalRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  approvalIcon: {
    width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.pendingBg,
    alignItems: 'center', justifyContent: 'center',
  },
  approvalText: { flex: 1 },

  statRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  statTile: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: 15, borderWidth: 1, borderColor: colors.border, gap: 2,
  },

  queueRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  queueRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  queueLabel: { flex: 1 },
  spacer: { width: 15 },

  boardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  boardRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  boardCount: { flex: 1, textAlign: 'right' },

  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14, paddingHorizontal: 16 },
  linkRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  linkIcon: {
    width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.tealTint,
    alignItems: 'center', justifyContent: 'center',
  },
  linkText: { flex: 1 },
});
