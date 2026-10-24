import React from 'react';
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card, StatusBadge, Loading, EmptyState, colors, spacing, radius } from '../../../components/ui';
import dayjs from 'dayjs';
import { useAuth } from '../../../context/AuthContext';
import { apiConfigured } from '../../../services/client';
import { useApi } from '../../../hooks/useApi';
import maintenanceService from '../../../services/maintenanceService';

/**
 * 21 · Repairs — logs for this truck. UI-only demo.
 */
export default function RepairsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const enabled = apiConfigured() && !!token;
  const { data, loading, error, refetch } = useApi(() => maintenanceService.listMaintenance(), [], { enabled, fallback: [] });

  // /maintenance → [{ _id, recordType: 'SERVICE'|'REPAIR', date, workshop, type,
  //   amount, notes, currentKm, attachments,
  //   vehicleId: { registrationNumber, chassisNumber } }]
  // The record has no lifecycle status — recordType is what distinguishes rows.
  const { logs, plate, spendYear } = React.useMemo(() => {
    const rows = Array.isArray(data)
      ? data
      : (data?.results || data?.rows || data?.items || data?.data || []);
    const mapped = rows.map((m, i) => {
      const count = m?.attachments?.length || 0;
      return {
        id: m?._id || String(i),
        title: m?.type || m?.workshop || 'Repair',
        // SERVICE is scheduled upkeep; REPAIR is a fix. Both are completed records.
        status: m?.recordType === 'SERVICE' ? 'done' : 'confirmed',
        statusLabel: m?.recordType === 'SERVICE' ? 'Service' : 'Repair',
        amount: m?.amount != null ? `₹${Number(m.amount).toLocaleString('en-IN')}` : '',
        desc: m?.notes || m?.workshop || '',
        meta: [
          m?.date ? dayjs(m.date).format('DD MMM') : null,
          m?.currentKm ? `${Number(m.currentKm).toLocaleString('en-IN')} km` : null,
        ].filter(Boolean).join(' · '),
        photos: count ? `${count} photo${count === 1 ? '' : 's'}` : 'No photo',
      };
    });
    const total = rows.reduce((n, m) => n + (Number(m?.amount) || 0), 0);
    const firstPlate = rows[0]?.vehicleId?.registrationNumber || '';
    return { logs: mapped, plate: firstPlate, spendYear: total ? `₹${total.toLocaleString('en-IN')}` : '—' };
  }, [data]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="h3" weight="extrabold">Repairs</AppText>
          <AppText variant="caption" mono muted>{[plate, `${logs.length} logs`].filter(Boolean).join(' · ')}</AppText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <View style={styles.kpiRow}>
          <Card elevated="sm" padding={14} style={styles.kpi}>
            <AppText variant="caption" muted>Spend this year</AppText>
            <AppText mono variant="h3" weight="semibold">{spendYear}</AppText>
          </Card>
          <Card elevated="sm" padding={14} style={styles.kpi}>
            <AppText variant="caption" muted>Downtime</AppText>
            {/* MaintenanceRecord has no downtime field — nothing to show here yet. */}
            <AppText mono variant="h3" weight="semibold">—</AppText>
          </Card>
        </View>

        {loading ? (
          <Loading />
        ) : error ? (
          <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} />
        ) : logs.length === 0 ? (
          <EmptyState icon="build-outline" title="No repairs logged yet" message="Log a repair to keep a service history for this truck." />
        ) : (
          logs.map((log) => (
            <Card key={log.id} elevated="sm" padding={14} style={[styles.logCard, log.active && styles.logActive]}>
              <View style={styles.logTop}>
                <AppText variant="bodyStrong" weight="bold">{log.title}</AppText>
                <StatusBadge status={log.status} label={log.statusLabel} />
                <AppText mono variant="bodyStrong" weight="semibold" style={styles.amount}>{log.amount}</AppText>
              </View>
              <AppText variant="small" muted>{log.desc}</AppText>
              <View style={styles.logDivider} />
              <View style={styles.logFooter}>
                <AppText variant="caption" mono muted>{log.meta}</AppText>
                <AppText variant="caption" weight="bold" color={log.photos === 'No photo' ? colors.textMuted : colors.primary}>{log.photos}</AppText>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Button size="lg" icon="add" label="Log a repair" onPress={() => navigation.navigate('LogRepair')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 6, gap: 12 },
  kpiRow: { flexDirection: 'row', gap: 10 },
  kpi: { flex: 1, gap: 4 },
  logCard: { gap: 8 },
  logActive: { borderWidth: 1, borderColor: '#F3D9AE' },
  logTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amount: { marginLeft: 'auto' },
  logDivider: { height: 1, backgroundColor: colors.border },
  logFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 10, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});
