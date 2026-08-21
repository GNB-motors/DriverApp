import React, { useMemo } from 'react';
import { View, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, Card, WarningBanner, colors, spacing } from '../../components/ui';
import { BackHeader, Pill, LedgerRow, SectionHeader, toneColor } from '../../components/ui';
import * as own from '../../demo/ownerMock';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import walletService from '../../services/walletService';

/** O6 · Driver account — settle up. */
export default function OwnerDriverScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const driver = own.ownerDriver;

  // Driver ledger + balance summary → real when a backend is configured and we
  // have a driver id (route param, else the mock's id). Otherwise demo mock.
  const { token } = useAuth();
  const driverId = route?.params?.driverId || route?.params?.id || driver.id || driver._id || null;
  const useReal = apiConfigured() && !!driverId && !!token && token !== 'demo-token';
  const { data: summaryApi, loading: summaryLoading } = useApi(
    () => walletService.getDriverSummary(driverId),
    [driverId],
    { enabled: useReal, fallback: null },
  );
  const { data: ledgerApi, loading: ledgerLoading } = useApi(
    () => walletService.getDriverLedger(driverId),
    [driverId],
    { enabled: useReal, fallback: null },
  );

  // mapping to confirm against live API — spread mock first; breakdown shape is
  // unconfirmed so it stays on mock.
  const d = useMemo(() => {
    if (!useReal || (!summaryApi && !ledgerApi)) return driver;
    const s = summaryApi || {};
    const owe = s.balance ?? s.owe ?? s.netBalance ?? s.amount;
    const raw = Array.isArray(ledgerApi)
      ? ledgerApi
      : (ledgerApi?.entries || ledgerApi?.results || ledgerApi?.rows || []);
    const ledger = raw.length
      ? raw.map((e, i) => {
          const lm = driver.ledger[i] || {};
          const amt = e.amount ?? e.delta;
          const credit = /cred/i.test(String(e.direction || e.dir || e.type || ''))
            || (amt != null && Number(amt) >= 0);
          const bal = e.runningBalance ?? e.balance;
          return {
            title: e.title || e.category || e.description || lm.title,
            meta: e.meta || e.remarks || lm.meta,
            delta: amt != null
              ? `${credit ? '+' : '−'}₹${Math.abs(Number(amt)).toLocaleString('en-IN')}`
              : lm.delta,
            dir: e.dir || (credit ? 'credit' : 'debit'),
            balance: bal != null ? `₹${Number(bal).toLocaleString('en-IN')}` : lm.balance,
          };
        })
      : driver.ledger;
    return {
      ...driver,
      name: s.driverName || s.name || driver.name,
      plate: s.vehicleNumber || s.plate || driver.plate,
      owe: owe != null ? `₹${Number(owe).toLocaleString('en-IN')}` : driver.owe,
      ledger,
    };
  }, [useReal, summaryApi, ledgerApi, driver]);

  return (
    <View style={styles.container}>
      <BackHeader title={d.name} subtitle={d.plate} onBack={() => navigation.goBack()} right={<Pill tone="success" label="Active" />} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
          {useReal && (ledgerLoading || summaryLoading) ? (
            <ActivityIndicator color={colors.primary} style={{ margin: 24 }} />
          ) : d.ledger.map((e, i) => (
            <View key={e.title}>
              {i > 0 ? <View style={styles.rowDivider} /> : null}
              <LedgerRow item={e} />
            </View>
          ))}
        </Card>

        <WarningBanner tone="info" message="Settling records a payout and resets his wallet to zero. The pending ₹1,250 stays out of it until you confirm that bill." />
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
