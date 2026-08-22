import React, { useMemo } from 'react';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, Card, WarningBanner, Loading, EmptyState, colors, spacing } from '../../components/ui';
import { BackHeader, Pill, LedgerRow, SectionHeader, toneColor } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import walletService from '../../services/walletService';

/** O6 · Driver account — settle up. */
export default function OwnerDriverScreen({ navigation, route }) {
  usePreventScreenCapture(); // block screenshots/recording of driver settlement/PII
  const insets = useSafeAreaInsets();

  // Driver ledger + balance summary — real API only, keyed by the driver id
  // resolved from the route params.
  const { token } = useAuth();
  const driverId = route?.params?.driverId || route?.params?.id || null;
  const useReal = apiConfigured() && !!token && !!driverId;
  const { data: summaryApi, loading: summaryLoading, error, refetch: refetchSummary } = useApi(
    () => walletService.getDriverSummary(driverId),
    [driverId],
    { enabled: useReal, fallback: null },
  );
  const { data: ledgerApi, loading: ledgerLoading, refetch: refetchLedger } = useApi(
    () => walletService.getDriverLedger(driverId),
    [driverId],
    { enabled: useReal, fallback: null },
  );
  const loading = useReal && (summaryLoading || ledgerLoading);
  const onRefresh = () => { refetchSummary(); refetchLedger(); };

  // Map the summary + ledger into the existing UI shape defensively; missing
  // fields fall back to '—'/0. (mapping to confirm)
  const d = useMemo(() => {
    const s = summaryApi || {};
    const inr = (n, sign = '') =>
      n == null ? '—' : `${sign}₹${Math.abs(Number(n)).toLocaleString('en-IN')}`;
    const owe = s.balance ?? s.owe ?? s.netBalance ?? s.amount;
    const raw = Array.isArray(ledgerApi)
      ? ledgerApi
      : (ledgerApi?.entries || ledgerApi?.results || ledgerApi?.rows || []);
    const ledger = raw.map((e) => {
      const amt = e.amount ?? e.delta;
      const credit = /cred/i.test(String(e.direction || e.dir || e.type || ''))
        || (amt != null && Number(amt) >= 0);
      const bal = e.runningBalance ?? e.balance;
      return {
        title: e.title || e.category || e.description || '—',
        meta: e.meta || e.remarks || '',
        delta: amt != null
          ? `${credit ? '+' : '−'}₹${Math.abs(Number(amt)).toLocaleString('en-IN')}`
          : '—',
        dir: e.dir || (credit ? 'credit' : 'debit'),
        balance: bal != null ? `₹${Number(bal).toLocaleString('en-IN')}` : undefined,
      };
    });
    return {
      name: s.driverName || s.name || '—',
      plate: s.vehicleNumber || s.plate || '—',
      owe: inr(owe),
      breakdown: [
        { label: 'Confirmed bills', value: inr(s.confirmedTotal, '+'), color: 'success' },
        { label: 'Advances paid', value: inr(s.advancesTotal, '−'), color: 'error' },
        { label: 'Pending confirmation', value: inr(s.pendingTotal ?? s.pending), color: 'warning' },
      ],
      ledger,
    };
  }, [summaryApi, ledgerApi]);

  const hasData = !!summaryApi || d.ledger.length > 0;
  const showEmpty = !driverId || (!loading && !hasData);

  return (
    <View style={styles.container}>
      <BackHeader title={d.name} subtitle={d.plate} onBack={() => navigation.goBack()} right={<Pill tone="success" label="Active" />} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {loading ? (
          <Loading />
        ) : error ? (
          <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={onRefresh} />
        ) : showEmpty ? (
          <EmptyState
            icon="wallet-outline"
            title={driverId ? 'Nothing to settle' : 'No driver selected'}
            message={driverId ? 'This driver has no bills or advances yet.' : 'Open a driver from the Money screen to settle up.'}
          />
        ) : (
          <>
            <Card elevated="sm" padding={16}>
              <AppText variant="label" muted>You owe him</AppText>
              <AppText mono weight="semibold" style={styles.big}>{d.owe}</AppText>
              <View style={styles.divider} />
              {d.breakdown.map((b) => (
                <View key={b.label} style={styles.kv}>
                  <AppText variant="small" muted>{b.label}</AppText>
                  <AppText mono variant="bodyStrong" weight="semibold" color={toneColor(b.color)}>{b.value}</AppText>
                </View>
              ))}
            </Card>

            <SectionHeader label="Ledger" />
            <Card padding={0} elevated="sm">
              {d.ledger.length === 0 ? (
                <EmptyState icon="receipt-outline" title="No ledger entries yet" />
              ) : d.ledger.map((e, i) => (
                <View key={e.title}>
                  {i > 0 ? <View style={styles.rowDivider} /> : null}
                  <LedgerRow item={e} />
                </View>
              ))}
            </Card>

            <WarningBanner tone="info" message="Settling records a payout and resets his wallet to zero. The pending ₹1,250 stays out of it until you confirm that bill." />
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button variant="secondary" size="lg" label="Pay advance" style={{ flex: 1 }} onPress={() => {}} />
        <Button size="lg" label={`Settle ${d.owe}`} style={{ flex: 1.3 }} onPress={() => navigation.goBack()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, gap: 12 },
  big: { fontSize: 32, lineHeight: 36, marginVertical: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  kv: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  rowDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 13 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});
