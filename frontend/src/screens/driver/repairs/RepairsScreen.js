import React from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card, StatusBadge, colors, spacing, radius } from '../../../components/ui';
import dayjs from 'dayjs';
import * as mock from '../../../demo/mock';
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
  const useReal = apiConfigured() && !!token && token !== 'demo-token';
  const { data: maintApi } = useApi(() => maintenanceService.listMaintenance(), [], { enabled: useReal, fallback: null });

  // Map maintenance records → repair-log cards; KPIs keep mock until confirmed.
  // (mapping to confirm against live API)
  const r = React.useMemo(() => {
    const rows = Array.isArray(maintApi) ? maintApi : maintApi?.results || maintApi?.data || [];
    if (!useReal || !rows.length) return mock.repairs;
    const logs = rows.map((m, i) => {
      const st = String(m.status || '').toLowerCase();
      return {
        id: m._id || String(i),
        title: m.type || m.workshop || 'Repair',
        status: st.includes('workshop') || st.includes('progress') ? 'in_workshop' : 'done',
        amount: m.amount != null ? `₹${Number(m.amount).toLocaleString('en-IN')}` : '',
        desc: m.notes || m.workshop || '',
        meta: [m.date ? dayjs(m.date).format('DD MMM') : null, m.odometer ? `${m.odometer} km` : null].filter(Boolean).join(' · '),
        photos: (m.attachments?.length || m.photos?.length) ? `${m.attachments?.length || m.photos.length} photos` : 'No photo',
      };
    });
    return { ...mock.repairs, logs };
  }, [useReal, maintApi]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="h3" weight="extrabold">Repairs</AppText>
          <AppText variant="caption" mono muted>{r.plate} · {r.count} logs</AppText>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.kpiRow}>
          <Card elevated="sm" padding={14} style={styles.kpi}>
            <AppText variant="caption" muted>Spend this year</AppText>
            <AppText mono variant="h3" weight="semibold">{r.spendYear}</AppText>
          </Card>
          <Card elevated="sm" padding={14} style={styles.kpi}>
            <AppText variant="caption" muted>Downtime</AppText>
            <AppText mono variant="h3" weight="semibold">{r.downtime}</AppText>
          </Card>
        </View>

        {r.logs.map((log) => (
          <Card key={log.id} elevated="sm" padding={14} style={[styles.logCard, log.active && styles.logActive]}>
            <View style={styles.logTop}>
              <AppText variant="bodyStrong" weight="bold">{log.title}</AppText>
              <StatusBadge status={log.status} label={log.status === 'in_workshop' ? 'In workshop' : 'Done'} />
              <AppText mono variant="bodyStrong" weight="semibold" style={styles.amount}>{log.amount}</AppText>
            </View>
            <AppText variant="small" muted>{log.desc}</AppText>
            <View style={styles.logDivider} />
            <View style={styles.logFooter}>
              <AppText variant="caption" mono muted>{log.meta}</AppText>
              <AppText variant="caption" weight="bold" color={log.photos === 'No photo' ? colors.textMuted : colors.primary}>{log.photos}</AppText>
            </View>
          </Card>
        ))}
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
