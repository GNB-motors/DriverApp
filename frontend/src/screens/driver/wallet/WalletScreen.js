import React, { useState, useMemo, useCallback } from 'react';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import {
  AppText, Button, Card, StatusBadge, SegmentedControl, ProgressBar, WarningBanner,
  Loading, EmptyState, colors, spacing, radius,
} from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { apiConfigured } from '../../../services/client';
import { useApi } from '../../../hooks/useApi';
import walletService from '../../../services/walletService';
import billService from '../../../services/billService';

/**
 * 06 / 07 / 08 · Wallet — Bills, Ledger and empty state. Real data only.
 */
export default function WalletScreen({ navigation }) {
  usePreventScreenCapture(); // block screenshots/recording of wallet balances
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('bills');

  // Balance + Ledger + Bills → REAL only (no mock fallback).
  const { user, token } = useAuth();
  const driverId = user?._id;
  const useReal = apiConfigured() && !!driverId && !!token && token !== 'demo-token';
  const { data: summaryApi, refetch: refetchSummary } = useApi(() => walletService.getDriverSummary(driverId), [driverId], { enabled: useReal, fallback: null });
  const { data: ledgerApi, loading: ledgerLoading, error: ledgerError, refetch: refetchLedger } = useApi(() => walletService.getDriverLedger(driverId), [driverId], { enabled: useReal, fallback: null });

  // Driver's own bills (backend scopes to the signed-in driver by role).
  const { data: billsApi, loading: billsLoading, error: billsError, refetch: refetchBills } = useApi(
    () => billService.listBills(),
    [driverId],
    { enabled: useReal, fallback: null },
  );
  const onRefresh = () => { refetchSummary(); refetchLedger(); refetchBills(); };
  // Refetch when returning to the wallet (e.g. after submitting a bill).
  useFocusEffect(useCallback(() => { if (useReal) refetchBills(); }, [useReal, refetchBills]));

  // Map bills → the BillRow shape (status lowercased for StatusBadge/BillRow).
  const bills = useMemo(() => {
    const rows = Array.isArray(billsApi) ? billsApi : (billsApi?.results || billsApi?.rows || billsApi?.items || []);
    return rows.map((b, i) => {
      const status = String(b.status || '').toLowerCase();
      const amt = Number(b.amount || 0).toLocaleString('en-IN');
      return {
        id: b._id || String(i),
        category: b.title || b.category || 'Bill',
        status,
        date: b.expenseDate ? dayjs(b.expenseDate).format('DD MMM') : '',
        trip: b.vehicle?.registrationNumber || '',
        amount: status === 'confirmed' ? `+₹${amt}` : `₹${amt}`,
        reason: b.rejectionReason || null,
      };
    });
  }, [billsApi]);
  const pendingCount = bills.filter((b) => b.status === 'pending').length;
  const isEmpty = bills.length === 0;

  // Real balance + summary chips ('—' until the API responds). (mapping to confirm)
  const balance = summaryApi ? `₹${Number(summaryApi.balance ?? summaryApi.totalAmount ?? 0).toLocaleString('en-IN')}` : '—';
  const heroChips = summaryApi
    ? [
        summaryApi.confirmedTotal != null ? `+₹${Number(summaryApi.confirmedTotal).toLocaleString('en-IN')} confirmed` : null,
        summaryApi.advancesTotal != null ? `−₹${Number(summaryApi.advancesTotal).toLocaleString('en-IN')} advances` : null,
      ].filter(Boolean)
    : [];

  // Ledger rows — real entries only (empty → EmptyState). (mapping to confirm)
  const ledgerRows = useMemo(() => {
    const entries = Array.isArray(ledgerApi) ? ledgerApi : ledgerApi?.entries || ledgerApi?.results || ledgerApi?.rows || [];
    return entries.map((e, i) => {
      const when = e.expenseDate || e.date;
      return {
        id: e._id || String(i),
        title: e.title || e.category || 'Entry',
        meta: [when ? dayjs(when).format('DD MMM') : null, e.category].filter(Boolean).join(' · '),
        delta: `+₹${Number(e.amount || 0).toLocaleString('en-IN')}`,
        dir: 'credit',
        balance: e.runningBalance != null ? `₹${Number(e.runningBalance).toLocaleString('en-IN')}` : undefined,
      };
    });
  }, [ledgerApi]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Gradient hero header */}
      <LinearGradient colors={colors.gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[styles.hero, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.heroTop}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </Pressable>
          <AppText variant="h3" weight="extrabold" color={colors.white}>My wallet</AppText>
          <Pressable hitSlop={10} style={styles.statementPill}>
            <AppText variant="caption" weight="bold" color={colors.white}>Statement</AppText>
          </Pressable>
        </View>
        <AppText variant="label" color={colors.onPrimaryMuted} style={styles.balanceLabel}>Balance</AppText>
        <AppText mono weight="semibold" color={colors.white} style={styles.balance}>{balance}</AppText>
        <AppText variant="small" color={colors.onPrimaryMuted}>Company owes you this much</AppText>
        {heroChips.length ? (
          <View style={styles.heroChips}>
            {heroChips.map((c, i) => (
              <View key={i} style={styles.heroChip}><AppText mono variant="small" weight="semibold" color={colors.white}>{c}</AppText></View>
            ))}
          </View>
        ) : null}
      </LinearGradient>

      <View style={styles.sheet}>
        <SegmentedControl
          variant="pill"
          options={[{ label: 'Bills', value: 'bills', badge: pendingCount || undefined }, { label: 'Ledger', value: 'ledger' }]}
          value={tab}
          onChange={setTab}
          style={styles.segment}
        />

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={billsLoading} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {tab === 'bills' ? (
            billsLoading ? (
              <Loading />
            ) : billsError ? (
              <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={onRefresh} />
            ) : isEmpty ? (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}><Ionicons name="receipt-outline" size={40} color={colors.textMuted} /></View>
                <AppText variant="h3" weight="bold" center>No bills yet</AppText>
                <AppText variant="body" muted center style={styles.emptyText}>
                  Paid for toll, food or a repair from your own pocket? Photograph the bill and send it. Once the owner confirms, it lands here.
                </AppText>
              </View>
            ) : (
              bills.map((b) => <BillRow key={b.id} bill={b} onResubmit={() => navigation.navigate('AddBill')} />)
            )
          ) : ledgerLoading ? (
            <Loading />
          ) : ledgerError ? (
            <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={onRefresh} />
          ) : ledgerRows.length === 0 ? (
            <EmptyState icon="receipt-outline" title="No ledger entries yet" message="Confirmed bills and advances will appear here." />
          ) : (
            <LedgerView ledger={ledgerRows} spend={[]} />
          )}
        </ScrollView>

        {/* Sticky CTA */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Button size="lg" icon="add" label={isEmpty ? 'Add your first bill' : 'Add a bill'} onPress={() => navigation.navigate('AddBill')} />
        </View>
      </View>
    </View>
  );
}

