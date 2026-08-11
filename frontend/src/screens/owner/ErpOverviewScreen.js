/**
 * ErpOverviewScreen.js — the owner's entry point into operations.
 *
 * Was a placeholder card reading "General ERP stats … will appear here".
 *
 * Rather than duplicate the manager's queue screens, this is a hub: live counts
 * from GET /api/erp/dashboard/summary, each row landing on the screen that owns
 * that stage. An owner can do everything a manager can, so every row is the same
 * destination the manager uses — there is no separate owner-only copy to keep in
 * sync.
 *
 * Rows are filtered by `can()`, so an org without (say) the unloading module
 * simply does not show that row instead of showing one that 404s.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useAccess } from '../../context/AccessContext';
import { fetchErpDashboardSummary } from '../../services/erpApi';
import {
  AppText, Card, SubHeader, EmptyState, colors, radius,
} from '../../components/ui';
import logger from '../../utils/logger';

export default function ErpOverviewScreen({ navigation }) {
  const { token } = useAuth();
  const { can, hasErpModule, resolved } = useAccess();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setSummary(await fetchErpDashboardSummary(token));
    } catch (err) {
      if (err?.statusCode !== 404) {
        logger.warn('ErpOverview', `Summary failed: ${err?.message}`);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (resolved && !hasErpModule) {
    return (
      <View style={styles.flex}>
        <StatusBar style="dark" />
        <SubHeader title="Operations" />
        <EmptyState
          icon="layers-outline"
          title="ERP not enabled"
          message="This organisation does not have the ERP module switched on."
        />
      </View>
    );
  }

  const byState = summary?.tripsByState || {};
  const count = (n) => (loading ? '—' : (n ?? 0));

  const sections = [
    {
      title: 'PIPELINE',
      rows: [
        {
          label: 'Trips', hint: `${count(byState.DISPATCHED)} in transit`,
          // 'TripList' is the stack route — 'Trips' is a tab name that only
          // exists inside the manager navigator.
          icon: 'map-outline', route: 'TripList', show: can('trips.view'),
        },
        {
          label: 'Placements', hint: `${count(summary?.placementsTodayCount)} placed today`,
          icon: 'grid-outline', route: 'PlacementsAll', show: can('placements.view'),
        },
        {
          label: 'Delivery orders', hint: `${count(summary?.pendingDosCount)} open`,
          icon: 'clipboard-outline', route: 'DeliveryOrders', show: can('dos.view'),
        },
        {
          label: 'Advances', hint: 'Trip funding',
          icon: 'wallet-outline', route: 'Advances', show: can('advances.view'),
        },
      ],
    },
    {
      title: 'PAPERWORK',
      rows: [
        {
          label: 'Consignments', hint: `${count(summary?.pendingCnsCount)} awaiting CN`,
          icon: 'document-text-outline', route: 'Consignments', show: can('cn.view'),
        },
        {
          label: 'PODs', hint: `${count(summary?.pendingPodCount)} awaiting proof`,
          icon: 'mail-open-outline', route: 'Pods', show: can('pod.view'),
        },
        {
          label: 'Unloading', hint: `${count(summary?.pendingUnloadingCount)} to settle`,
          icon: 'swap-vertical-outline', route: 'UnloadingList', show: can('unloading.view'),
        },
      ],
    },
    {
      title: 'MONEY',
      rows: [
        {
          label: 'Sale bills', hint: `${count(summary?.pendingBillSubmissionCount)} to raise`,
          icon: 'receipt-outline', route: 'SaleBills', show: can('billing.view'),
        },
        {
          label: 'Finance', hint: 'Receivables and ageing',
          icon: 'cash-outline', route: 'Finance', show: can('finance.view'),
        },
        {
          label: 'Ledger', hint: 'Statements and balances',
          icon: 'book-outline', route: 'Ledger', show: can('ledger.view'),
        },
      ],
    },
    {
      title: 'DECISIONS',
      rows: [
        {
          label: 'Approvals', hint: `${count(summary?.pendingApprovalsCount)} pending`,
          icon: 'checkmark-done-outline', route: 'Approvals', show: can('approvals.view'),
        },
      ],
    },
  ]
    .map((s) => ({ ...s, rows: s.rows.filter((r) => r.show) }))
    .filter((s) => s.rows.length > 0);

  return (
    <View style={styles.flex}>
      <StatusBar style="dark" />
      <SubHeader title="Operations" subtitle="Everything across the pipeline" />

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
        {sections.length === 0 ? (
          <EmptyState
            icon="lock-closed-outline"
            title="Nothing available"
            message="Your role does not include access to these areas."
          />
        ) : (
          sections.map((section) => (
            <View key={section.title}>
              <AppText variant="label" muted style={styles.sectionTitle}>{section.title}</AppText>
              <Card padding={0} elevated="sm" style={styles.card}>
                {section.rows.map((row, i) => (
                  <Pressable
                    key={row.label}
                    onPress={() => navigation.navigate(row.route)}
                    style={[styles.row, i < section.rows.length - 1 && styles.rowBorder]}
                  >
                    <View style={styles.icon}>
                      <Ionicons name={row.icon} size={18} color={colors.primary} />
                    </View>
                    <View style={styles.text}>
                      <AppText variant="bodyStrong" weight="semibold">{row.label}</AppText>
                      <AppText variant="caption" muted weight="medium">{row.hint}</AppText>
                    </View>
                    <Ionicons name="chevron-forward" size={17} color={colors.border} />
                  </Pressable>
                ))}
              </Card>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 22, paddingBottom: 48 },
  sectionTitle: { marginTop: 8, marginBottom: 12, letterSpacing: 0.5 },
  card: { marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14, paddingHorizontal: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  icon: {
    width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.tealTint,
    alignItems: 'center', justifyContent: 'center',
  },
  text: { flex: 1 },
});
