import React, { useState, useMemo } from 'react';
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card, Loading, EmptyState, colors, spacing, radius } from '../../components/ui';
import ManagerShell from './ManagerShell';
import { Pill, RouteLine, SectionHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import managerService from '../../services/managerService';
import { DO_STATUS, metaFor } from '../../constants/erpStatus';

/** M5 · Loads — place a truck against a load. */
export default function OpsLoadsScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  // Real delivery orders — no data until a backend is configured and signed in.
  const { token } = useAuth();
  const enabled = apiConfigured() && !!token;
  const { data: ordersApi, loading, error, refetch } = useApi(
    () => managerService.listDeliveryOrders(),
    [],
    { enabled, fallback: null },
  );

  const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

  // /erp/delivery-orders → [{ doNumber, fromLocation, toLocation, material,
  //   qty, qtyUnit, liftedQty, balanceQty, sbRate, sbRateUnit, totalKm, status,
  //   partyId: { name, code }, routeId: { name } }]
  // Only orders with quantity still to lift can be placed.
  const openOrders = useMemo(() => {
    const list = Array.isArray(ordersApi)
      ? ordersApi
      : (ordersApi?.results || ordersApi?.rows || ordersApi?.items || ordersApi?.data || []);
    return list
      .filter((d) => ['PENDING', 'PARTIAL'].includes(d?.status) && (Number(d?.balanceQty) || 0) > 0)
      .map((d) => {
        const meta = metaFor(DO_STATUS, d?.status);
        const unit = d?.qtyUnit ? String(d.qtyUnit).toLowerCase() : '';
        return {
          key: d?._id,
          id: d?.doNumber || '—',
          badge: meta.label,
          tone: meta.tone,
          route: [d?.fromLocation || '—', d?.toLocation || '—'],
          party: d?.partyId?.name || '—',
          material: d?.material || '—',
          balance: `${Number(d?.balanceQty) || 0}${unit ? ` ${unit}` : ''}`,
          rate: money(d?.sbRate),
          facts: [
            ['Material', d?.material || '—'],
            ['To lift', `${Number(d?.balanceQty) || 0}${unit ? ` ${unit}` : ''}`],
            ['Rate', money(d?.sbRate)],
          ],
          meta: [d?.partyId?.name, d?.material, d?.totalKm ? `${d.totalKm} km` : null]
            .filter(Boolean).join(' · '),
        };
      });
  }, [ordersApi]);

  const primary = openOrders[0] || null;
  const secondary = openOrders[1] || null;

  // Suggested trucks come from the placement board for the primary DO — the
  // delivery order itself carries no vehicle suggestions.
  const { data: boardApi, loading: boardLoading } = useApi(
    () => managerService.getPlacementsBoard(primary ? { doId: primary.key } : {}),
    [primary?.key],
    { enabled: enabled && !!primary, fallback: null },
  );

  // board → { summary, locations: [{ location, tankers: [...] }] }
  const trucks = useMemo(() => {
    const locations = Array.isArray(boardApi?.locations) ? boardApi.locations : [];
    return locations
      .flatMap((l) => (Array.isArray(l.tankers) ? l.tankers : []))
      .filter((t) => t?.isAvailable)
      .map((t) => ({
        plate: t?.registrationNumber || '—',
        meta: [
          t?.location,
          t?.capacity ? `${t.capacity} ${t.capacityUnit || ''}`.trim() : null,
          t?.requiresCleaning ? 'needs cleaning' : null,
        ].filter(Boolean).join(' · '),
      }));
  }, [boardApi]);

  const [picked, setPicked] = useState(null);
  const selected = picked ?? trucks[0]?.plate;

  return (
    <ManagerShell title="Loads to place" subtitle="Assign trucks to open loads" navigation={navigation} active="OpsLoads">
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />}>
          {loading ? (
            <Loading />
          ) : error ? (
            <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} />
          ) : !primary ? (
            <EmptyState title="No loads to place" message="Loads will appear here once delivery orders are created." />
          ) : (
            <>
          <Card elevated="sm" padding={16} style={styles.primaryCard}>
            <View style={styles.top}>
              <AppText mono variant="bodyStrong" weight="semibold">{primary.id}</AppText>
              <Pill tone={primary.tone} label={primary.badge} />
            </View>
            <View style={styles.routeWrap}><RouteLine from={primary.route[0]} to={primary.route[1]} /></View>
            <View style={styles.facts}>
              {primary.facts.map(([k, v]) => (
                <View key={k} style={styles.fact}>
                  <AppText variant="caption" muted>{k}</AppText>
                  <AppText mono={k !== 'Material'} variant="small" weight="semibold">{v}</AppText>
                </View>
              ))}
            </View>
            <View style={styles.divider} />
            <SectionHeader label="Suggested trucks" />
            {!boardLoading && trucks.length === 0 ? (
              <AppText variant="caption" muted style={{ marginTop: 8 }}>No available trucks at this location.</AppText>
            ) : null}
            {trucks.map((t) => {
              const on = t.plate === selected;
              return (
                <Pressable key={t.plate} onPress={() => setPicked(t.plate)} style={[styles.truck, on && styles.truckOn]}>
                  <View style={[styles.radio, on && styles.radioOn]}>{on ? <Ionicons name="checkmark" size={12} color={colors.white} /> : null}</View>
                  <View style={{ flex: 1 }}>
                    <AppText mono variant="small" weight="semibold">{t.plate}</AppText>
                    <AppText variant="caption" mono color={on ? colors.primary : colors.textMuted}>{t.meta}</AppText>
                  </View>
                </Pressable>
              );
            })}
          </Card>

          {secondary ? (
          <Card elevated="sm" padding={14}>
            <View style={styles.top}>
              <AppText mono variant="bodyStrong" weight="semibold">{secondary.id}</AppText>
              <Pill tone={secondary.tone} label={secondary.badge} />
            </View>
            <View style={styles.routeWrap}><RouteLine from={secondary.route[0]} to={secondary.route[1]} /></View>
            <View style={styles.divider} />
            <View style={styles.foot}>
              <AppText variant="caption" mono muted>{secondary.meta}</AppText>
              <AppText variant="small" weight="bold" color={colors.primary}>Place</AppText>
            </View>
          </Card>
          ) : null}
            </>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Button size="lg" label={selected ? `Assign ${selected}` : 'Assign truck'} disabled={!selected} onPress={() => navigation.navigate('OpsDeliveryOrder')} />
        </View>
      </View>
    </ManagerShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 18, gap: 12, paddingBottom: 90 },
  primaryCard: { borderWidth: 1, borderColor: '#C7D0F7' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routeWrap: { marginTop: 10 },
  facts: { flexDirection: 'row', gap: 10, marginTop: 12 },
  fact: { flex: 1, gap: 3 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  truck: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, marginTop: 6 },
  truckOn: { backgroundColor: colors.tealTint },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 10, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});