function BillRow({ bill, onResubmit }) {
  const rejected = bill.status === 'rejected';
  const confirmed = bill.status === 'confirmed';
  return (
    <Card variant={rejected ? 'outline' : 'surface'} elevated="sm" padding={0} style={[styles.billCard, rejected && styles.billRejected]}>
      <View style={styles.billMain}>
        <View style={[styles.billIcon, rejected && { backgroundColor: colors.expiredBg }]}>
          <Ionicons name={rejected ? 'close' : 'receipt-outline'} size={20} color={rejected ? colors.error : colors.textMuted} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.billTitleRow}>
            <AppText variant="bodyStrong" weight="bold">{bill.category}</AppText>
            <StatusBadge status={bill.status} />
          </View>
          <AppText variant="caption" mono muted>{bill.date} · {bill.trip || bill.by}</AppText>
        </View>
        <AppText
          mono variant="h3" weight="semibold"
          color={confirmed ? colors.success : rejected ? colors.textMuted : colors.text}
          style={rejected ? styles.strike : null}
        >
          {bill.amount}
        </AppText>
      </View>
      {rejected && bill.reason ? (
        <View style={styles.reasonBox}>
          <AppText variant="small" color="#7E2A24" style={styles.reasonText}>
            <AppText variant="small" weight="bold" color="#7E2A24">Reason: </AppText>{bill.reason}
          </AppText>
          <Button variant="danger" size="sm" label="Re-submit bill" fullWidth={false} onPress={onResubmit} style={styles.resubmit} />
        </View>
      ) : null}
    </Card>
  );
}

