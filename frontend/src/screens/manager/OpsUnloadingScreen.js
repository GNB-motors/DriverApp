import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { AppText, Card, colors, spacing } from '../../components/ui';
import { BackHeader, Pill, SectionHeader, Loading, EmptyState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import managerService from '../../services/managerService';

const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

/**
 * M7 · Unloading — what the depot recorded, per consignment.
 *
 * /erp/unloading → [{ cnNumber, material, loadedQty, unloadedQty, qtyUnit,
 *   shortageQty, allowedShortageQty, chargeableShortageQty, shortageAmount,
 *   shortageRemark, detentionDays, chargeableDetentionDays, detentionAmount,
 *   otherChargesTotal, freightAmount, netReceivable, status, unloadedAt }]
 * The screen lists every record — it previously rendered only the first.
 */
export default function OpsUnloadingScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const { token } = useAuth();
  const enabled = apiConfigured() && !!token;
  const { data: unloadApi, loading, error, refetch } = useApi(
    () => managerService.listUnloading(),
    [],
    { enabled, fallback: [] },
  );

  const rows = useMemo(() => {
    const list = Array.isArray(unloadApi)
      ? unloadApi
      : (unloadApi?.results || unloadApi?.rows || unloadApi?.items || unloadApi?.data || []);
    return list.map((d, i) => {
      const unit = d?.qtyUnit || '';
      const q = (v) => (v == null ? '—' : `${v}${unit ? ` ${unit}` : ''}`);
      const shortage = Number(d?.shortageQty) || 0;
      const chargeable = Number(d?.chargeableShortageQty) || 0;
      return {
        key: d?._id || String(i),
        id: d?.cnNumber || '—',
        material: d?.material || '—',
        status: d?.status || '',
        loaded: q(d?.loadedQty),
        unloaded: q(d?.unloadedQty),
        shortage: q(d?.shortageQty),
        hasShortage: shortage > 0,
        chargeable,
        allowed: q(d?.allowedShortageQty),
        when: d?.unloadedAt ? dayjs(d.unloadedAt).format('DD MMM YYYY') : '',
        remark: d?.shortageRemark || '',
        moneyRows: [
          ['Freight', money(d?.freightAmount)],
          ...(Number(d?.shortageAmount) ? [['Shortage', `−${money(d.shortageAmount)}`]] : []),
          ...(Number(d?.detentionAmount) ? [['Detention', money(d.detentionAmount)]] : []),
          ...(Number(d?.otherChargesTotal) ? [['Other charges', money(d.otherChargesTotal)]] : []),
          ['Net receivable', money(d?.netReceivable)],
        ],
      };
    });
  }, [unloadApi]);

  return (
    <View style={styles.container}>
      <BackHeader
        title="Unloading"
        subtitle={rows.length ? `${rows.length} ${rows.length === 1 ? 'record' : 'records'}` : undefined}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.lg }]} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />}>
        {loading ? (
          <Loading />
        ) : error ? (
          <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState icon="cube-outline" title="No unloading records" message="Unloading details will appear here once the depot records them." />
        ) : rows.map((u) => (
          <Card key={u.key} elevated="sm" padding={16}>
            <SectionHeader
              label={u.id}
              right={u.hasShortage
                ? <Pill tone="pending" label={u.chargeable > 0 ? 'Chargeable shortage' : 'Shortage'} />
                : <Pill tone="success" label="No shortage" />}
            />

            <View style={styles.weights}>
              <Weight value={u.loaded} label="loaded" />
              <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
              <Weight value={u.unloaded} label="unloaded" />
              <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
              <Weight value={u.shortage} label="short" color={u.hasShortage ? colors.warning : colors.textMuted} />
            </View>

            <View style={styles.divider} />
            <View style={styles.detail}>
              <AppText variant="small" muted>Allowed shortage</AppText>
              <AppText mono variant="small" weight="semibold">{u.allowed}</AppText>
            </View>
            <View style={[styles.detail, styles.rowDivider]}>
              <AppText variant="small" muted>Material</AppText>
              <AppText variant="small" weight="semibold">{u.material}</AppText>
            </View>
            {u.when ? (
              <View style={[styles.detail, styles.rowDivider]}>
                <AppText variant="small" muted>Unloaded</AppText>
                <AppText mono variant="small" weight="semibold">{u.when}</AppText>
              </View>
            ) : null}

            <View style={styles.divider} />
            {u.moneyRows.map(([label, value], i) => (
              <View key={label} style={[styles.detail, i > 0 && styles.rowDivider]}>
                <AppText variant="small" muted>{label}</AppText>
                <AppText mono variant="small" weight="semibold">{value}</AppText>
              </View>
            ))}

            {u.remark ? (
              <>
                <View style={styles.divider} />
                <AppText variant="caption" muted>{u.remark}</AppText>
              </>
            ) : null}
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

function Weight({ value, label, color }) {
  return (
    <View style={styles.weight}>
      <AppText mono weight="semibold" color={color || colors.text} style={styles.weightVal}>{value}</AppText>
      <AppText variant="caption" muted>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 18, gap: 12 },
  weights: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  weight: { alignItems: 'center', gap: 2 },
  weightVal: { fontSize: 18, lineHeight: 24 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  detail: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, gap: 8 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
});
