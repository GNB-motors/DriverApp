import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import dayjs from 'dayjs';
import { AppText, Card, colors, radius } from '../../components/ui';
import OwnerShell from './OwnerShell';
import { SectionHeader, Loading, EmptyState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import ownerService from '../../services/ownerService';

const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

/** finance-hub ageing bucket keys → the words the web ERP uses. */
const BUCKET_LABEL = {
  CURRENT: 'Not yet due',
  '1-30': 'Overdue 1–30 d',
  '31-60': 'Overdue 31–60 d',
  '61-90': 'Overdue 61–90 d',
  '90+': 'Overdue 90+ d',
  UNKNOWN: 'No due date',
};

/** Two-column figure row — the repeating unit of every card on this screen. */
function Split({ left, leftValue, leftTone, right, rightValue, rightTone }) {
  return (
    <View style={styles.split}>
      <View style={{ gap: 3, flex: 1 }}>
        <AppText variant="caption" muted numberOfLines={1}>{left}</AppText>
        <AppText variant="bodyStrong" weight="bold" color={leftTone} numberOfLines={1}>{leftValue}</AppText>
      </View>
      <View style={{ gap: 3, flex: 1, alignItems: 'flex-end' }}>
        <AppText variant="caption" muted numberOfLines={1}>{right}</AppText>
        <AppText variant="bodyStrong" weight="bold" color={rightTone} numberOfLines={1}>{rightValue}</AppText>
      </View>
    </View>
  );
}

/**
 * O9 · Business overview — the money picture.
 *
 * Backed by /erp/finance-hub/summary, the same endpoint the web ErpFinance page
 * uses. (The ERP dashboard endpoint carries operational counters only — those
 * live on the Dashboard screen's pipeline card.)
 */
export default function OwnerErpScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const { token } = useAuth();
  const useReal = apiConfigured() && !!token;

  // Last 30 days, matching the web's default finance window.
  const range = useMemo(() => ({
    from: dayjs().subtract(29, 'day').format('YYYY-MM-DD'),
    to: dayjs().format('YYYY-MM-DD'),
  }), []);

  const { data: fin, loading, error, refetch } = useApi(
    () => ownerService.getFinanceSummary(range),
    [range.from, range.to],
    { enabled: useReal, fallback: null },
  );
  // Ageing answers "when does it land", which the summary's overdue/due-this-week
  // pair cannot when everything falls due next month.
  const { data: ageingApi, refetch: refetchAgeing } = useApi(
    () => ownerService.getFinanceAgeing({ side: 'RECEIVABLE' }),
    [],
    { enabled: useReal, fallback: null },
  );

  // /erp/finance-hub/summary → { receivables, payables, net, unapplied, inFlight, cashMovement }
  const e = useMemo(() => {
    if (!fin) return null;
    const rec = fin.receivables || {};
    const pay = fin.payables || {};
    const cash = fin.cashMovement || {};
    const unapplied = fin.unapplied || {};
    const inFlight = fin.inFlight || {};
    const net = Number(fin.net?.position) || 0;

    return {
      net,
      netLabel: money(net),
      receivable: {
        total: money(rec.total),
        overdue: Number(rec.overdue) || 0,
        overdueLabel: money(rec.overdue),
        dueThisWeek: money(rec.dueThisWeek),
        count: Number(rec.billCount) || 0,
        parties: Number(rec.partyCount) || 0,
      },
      payable: {
        total: money(pay.total),
        overdue: Number(pay.overdue) || 0,
        overdueLabel: money(pay.overdue),
        vendor: money(pay.vendor?.total),
        supplier: money(pay.supplier?.total),
        vendorCount: Number(pay.vendor?.count) || 0,
        supplierCount: Number(pay.supplier?.count) || 0,
      },
      cash: {
        in: money(cash.in),
        out: money(cash.out),
        net: Number(cash.net) || 0,
        netLabel: money(cash.net),
        inCount: Number(cash.inCount) || 0,
        outCount: Number(cash.outCount) || 0,
      },
      unapplied: {
        receipts: Number(unapplied.receipts?.amount) || 0,
        receiptsLabel: money(unapplied.receipts?.amount),
        receiptsCount: Number(unapplied.receipts?.count) || 0,
        onAccount: Number(unapplied.onAccount?.amount) || 0,
        onAccountLabel: money(unapplied.onAccount?.amount),
        onAccountCount: Number(unapplied.onAccount?.count) || 0,
      },
      inFlight: {
        pending: Number(inFlight.pendingApproval?.amount) || 0,
        pendingLabel: money(inFlight.pendingApproval?.amount),
        pendingCount: Number(inFlight.pendingApproval?.count) || 0,
        release: Number(inFlight.awaitingRelease?.amount) || 0,
        releaseLabel: money(inFlight.awaitingRelease?.amount),
        releaseCount: Number(inFlight.awaitingRelease?.count) || 0,
      },
    };
  }, [fin]);

  // Only buckets carrying money are worth a row; a column of zeros is noise.
  const ageing = useMemo(() => {
    const buckets = ageingApi?.receivable?.buckets;
    if (!Array.isArray(buckets)) return [];
    return buckets
      .filter((b) => Number(b?.amount) > 0)
      .map((b) => ({
        key: b.bucket,
        label: BUCKET_LABEL[b.bucket] || b.bucket,
        amount: money(b.amount),
        count: Number(b.count) || 0,
        overdue: b.bucket !== 'CURRENT' && b.bucket !== 'UNKNOWN',
      }));
  }, [ageingApi]);

  const onRefresh = () => { refetch(); refetchAgeing(); };

  const periodLabel = `${dayjs(range.from).format('DD MMM')} – ${dayjs(range.to).format('DD MMM')}`;

  return (
    <OwnerShell title="Business overview" subtitle={periodLabel} navigation={navigation} active="OwnerErp">
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {loading ? (
          <Loading />
        ) : error ? (
          <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={onRefresh} />
        ) : !e ? (
          <EmptyState icon="stats-chart-outline" title="No overview yet" message="Business metrics will appear here once bills and payments are recorded." />
        ) : (
          <>
            <LinearGradient colors={colors.gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.hero}>
              <AppText variant="label" color={colors.onPrimaryMuted}>Net position</AppText>
              <AppText weight="bold" color={colors.white} numberOfLines={1} style={styles.heroBig}>{e.netLabel}</AppText>
              <View style={styles.heroDivider} />
              <View style={styles.heroFoot}>
                <AppText variant="caption" color={colors.onPrimaryMuted}>Receivables {e.receivable.total}</AppText>
                <AppText variant="caption" color={colors.onPrimaryMuted}>Payables {e.payable.total}</AppText>
              </View>
            </LinearGradient>

            {/* Each card leads with its own total. Showing only the breakdown
                made a ₹1.45 L receivable read as ₹0 whenever nothing happened
                to be overdue or due this week. */}
            <Card elevated="sm" padding={16}>
              <SectionHeader
                label="Receivables"
                right={<AppText variant="caption" muted>{e.receivable.count} bills · {e.receivable.parties} parties</AppText>}
              />
              <AppText mono weight="medium" style={styles.cardTotal}>{e.receivable.total}</AppText>
              <View style={styles.divider} />
              <Split
                left="Overdue"
                leftValue={e.receivable.overdueLabel}
                leftTone={e.receivable.overdue > 0 ? colors.error : colors.textMuted}
                right="Due this week"
                rightValue={e.receivable.dueThisWeek}
              />
              {ageing.length ? (
                <View style={styles.buckets}>
                  {ageing.map((b) => (
                    <View key={b.key} style={styles.bucketRow}>
                      <AppText variant="small" muted numberOfLines={1} style={{ flex: 1 }}>
                        {b.label} · {b.count} {b.count === 1 ? 'bill' : 'bills'}
                      </AppText>
                      <AppText mono variant="small" weight="semibold" color={b.overdue ? colors.error : colors.text}>
                        {b.amount}
                      </AppText>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>

            <Card elevated="sm" padding={16}>
              <SectionHeader
                label="Payables"
                right={<AppText variant="caption" muted>{e.payable.vendorCount + e.payable.supplierCount} open</AppText>}
              />
              <AppText mono weight="medium" style={styles.cardTotal}>{e.payable.total}</AppText>
              <View style={styles.divider} />
              <Split
                left="Vendors"
                leftValue={e.payable.vendor}
                right="Suppliers"
                rightValue={e.payable.supplier}
              />
              {e.payable.overdue > 0 ? (
                <AppText variant="caption" color={colors.error} style={styles.note}>{e.payable.overdueLabel} overdue</AppText>
              ) : null}
            </Card>

            <Card elevated="sm" padding={16}>
              <SectionHeader label="Cash movement" right={<AppText variant="caption" muted>{periodLabel}</AppText>} />
              <Split
                left={`In · ${e.cash.inCount}`}
                leftValue={e.cash.in}
                leftTone={colors.success}
                right={`Out · ${e.cash.outCount}`}
                rightValue={e.cash.out}
                rightTone={colors.error}
              />
              <View style={styles.divider} />
              <View style={styles.netRow}>
                <AppText variant="small" muted>Net</AppText>
                <AppText variant="bodyStrong" weight="bold" color={e.cash.net >= 0 ? colors.success : colors.error}>
                  {e.cash.netLabel}
                </AppText>
              </View>
            </Card>

            {(e.unapplied.receipts > 0 || e.unapplied.onAccount > 0) ? (
              <Card elevated="sm" padding={16}>
                <SectionHeader label="Unapplied" right={<AppText variant="caption" muted>not yet against a bill</AppText>} />
                <Split
                  left={`Receipts · ${e.unapplied.receiptsCount}`}
                  leftValue={e.unapplied.receiptsLabel}
                  leftTone={colors.warning}
                  right={`On account · ${e.unapplied.onAccountCount}`}
                  rightValue={e.unapplied.onAccountLabel}
                  rightTone={colors.warning}
                />
              </Card>
            ) : null}

            {(e.inFlight.pending > 0 || e.inFlight.release > 0) ? (
              <Card elevated="sm" padding={16}>
                <SectionHeader label="In flight" />
                <Split
                  left={`Pending approval · ${e.inFlight.pendingCount}`}
                  leftValue={e.inFlight.pendingLabel}
                  right={`Awaiting release · ${e.inFlight.releaseCount}`}
                  rightValue={e.inFlight.releaseLabel}
                />
              </Card>
            ) : null}
          </>
        )}
      </ScrollView>
    </OwnerShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 18, gap: 14 },
  hero: { borderRadius: radius.xl, padding: 18, gap: 10 },
  heroBig: { fontSize: 34, lineHeight: 40 },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.18)' },
  heroFoot: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  cardTotal: { fontSize: 26, lineHeight: 32, marginTop: 8 },
  buckets: { marginTop: 12, gap: 7, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  bucketRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  split: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 12 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  netRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  note: { marginTop: 10 },
});
