/**
 * FinanceScreen.js — receivables, payables and ageing.
 *
 * GET /api/erp/finance-hub/summary  and  /ageing
 *
 * Every figure previously on this screen was invented — ₹24,50,000 revenue,
 * "+12% from last month", 18 unbilled LRs, a two-tone bar with hardcoded 65/35
 * widths, and a `setTimeout` standing in for a fetch. All of it is now read from
 * the finance hub, and the ageing bar is proportional to real bucket amounts.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useAccess } from '../../context/AccessContext';
import { fetchFinanceHubSummary, fetchFinanceAgeing } from '../../services/erpApi';
import {
  AppText, Card, SubHeader, MoneyText, AgeingBar, EmptyState,
  colors, radius,
} from '../../components/ui';
import logger from '../../utils/logger';

export default function FinanceScreen({ navigation }) {
  const { token } = useAuth();
  const { can } = useAccess();

  const [summary, setSummary] = useState(null);
  const [ageing, setAgeing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [sum, buckets] = await Promise.all([
        fetchFinanceHubSummary(token),
        fetchFinanceAgeing(token).then((r) => r.results).catch(() => []),
      ]);
      setSummary(sum);
      setAgeing(buckets);
      setError(null);
    } catch (err) {
      if (err?.statusCode === 404) {
        setError(null); // module not enabled for this org
      } else {
        logger.warn('Finance', `Load failed: ${err?.message}`);
        setError(err?.message || 'Could not load finance figures.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (!can('finance.view')) {
    return (
      <View style={styles.flex}>
        <StatusBar style="dark" />
        <SubHeader title="Finance" onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined} />
        <EmptyState
          icon="lock-closed-outline"
          title="Not available"
          message="Your role does not include finance access."
        />
      </View>
    );
  }

  const net = summary?.netOutstanding
    ?? (Number(summary?.receivableTotal || 0) - Number(summary?.payableTotal || 0));

  return (
    <View style={styles.flex}>
      <StatusBar style="dark" />
      <SubHeader
        title="Finance"
        subtitle="Receivables, payables and ageing"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />

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

        <Card variant="tinted" padding={20} style={styles.card}>
          <AppText variant="caption" muted weight="medium">NET OUTSTANDING</AppText>
          <MoneyText
            amount={loading ? null : net}
            variant="display"
            weight="extrabold"
            color={colors.primaryDeep}
          />
          <AppText variant="small" muted style={styles.netHint}>
            Receivable less payable
          </AppText>
        </Card>

        <View style={styles.pairRow}>
          <Card padding={16} elevated="sm" style={styles.pairCard}>
            <AppText variant="caption" muted weight="medium">RECEIVABLE</AppText>
            <MoneyText
              amount={loading ? null : summary?.receivableTotal}
              compact
              variant="h2"
              weight="extrabold"
              color={colors.success}
            />
          </Card>
          <Card padding={16} elevated="sm" style={styles.pairCard}>
            <AppText variant="caption" muted weight="medium">PAYABLE</AppText>
            <MoneyText
              amount={loading ? null : summary?.payableTotal}
              compact
              variant="h2"
              weight="extrabold"
              color={colors.warning}
            />
          </Card>
        </View>

        {summary?.unbilledTrips != null || summary?.revenueMtd != null ? (
          <View style={styles.pairRow}>
            {summary?.revenueMtd != null ? (
              <Card padding={16} elevated="sm" style={styles.pairCard}>
                <AppText variant="caption" muted weight="medium">REVENUE MTD</AppText>
                <MoneyText
                  amount={summary.revenueMtd}
                  compact
                  variant="h3"
                  weight="extrabold"
                  color={colors.primaryDeep}
                />
                {summary.revenuePrevMtd ? (
                  <Delta current={summary.revenueMtd} previous={summary.revenuePrevMtd} />
                ) : null}
              </Card>
            ) : null}
            {summary?.unbilledTrips != null ? (
              <Card padding={16} elevated="sm" style={styles.pairCard}>
                <AppText variant="caption" muted weight="medium">UNBILLED TRIPS</AppText>
                <AppText variant="h3" weight="extrabold" color={colors.primaryDeep}>
                  {summary.unbilledTrips}
                </AppText>
                <AppText variant="caption" muted>awaiting a sale bill</AppText>
              </Card>
            ) : null}
          </View>
        ) : null}

        <AppText variant="label" muted style={styles.sectionTitle}>RECEIVABLES BY AGE</AppText>
        <Card padding={18} elevated="sm" style={styles.card}>
          {loading ? (
            <AppText variant="small" muted>Loading…</AppText>
          ) : (
            <AgeingBar buckets={ageing} />
          )}
        </Card>

        <View style={styles.footNote}>
          <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} />
          <AppText variant="caption" muted style={styles.footNoteText}>
            Ledger entries are posted by a background worker, so a receipt recorded
            moments ago may not be reflected here yet.
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}

/** Month-on-month change, computed from two real figures rather than asserted. */
function Delta({ current, previous }) {
  const prev = Number(previous);
  if (!prev) return null;
  const pct = Math.round(((Number(current) - prev) / prev) * 100);
  const up = pct >= 0;
  return (
    <View style={styles.deltaRow}>
      <Ionicons
        name={up ? 'trending-up' : 'trending-down'}
        size={13}
        color={up ? colors.success : colors.error}
      />
      <AppText variant="caption" weight="bold" color={up ? colors.success : colors.error}>
        {up ? '+' : ''}{pct}% vs last month
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 22, paddingBottom: 48 },
  card: { marginBottom: 14 },
  errorCard: {
    borderColor: colors.error, backgroundColor: colors.expiredBg,
    borderRadius: radius.md, marginBottom: 14,
  },
  errorHint: { marginTop: 3 },
  netHint: { marginTop: 4 },
  pairRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  pairCard: { flex: 1 },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  sectionTitle: { marginTop: 8, marginBottom: 12, letterSpacing: 0.5 },
  footNote: { flexDirection: 'row', gap: 8, marginTop: 6 },
  footNoteText: { flex: 1 },
});
