import React, { useMemo } from 'react';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { AppText, Card, Loading, EmptyState, colors } from '../../components/ui';
import { BackHeader, LedgerRow, SectionHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import walletService from '../../services/walletService';

const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

/** Turn a { CATEGORY: amount } map into sorted rows with readable labels. */
const breakdownRows = (map) =>
  Object.entries(map || {})
    .filter(([, v]) => Number(v))
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .map(([key, value]) => ({
      label: key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()),
      value: money(value),
    }));

/**
 * O6 · Driver account — what the business owes one driver.
 *
 * Read-only: the khata API exposes GET routes only (khata.routes.js), so there is
 * no settle or advance-payout call to make from here. Settlement happens in the
 * back office; this screen is the statement.
 */
export default function OwnerDriverScreen({ navigation, route }) {
  usePreventScreenCapture(); // block screenshots/recording of driver settlement/PII
  const insets = useSafeAreaInsets();

  const { token } = useAuth();
  const driverId = route?.params?.driverId || route?.params?.id || null;
  // The list screen already knows the name; passing it avoids a blank header,
  // since the khata summary payload carries figures only.
  const passedName = route?.params?.name || '';
  const passedMeta = route?.params?.mobile || '';

  const useReal = apiConfigured() && !!token && !!driverId;
  const { data: summaryApi, loading: summaryLoading, error, refetch: refetchSummary } = useApi(
    () => walletService.getDriverSummary(driverId),
    [driverId],
    { enabled: useReal, fallback: null },
  );
  const { data: ledgerApi, loading: ledgerLoading, refetch: refetchLedger } = useApi(
    () => walletService.getDriverLedger(driverId, { limit: 100 }),
    [driverId],
    { enabled: useReal, fallback: null },
  );
  const loading = useReal && (summaryLoading || ledgerLoading);
  const onRefresh = () => { refetchSummary(); refetchLedger(); };

  // /khata/drivers/:id/summary → { totalAmount, byCategory, bySource, byVehicle,
  //                                unattributedAmount, count }
  // /khata/drivers/:id/ledger  → { results: [{ title, amount, category,
  //                                description, expenseDate, vehicle, source }] }
  const d = useMemo(() => {
    const s = summaryApi || {};
    const raw = Array.isArray(ledgerApi)
      ? ledgerApi
      : (ledgerApi?.results || ledgerApi?.entries || ledgerApi?.rows || []);

    // Every khata row is money the driver spent on the firm's behalf, so each one
    // increases what he is owed — always a credit.
    const ledger = raw.map((e, i) => ({
      key: e?._id || String(i),
      dir: 'credit',
      title: e?.title || e?.category || e?.description || 'Expense',
      meta: [
        e?.category,
        e?.vehicle?.registrationNumber,
        e?.expenseDate ? dayjs(e.expenseDate).format('DD MMM') : null,
      ].filter(Boolean).join(' · '),
      delta: `+${money(e?.amount)}`,
      balance: '',
    }));

    const unattributed = Number(s.unattributedAmount) || 0;

    return {
      owe: money(s.totalAmount),
      count: Number(s.count) || 0,
      byCategory: breakdownRows(s.byCategory),
      byVehicle: breakdownRows(s.byVehicle),
      unattributed,
      unattributedLabel: money(unattributed),
      ledger,
    };
  }, [summaryApi, ledgerApi]);

  const hasData = !!summaryApi || d.ledger.length > 0;
  const showEmpty = !driverId || (!loading && !hasData);

  return (
    <View style={styles.container}>
      <BackHeader
        title={passedName || 'Driver account'}
        subtitle={passedMeta || (d.count ? `${d.count} ${d.count === 1 ? 'entry' : 'entries'}` : '')}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {loading ? (
          <Loading />
        ) : error ? (
          <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={onRefresh} />
        ) : showEmpty ? (
          <EmptyState
            icon="wallet-outline"
            title={driverId ? 'Nothing to settle' : 'No driver selected'}
            message={driverId ? 'This driver has no bills or advances yet.' : 'Open a driver from the Money screen to see their account.'}
          />
        ) : (
          <>
            <Card elevated="sm" padding={16}>
              <AppText variant="label" muted>You owe him</AppText>
              <AppText weight="bold" style={styles.big}>{d.owe}</AppText>
              {d.byCategory.length ? (
                <>
                  <View style={styles.divider} />
                  {d.byCategory.map((b) => (
                    <View key={b.label} style={styles.kv}>
                      <AppText variant="small" muted>{b.label}</AppText>
                      <AppText variant="bodyStrong" weight="semibold">{b.value}</AppText>
                    </View>
                  ))}
                </>
              ) : null}
              {d.unattributed > 0 ? (
                <AppText variant="caption" color={colors.warning} style={styles.note}>
                  {d.unattributedLabel} not attributed to a vehicle
                </AppText>
              ) : null}
            </Card>

            {d.byVehicle.length ? (
              <Card elevated="sm" padding={16}>
                <SectionHeader label="By vehicle" />
                <View style={{ marginTop: 4 }}>
                  {d.byVehicle.map((b) => (
                    <View key={b.label} style={styles.kv}>
                      <AppText variant="small" muted>{b.label}</AppText>
                      <AppText variant="bodyStrong" weight="semibold">{b.value}</AppText>
                    </View>
                  ))}
                </View>
              </Card>
            ) : null}

            <SectionHeader label="Ledger" />
            <Card padding={0} elevated="sm">
              {d.ledger.length === 0 ? (
                <EmptyState icon="receipt-outline" title="No ledger entries yet" />
              ) : d.ledger.map((e, i) => (
                <View key={e.key}>
                  {i > 0 ? <View style={styles.rowDivider} /> : null}
                  <LedgerRow item={e} />
                </View>
              ))}
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, gap: 12 },
  big: { fontSize: 32, lineHeight: 38, marginVertical: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  kv: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  rowDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 13 },
  note: { marginTop: 10 },
});
