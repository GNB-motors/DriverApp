import React, { useState, useMemo } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import {
  AppText, Button, Card, StatusBadge, SegmentedControl, ProgressBar, WarningBanner,
  colors, spacing, radius,
} from '../../../components/ui';
import * as mock from '../../../demo/mock';
import { useAuth } from '../../../context/AuthContext';
import { apiConfigured } from '../../../services/client';
import { useApi } from '../../../hooks/useApi';
import walletService from '../../../services/walletService';

/**
 * 06 / 07 / 08 · Wallet — Bills, Ledger and empty state. UI-only demo.
 */
export default function WalletScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('bills');
  const { wallet, bills, ledger, spendByCategory } = mock;
  const isEmpty = bills.length === 0;

  // Ledger tab → real khata when a backend is configured (else demo mock).
  const { user, token } = useAuth();
  const driverId = user?._id;
  const useReal = apiConfigured() && !!driverId && !!token && token !== 'demo-token';
  const { data: ledgerApi, loading: ledgerLoading } = useApi(
    () => walletService.getDriverLedger(driverId),
    [driverId],
    { enabled: useReal, fallback: null },
  );

  // Map khata entries → the LedgerView row shape. (Field mapping to confirm
  // against live responses; falls back to mock when absent/empty.)
  const ledgerRows = useMemo(() => {
    if (!useReal || !ledgerApi) return ledger;
    const entries = Array.isArray(ledgerApi)
      ? ledgerApi
      : ledgerApi.entries || ledgerApi.results || ledgerApi.rows || [];
    if (!entries.length) return ledger;
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
  }, [useReal, ledgerApi, ledger]);

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
        <AppText mono weight="semibold" color={colors.white} style={styles.balance}>{wallet.balance}</AppText>
        <AppText variant="small" color={colors.onPrimaryMuted}>Company owes you this much</AppText>
        <View style={styles.heroChips}>
          <View style={styles.heroChip}><AppText mono variant="small" weight="semibold" color={colors.white}>{wallet.confirmed}</AppText></View>
          <View style={styles.heroChip}><AppText mono variant="small" weight="semibold" color={colors.white}>{wallet.advancesPaid}</AppText></View>
        </View>
      </LinearGradient>

      <View style={styles.sheet}>
        <SegmentedControl
          variant="pill"
          options={[{ label: 'Bills', value: 'bills', badge: wallet.pendingCount || undefined }, { label: 'Ledger', value: 'ledger' }]}
          value={tab}
          onChange={setTab}
          style={styles.segment}
        />

        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]} showsVerticalScrollIndicator={false}>
          {tab === 'bills' ? (
            isEmpty ? (
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
          ) : useReal && ledgerLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : (
            <LedgerView ledger={ledgerRows} spend={spendByCategory} />
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

      <Card elevated="sm" padding={16}>
        <AppText variant="label" muted style={{ marginBottom: 10 }}>Spend by category</AppText>
        <View style={{ gap: 8 }}>
          {spend.map((s) => (
            <ProgressBar key={s.label} label={s.label} percent={s.percent} value={s.value} />
          ))}
        </View>
      </Card>
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
