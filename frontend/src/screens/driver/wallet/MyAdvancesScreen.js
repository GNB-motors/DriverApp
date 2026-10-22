import React, { useMemo } from 'react';
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { AppText, Button, Card, StatusBadge, WarningBanner, Loading, EmptyState, colors, spacing, radius } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { apiConfigured } from '../../../services/client';
import { useApi } from '../../../hooks/useApi';
import advanceService from '../../../services/advanceService';

/**
 * 11 · My advances — payout view. Real data only.
 */
export default function MyAdvancesScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  // My advances → REAL only (no mock fallback). Backend scopes to the signed-in driver.
  const { user, token } = useAuth();
  const driverId = user?._id;
  const enabled = apiConfigured() && !!token;
  const { data: advancesApi, loading, error, refetch } = useApi(
    () => advanceService.listAdvances(driverId ? { driverId } : {}),
    [driverId],
    { enabled, fallback: null },
  );

  // /erp/advances → [{ advanceNumber, status, requestedAmount, netPayable,
  //   totalDeductions, paymentMode, paidAt, createdAt,
  //   tripId: { tripNumber, material, fromLocation, toLocation } }]
  // `deductions` is an array of subdocuments; `totalDeductions` is the figure.
  const rows = useMemo(() => {
    const raw = Array.isArray(advancesApi)
      ? advancesApi
      : (advancesApi?.results || advancesApi?.rows || advancesApi?.items || advancesApi?.data || []);
    const money = (v) => `₹${(Number(v) || 0).toLocaleString('en-IN')}`;
    // StatusBadge keys off its own vocabulary, so the enum maps onto it here.
    const BADGE = {
      PENDING_APPROVAL: { key: 'pending', label: 'Pending approval' },
      APPROVED: { key: 'approved', label: 'Approved' },
      PAID: { key: 'paid', label: 'Paid' },
      CANCELLED: { key: 'rejected', label: 'Cancelled' },
    };
    return raw.map((r, i) => {
      const badge = BADGE[r?.status] || { key: 'draft', label: r?.status || '—' };
      const when = r?.paidAt || r?.createdAt;
      const deductions = Number(r?.totalDeductions) || 0;
      return {
        id: r?.advanceNumber || String(i),
        key: r?._id || String(i),
        rawStatus: r?.status,
        status: badge.key,
        statusLabel: badge.label,
        meta: [
          when ? dayjs(when).format('DD MMM') : null,
          r?.tripId?.tripNumber,
        ].filter(Boolean).join(' · '),
        amount: money(r?.netPayable),
        requested: money(r?.requestedAmount || r?.netPayable),
        deductions: deductions ? `−${money(deductions)}` : null,
        net: money(r?.netPayable),
        method: r?.paymentMode || '',
        hasDetail: r?.requestedAmount != null || deductions > 0 || !!r?.paymentMode,
      };
    });
  }, [advancesApi]);

  // Featured = the most recent paid advance that carries payout detail (else none).
  const featured = rows.find((a) => a.rawStatus === 'PAID' && a.hasDetail) || null;
  const rest = featured ? rows.filter((a) => a !== featured) : rows;
  const isEmpty = rows.length === 0;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <AppText variant="h3" weight="extrabold">My advances</AppText>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {loading ? (
          <Loading />
        ) : error ? (
          <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} />
        ) : isEmpty ? (
          <EmptyState icon="cash-outline" title="No advances yet" message="Advances paid to you will appear here." />
        ) : (
          <>
            {featured ? (
              <Card elevated="sm" padding={16} style={{ gap: 12 }}>
                <View style={styles.featTop}>
                  <View style={{ gap: 2 }}>
                    <AppText mono variant="bodyStrong" weight="semibold">{featured.id}</AppText>
                    <AppText variant="caption" mono muted>{featured.meta}</AppText>
                  </View>
                  <StatusBadge status={featured.status} label={featured.statusLabel} />
                </View>
                <View style={styles.divider} />
                <Row label="Requested" value={featured.requested} />
                {featured.deductions ? <Row label="Deductions" value={featured.deductions} valueColor={colors.error} /> : null}
                <Row label="Net paid" value={featured.net} bold />
                {featured.method ? (
                  <View style={styles.methodChip}>
                    <Ionicons name="card-outline" size={15} color={colors.textMuted} />
                    <AppText variant="caption" mono muted>{featured.method}</AppText>
                  </View>
                ) : null}
              </Card>
            ) : null}

            {rest.map((a) => (
              <Card key={a.key} elevated="sm" padding={14} style={styles.rowCard}>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={styles.rowTop}>
                    <AppText mono variant="bodyStrong" weight="semibold">{a.id}</AppText>
                    <StatusBadge status={a.status} label={a.statusLabel} />
                  </View>
                  <AppText variant="caption" mono muted>{a.meta}</AppText>
                </View>
                <AppText
                  mono variant="h3" weight="semibold"
                  color={a.rawStatus === 'CANCELLED' ? colors.textMuted : colors.text}
                  style={a.rawStatus === 'CANCELLED' ? styles.strike : null}
                >
                  {a.amount}
                </AppText>
              </Card>
            ))}

            <WarningBanner tone="info" message="Paid advances are debited from your wallet balance." style={{ marginTop: 4 }} />
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Button variant="secondary" size="lg" icon="add" label="Request an advance" onPress={() => {}} />
      </View>
    </View>
  );
}

function Row({ label, value, valueColor, bold }) {
  return (
    <View style={styles.kvRow}>
      <AppText variant="small" muted={!bold} weight={bold ? 'bold' : 'regular'}>{label}</AppText>
      <AppText mono variant={bold ? 'h3' : 'bodyStrong'} weight="semibold" color={valueColor || colors.text}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 6, gap: 12 },
  featTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  divider: { height: 1, backgroundColor: colors.border },
  kvRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  methodChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.background, borderRadius: 12, padding: 12, marginTop: 4 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  strike: { textDecorationLine: 'line-through' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 10, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});
