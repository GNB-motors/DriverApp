import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { AppText, Button, Card, Loading, EmptyState, colors, spacing, radius } from '../../components/ui';
import ManagerShell from './ManagerShell';
import { Pill, RouteLine } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import inboundEwbService from '../../services/inboundEwbService';

/** M9 · Inbound e-Way Bills (Ops). */
export default function OpsInboundEwbScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const enabled = apiConfigured() && !!token;
  
  const [syncing, setSyncing] = useState(false);
  const [actingOn, setActingOn] = useState(null);

  const { data: ewbsApi, loading, error, refetch } = useApi(
    () => inboundEwbService.listQueue(),
    [],
    { enabled, fallback: [] }
  );

  const list = useMemo(() => {
    return Array.isArray(ewbsApi)
      ? ewbsApi
      : (ewbsApi?.results || ewbsApi?.rows || ewbsApi?.items || ewbsApi?.data || []);
  }, [ewbsApi]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      await inboundEwbService.sync();
      await refetch();
    } catch (e) {
      Alert.alert('Sync failed', e.message || 'Could not sync e-Way bills from GST portal.');
    } finally {
      setSyncing(false);
    }
  };

  const handleConfirm = async (item) => {
    try {
      setActingOn(item._id);
      await inboundEwbService.confirm(item._id, {
        loadedQty: item.qty,
        loadedQtyUnit: 'KL'
      });
      await refetch();
    } catch (e) {
      Alert.alert('Confirm failed', e.message || 'Could not confirm e-Way bill.');
    } finally {
      setActingOn(null);
    }
  };

  const handleIgnore = async (item) => {
    try {
      setActingOn(item._id);
      await inboundEwbService.ignore(item._id);
      await refetch();
    } catch (e) {
      Alert.alert('Ignore failed', e.message || 'Could not ignore e-Way bill.');
    } finally {
      setActingOn(null);
    }
  };

  return (
    <ManagerShell title="Inbound e-Way Bills" subtitle={list.length ? `${list.length} pending` : ''} navigation={navigation} active="OpsInboundEwb">
      <View style={{ flex: 1 }}>
        <View style={styles.syncRow}>
          <Button 
            size="sm" 
            variant="secondary" 
            icon="sync-outline" 
            label={syncing ? "Syncing..." : "Sync from GST"} 
            onPress={handleSync}
            disabled={syncing || loading}
          />
        </View>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading && !syncing} onRefresh={refetch} tintColor={colors.primary} />}>
          {loading && !syncing && !actingOn ? (
            <Loading />
          ) : error ? (
            <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} />
          ) : list.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="No e-Way bills"
              message="There are no pending inbound e-Way bills."
            />
          ) : (
            list.map((t) => (
              <Card
                key={t._id || t.ewbNumber}
                elevated="sm"
                padding={14}
                style={t.status === 'SUGGESTED' && styles.warnBorder}
              >
                <View style={styles.top}>
                  <AppText mono variant="bodyStrong" weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{t.ewbNumber}</AppText>
                  <Pill tone={t.status === 'SUGGESTED' ? 'warning' : 'info'} label={t.status} />
                </View>
                <View style={styles.routeWrap}>
                  <RouteLine from={t.fromPlace || 'Origin'} to={t.toPlace || 'Dest'} />
                </View>
                <View style={styles.divider} />
                <View style={styles.foot}>
                  <AppText variant="caption" mono muted numberOfLines={1} style={{ flexShrink: 1 }}>{t.generatorName || '—'}</AppText>
                  <AppText variant="caption" mono muted>{dayjs(t.ewbDate).format('DD MMM YYYY')}</AppText>
                </View>
                <View style={styles.metaRow}>
                  <AppText variant="caption" muted numberOfLines={1}>{t.vehicleNo || 'No vehicle'} · {t.qty || 0} {t.qtyUnit || ''} · {t.material || 'Material'}</AppText>
                </View>
                
                {t.suggestedTripId && t.suggestedTripNumber && (
                  <View style={styles.suggestionBox}>
                    <AppText variant="caption" muted>Suggested match: </AppText>
                    <AppText variant="caption" mono weight="bold">{t.suggestedTripNumber}</AppText>
                  </View>
                )}

                <View style={styles.actions}>
                  <Button 
                    size="sm" 
                    variant="primary" 
                    label={actingOn === t._id ? "..." : "Confirm"} 
                    onPress={() => handleConfirm(t)}
                    disabled={!!actingOn}
                    style={{ flex: 1 }}
                  />
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    label="Ignore" 
                    onPress={() => handleIgnore(t)}
                    disabled={!!actingOn}
                  />
                </View>
              </Card>
            ))
          )}
        </ScrollView>
      </View>
    </ManagerShell>
  );
}

const styles = StyleSheet.create({
  syncRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 18, paddingTop: 12 },
  scroll: { padding: 18, paddingTop: 12, gap: 10 },
  warnBorder: { borderWidth: 1, borderColor: '#F3D9AE' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  routeWrap: { marginTop: 10 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  metaRow: { marginTop: 4 },
  suggestionBox: { marginTop: 10, padding: 8, backgroundColor: colors.surfaceSubtle, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 }
});
