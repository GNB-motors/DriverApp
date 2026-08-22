import React, { useState, useMemo } from 'react';
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card, SegmentedControl, colors, spacing, radius } from '../../components/ui';
import OwnerShell from './OwnerShell';
import { Monogram, SectionHeader, Loading, EmptyState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import ownerService from '../../services/ownerService';

/** O5 · Money — payables and receivables. */
export default function OwnerMoneyScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('pay');

  // Khata driver list — real API only.
  const { token } = useAuth();
  const useReal = apiConfigured() && !!token;
  const { data: khataApi, loading: khataLoading, error, refetch } = useApi(
    () => ownerService.listKhataDrivers(),
    [],
    { enabled: useReal, fallback: [] },
  );

  // Map driver rows to the list shape and derive the summary totals — optional
  // chaining + safe defaults so a partial/empty response never crashes.
  const m = useMemo(() => {
    const rows = Array.isArray(khataApi)
      ? khataApi
      : (khataApi?.drivers || khataApi?.items || khataApi?.results || khataApi?.data || []);
    let owedNum = 0;
    const list = rows.map((r, i) => {
      const name = r?.driverName || r?.name || r?.driver?.name || '';
      const initials = r?.initials
        || (name ? name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : '');
      const bal = r?.balance ?? r?.owed ?? r?.netBalance ?? r?.amount ?? 0;
      owedNum += Number(bal) || 0;
      return {
        _id: r?._id || r?.driverId || r?.id || null, // raw id for the driver-account fetch
        initials,
        name,
        meta: r?.meta || '',
        amount: `₹${(Number(bal) || 0).toLocaleString('en-IN')}`,
      };
    });
    return {
      owed: `₹${owedNum.toLocaleString('en-IN')}`,
      drivers: list.length ? `across ${list.length} drivers` : '',
      confirmed: '',
      adjustments: '',
      list,
    };
  }, [khataApi]);

  const isEmpty = m.list.length === 0;

  return (
    <OwnerShell title="Money" navigation={navigation} active="OwnerMoney">
      <View style={{ flex: 1 }}>
        <View style={styles.top}>
          <SegmentedControl variant="pill" options={[{ label: 'To pay', value: 'pay' }, { label: 'To collect', value: 'collect' }]} value={tab} onChange={setTab} />
        </View>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={khataLoading} onRefresh={refetch} tintColor={colors.primary} />}>
          {khataLoading ? (
            <Loading />
          ) : error ? (
            <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} />
          ) : isEmpty ? (
            <EmptyState icon="cash-outline" title="No drivers yet" message="Drivers you settle with will appear here with what you owe them." />
          ) : (
            <>
              <Card elevated="sm" padding={16}>
                <AppText variant="label" muted>Owed to drivers</AppText>
                <AppText mono weight="semibold" style={styles.big}>{m.owed}</AppText>
                <AppText variant="small" muted>{m.drivers}</AppText>
                {(m.confirmed || m.adjustments) ? (
                  <View style={styles.subRow}>
                    {m.confirmed ? <AppText variant="caption" mono muted>{m.confirmed}</AppText> : null}
                    {m.adjustments ? <AppText variant="caption" mono muted>{m.adjustments}</AppText> : null}
                  </View>
                ) : null}
              </Card>

              <SectionHeader label="By driver" />
              <Card padding={0} elevated="sm">
                {m.list.map((d, i) => (
                  <Pressable key={d._id || d.initials || i} onPress={() => navigation.navigate('OwnerDriver', { driverId: d._id })} style={[styles.driver, i > 0 && styles.divider]}>
                    <Monogram initials={d.initials} size={40} />
                    <View style={{ flex: 1, gap: 3 }}>
                      <AppText variant="bodyStrong" weight="bold">{d.name}</AppText>
                      <AppText variant="caption" mono muted>{d.meta}</AppText>
                    </View>
                    <AppText mono variant="bodyStrong" weight="semibold">{d.amount}</AppText>
                  </Pressable>
                ))}
              </Card>

              <Pressable onPress={() => navigation.navigate('OwnerApprovals')}>
                <Card elevated="sm" padding={14} style={styles.advRow}>
                  <View style={styles.advIcon}><Ionicons name="add" size={20} color={colors.warning} /></View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong" weight="bold">3 advance requests</AppText>
                    <AppText variant="caption" muted>₹9,500 asked for today</AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#B4B4BC" />
                </Card>
              </Pressable>
            </>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Button size="lg" label="Settle a driver" onPress={() => navigation.navigate('OwnerDriver')} />
        </View>
      </View>
    </OwnerShell>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 18, paddingTop: 12 },
  scroll: { padding: 18, paddingTop: 12, gap: 12, paddingBottom: 90 },
  big: { fontSize: 30, lineHeight: 34, marginVertical: 4 },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  driver: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  advRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  advIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.pendingBg, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 10, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});
