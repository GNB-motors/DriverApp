/**
 * ConsignmentsListScreen.js — Stage 5, consignment notes.
 *
 * GET /api/erp/consignments
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import useList from '../../hooks/useList';
import { fetchConsignments } from '../../services/erpApi';
import ListScreen from '../../components/ListScreen';
import { AppText, Card, Badge, colors } from '../../components/ui';

export default function ConsignmentsListScreen({ navigation }) {
  const list = useList(fetchConsignments, { initial: {} });

  return (
    <ListScreen
      title="Consignments"
      subtitle={list.meta?.total ? `${list.meta.total} CNs` : undefined}
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      list={list}
      renderItem={({ item }) => {
        const trip = item.tripId;
        const hasBilty = !!item.biltyDocument || item.ocrStatus !== 'SKIPPED';

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
                  {item.cnNumber || '—'}
                </AppText>
                <AppText variant="caption" muted weight="medium" numberOfLines={1}>
                  {trip?.tripNumber || '—'}
                  {item.cnDate ? ` · ${dayjs(item.cnDate).format('DD MMM')}` : ''}
                </AppText>
              </View>
              <Badge
                tone={hasBilty ? 'valid' : 'pending'}
                label={hasBilty ? 'Bilty attached' : 'No bilty'}
              />
            </View>

            {trip ? (
              <View style={styles.routeRow}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <AppText variant="small" weight="semibold" numberOfLines={1} style={styles.routeText}>
                  {trip.fromLocation || '—'}
                </AppText>
                <Ionicons name="arrow-forward" size={13} color={colors.textMuted} />
                <AppText variant="small" weight="semibold" numberOfLines={1} style={styles.routeText}>
                  {trip.toLocation || '—'}
                </AppText>
              </View>
            ) : null}

            <View style={styles.metaRow}>
              <AppText variant="caption" muted weight="medium">
                Loaded {item.loadedQty != null ? `${item.loadedQty} ${item.loadedQtyUnit || ''}`.trim() : '—'}
              </AppText>
              {item.sealNumbers?.length ? (
                <AppText variant="caption" muted weight="medium">
                  {item.sealNumbers.length} {item.sealNumbers.length === 1 ? 'seal' : 'seals'}
                </AppText>
              ) : null}
            </View>
          </Card>
        );
      }}
      empty={{
        icon: 'document-text-outline',
        title: 'No consignment notes',
        message: 'CNs filed against trips appear here.',
      }}
    />
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  headText: { flex: 1 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeText: { flexShrink: 1 },
  metaRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
});
