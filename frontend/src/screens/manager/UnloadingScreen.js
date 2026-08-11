/**
 * UnloadingScreen.js — Stage 8 settlement records.
 *
 * GET /api/erp/unloading. The previous version called `fetchErpTrips`, so it
 * showed trips rather than unloadings.
 *
 * The "to do" list is a separate endpoint — GET /api/erp/unloading/pending gives
 * POD_RECEIVED trips awaiting settlement — surfaced here as a filter so both the
 * queue and the history live on one screen.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import { useAccess } from '../../context/AccessContext';
import useList from '../../hooks/useList';
import { fetchUnloadings } from '../../services/erpApi';
import ListScreen from '../../components/ListScreen';
import {
  AppText, Card, Badge, MoneyText, colors,
} from '../../components/ui';

export default function UnloadingScreen({ navigation }) {
  const { can } = useAccess();
  const list = useList(fetchUnloadings, { initial: {} });

  return (
    <ListScreen
      title="Unloading"
      subtitle={list.meta?.total ? `${list.meta.total} settled` : undefined}
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      list={list}
      renderItem={({ item }) => {
        const trip = item.tripId;
        const shortage = Number(item.shortageQty) || 0;
        const detention = Number(item.detentionDays) || 0;

        return (
          <Card
            padding={16}
            elevated="sm"
            style={styles.card}
            onPress={trip?._id ? () => navigation.navigate('TripDetail', { tripId: trip._id }) : undefined}
          >
            <View style={styles.head}>
              <View style={styles.headText}>
                <AppText variant="bodyStrong" weight="extrabold" numberOfLines={1}>
                  {trip?.tripNumber || 'Unloading'}
                </AppText>
                <AppText variant="caption" muted weight="medium">
                  {item.unloadingDate ? dayjs(item.unloadingDate).format('DD MMM YYYY') : '—'}
                </AppText>
              </View>
              {shortage > 0 ? (
                <Badge tone="pending" label="Shortage" />
              ) : (
                <Badge tone="valid" label="Clean" />
              )}
            </View>

            <View style={styles.qtyRow}>
              <QtyCell label="LOADED" value={item.loadedQty} unit={item.qtyUnit} />
              <QtyCell label="UNLOADED" value={item.unloadedQty} unit={item.qtyUnit} />
              <QtyCell
                label="SHORTAGE"
                value={shortage}
                unit={item.qtyUnit}
                tone={shortage > 0 ? colors.warning : undefined}
              />
            </View>

            <View style={styles.footer}>
              {detention > 0 ? (
                <AppText variant="caption" muted weight="medium">
                  {detention} detention {detention === 1 ? 'day' : 'days'}
                </AppText>
              ) : <View />}
              <View style={styles.netCell}>
                <AppText variant="caption" muted weight="medium">NET RECEIVABLE</AppText>
                <MoneyText amount={item.netReceivable} variant="bodyStrong" weight="extrabold" />
              </View>
            </View>
          </Card>
        );
      }}
      empty={{
        icon: 'swap-vertical-outline',
        title: 'Nothing settled yet',
        message: can('unloading.save')
          ? 'Once a POD is in, settle the trip from its detail screen.'
          : 'Settlement records will appear here.',
      }}
    />
  );
}

function QtyCell({ label, value, unit, tone }) {
  return (
    <View style={styles.qtyCell}>
      <AppText variant="caption" muted weight="medium">{label}</AppText>
      <AppText variant="bodyStrong" weight="extrabold" color={tone}>
        {value === null || value === undefined ? '—' : `${value} ${unit || ''}`.trim()}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  headText: { flex: 1 },
  qtyRow: { flexDirection: 'row', gap: 12 },
  qtyCell: { flex: 1 },
  footer: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border,
  },
  netCell: { alignItems: 'flex-end' },
});
