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

  // Normalise rows defensively → the card shape. mapping to confirm against live API
  const rows = useMemo(() => {
    const raw = Array.isArray(advancesApi)
      ? advancesApi
      : (advancesApi?.results || advancesApi?.rows || advancesApi?.items || advancesApi?.data || []);
    const money = (v) => `₹${(Number(v) || 0).toLocaleString('en-IN')}`;
    return raw.map((r, i) => {
      const status = String(r.status || '').toLowerCase();
      const when = r.paidAt || r.approvedAt || r.requestedAt || r.createdAt || r.date;
      const trip = r.tripNo || r.tripId || r.trip?.tripNumber || r.ref || '';
      const hasDetail = r.requestedAmount != null || r.netAmount != null || r.net != null || !!(r.method || r.paymentMethod);
      return {
        id: r.advanceNo || r.code || r._id || r.id || String(i),
        status,
        meta: r.meta || [when ? dayjs(when).format('DD MMM') : null, trip].filter(Boolean).join(' · '),
        amount: money(r.amount ?? r.netAmount ?? r.net),
        // Detail fields for the featured card (only present on some responses). mapping to confirm
        requested: money(r.requestedAmount ?? r.requested ?? r.amount),
        deductions: (r.deductions ?? r.deduction) != null ? `−${money(r.deductions ?? r.deduction)}` : null,
        net: money(r.netAmount ?? r.net ?? r.amount),
        method: r.method || r.paymentMethod || r.paidVia || '',
        hasDetail,
      };
    });
  }, [advancesApi]);

  // Featured = the most recent paid advance that carries payout detail (else none).
  const featured = rows.find((a) => a.status === 'paid' && a.hasDetail) || null;
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
                  <StatusBadge status={featured.status} />
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
              <Card key={a.id} elevated="sm" padding={14} style={styles.rowCard}>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={styles.rowTop}>
                    <AppText mono variant="bodyStrong" weight="semibold">{a.id}</AppText>
                    <StatusBadge status={a.status} />
                  </View>
                  <AppText variant="caption" mono muted>{a.meta}</AppText>
                </View>
                <AppText
                  mono variant="h3" weight="semibold"
                  color={a.status === 'rejected' ? colors.textMuted : colors.text}
                  style={a.status === 'rejected' ? styles.strike : null}
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
