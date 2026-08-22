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

  // Normalize delivery orders → { primary, secondary } (loads = orders to place).
  // mapping to confirm against live API
  const loads = useMemo(() => {
    const list = Array.isArray(ordersApi) ? ordersApi : (ordersApi?.results || ordersApi?.rows || ordersApi?.items || ordersApi?.data || []);
    if (!list.length) return null;
    const money = (v) => (v != null ? `₹${Number(v).toLocaleString('en-IN')}` : undefined);
    const routeOf = (d) => (Array.isArray(d?.route) ? d.route : [d?.origin ?? d?.from ?? d?.source, d?.destination ?? d?.to ?? d?.dest]);
    const [p, s] = list;
    const pr = routeOf(p);
    const primary = {
      id: p?.doNo || p?.code || p?.id || p?._id || '—',
      badge: p?.badge || p?.pickupLabel || 'Pickup',
      route: [pr?.[0] || '—', pr?.[1] || '—'],
      facts: Array.isArray(p?.facts) ? p.facts : [
        ['Material', p?.material || p?.commodity || '—'],
        ['Weight', p?.weight != null ? `${p.weight} t` : '—'],
        ['Freight', money(p?.freight) || '—'],
      ],
      trucks: Array.isArray(p?.trucks) && p.trucks.length
        ? p.trucks.map((tk, i) => ({
            plate: tk?.plate || tk?.regNo || tk?.vehicleNo || `Truck ${i + 1}`,
            meta: tk?.meta || [tk?.driverName || tk?.driver, tk?.availability].filter(Boolean).join(' · '),
            selected: i === 0,
          }))
        : [],
    };
    let secondary = null;
    if (s) {
      const sr = routeOf(s);
      secondary = {
        id: s?.doNo || s?.code || s?.id || s?._id || '—',
        badge: s?.badge || 'Next',
        route: [sr?.[0] || '—', sr?.[1] || '—'],
        meta: s?.meta || [s?.material || s?.commodity, s?.weight != null ? `${s.weight} t` : null, money(s?.freight)].filter(Boolean).join(' · '),
      };
    }
    return { primary, secondary };
  }, [ordersApi]);

  const primary = loads?.primary;
  const secondary = loads?.secondary;
  const [picked, setPicked] = useState(null);
  const selected = picked ?? primary?.trucks?.find((t) => t.selected)?.plate;

  return (
    <ManagerShell title="Loads to place" subtitle="Assign trucks to open loads" navigation={navigation} active="OpsLoads">
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />}>
          {loading ? (
            <Loading />
          ) : error ? (
            <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} />
          ) : !loads ? (
            <EmptyState title="No loads to place" message="Loads will appear here once delivery orders are created." />
          ) : (
            <>
          <Card elevated="sm" padding={16} style={styles.primaryCard}>
            <View style={styles.top}>
              <AppText mono variant="bodyStrong" weight="semibold">{primary.id}</AppText>
              <Pill tone="pending" label={primary.badge} />
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
            {primary.trucks.map((t) => {
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
              <Pill tone="in_transit" label={secondary.badge} />
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
          <Button size="lg" label={selected ? `Assign ${selected}` : 'Assign truck'} onPress={() => navigation.navigate('OpsDeliveryOrder')} />
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