function LedgerView({ ledger, spend }) {
  return (
    <View style={{ gap: 14 }}>
      <AppText variant="label" muted>August 2026</AppText>
      <Card padding={0} elevated="sm">
        {ledger.map((e, i) => (
          <View key={e.id}>
            {i > 0 ? <View style={styles.ledgerDivider} /> : null}
            <View style={styles.ledgerRow}>
              <View style={[styles.ledgerIcon, { backgroundColor: e.dir === 'credit' ? colors.validBg : colors.expiredBg }]}>
                <Ionicons name={e.dir === 'credit' ? 'arrow-up' : 'arrow-down'} size={15} color={e.dir === 'credit' ? colors.success : colors.error} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="small" weight="semibold">{e.title}</AppText>
                <AppText variant="caption" mono muted>{e.meta}</AppText>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <AppText mono variant="bodyStrong" weight="semibold" color={e.dir === 'credit' ? colors.success : colors.error}>{e.delta}</AppText>
                <AppText variant="caption" mono muted>{e.balance}</AppText>
              </View>
            </View>
          </View>
        ))}
      </Card>

      <WarningBanner tone="info" message="Bills add to the balance only after the owner confirms them. Advances paid to you are subtracted." />

      {spend?.length ? (
        <Card elevated="sm" padding={16}>
          <AppText variant="label" muted style={{ marginBottom: 10 }}>Spend by category</AppText>
          <View style={{ gap: 8 }}>
            {spend.map((s) => (
              <ProgressBar key={s.label} label={s.label} percent={s.percent} value={s.value} />
            ))}
          </View>
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: { paddingHorizontal: 20, paddingBottom: 30 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  backBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.onPrimaryFaint, alignItems: 'center', justifyContent: 'center' },
  statementPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.onPrimaryFaint },
  balanceLabel: { marginBottom: 4 },
  balance: { fontSize: 44, lineHeight: 48 },
  heroChips: { flexDirection: 'row', gap: 10, marginTop: 16 },
  heroChip: { flex: 1, backgroundColor: colors.onPrimaryFaint, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10 },

  sheet: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 26, borderTopRightRadius: 26, marginTop: -18, paddingTop: 16 },
  segment: { marginHorizontal: 20 },
  scroll: { paddingHorizontal: 20, paddingTop: 14, gap: 10 },
  loader: { marginTop: 48 },

  empty: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyIcon: { width: 96, height: 96, borderRadius: 28, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyText: { maxWidth: 300 },

  billCard: { overflow: 'hidden' },
  billRejected: { borderColor: '#F0CFCB' },
  billMain: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
  billIcon: { width: 46, height: 46, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  billTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  strike: { textDecorationLine: 'line-through' },
  reasonBox: { backgroundColor: colors.expiredBg, margin: 10, marginTop: 0, borderRadius: 12, padding: 12, gap: 8 },
  reasonText: { lineHeight: 20 },
  resubmit: { alignSelf: 'flex-start' },

  ledgerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
  ledgerDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 13 },
  ledgerIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 10, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});
