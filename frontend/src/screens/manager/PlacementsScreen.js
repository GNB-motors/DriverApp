/**
 * PlacementsScreen.js — Stage 3, vehicles committed against delivery orders.
 *
 * GET /api/erp/placements
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import useList from '../../hooks/useList';
import { fetchPlacements } from '../../services/erpApi';
import ListScreen from '../../components/ListScreen';
import {
  AppText, Card, Badge, colors,
} from '../../components/ui';
import { Ionicons } from '@expo/vector-icons';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'PLACED', label: 'Placed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const TONE = { PLACED: 'pending', COMPLETED: 'valid', CANCELLED: 'expired' };

export default function PlacementsScreen({ navigation }) {
  const list = useList(fetchPlacements, { initial: { status: '' } });

  return (
    <ListScreen
      title="Placements"
      subtitle={list.meta?.total ? `${list.meta.total} placements` : undefined}
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      list={list}
      filters={STATUS_FILTERS}
      filterKey="status"
      renderItem={({ item }) => {
        const vehicle = item.vehicleType === 'HIRE'
          ? (item.hireVehicleNumber || item.vendorId?.name || 'Hire')
          : (item.vehicleNumber || item.vehicleId?.registrationNumber || '—');

        return (
          <Card
            padding={16}
            elevated="sm"
            style={styles.card}
            onPress={() => navigation.navigate('PlacementDetail', { placementId: item._id })}
          >
            <View style={styles.head}>
              <View style={styles.headText}>
                <AppText variant="bodyStrong" weight="extrabold" numberOfLines={1}>
                  {item.placementNumber || '—'}
                </AppText>
                <AppText variant="caption" muted weight="medium" numberOfLines={1}>
                  {item.doId?.doNumber ? `DO ${item.doId.doNumber}` : 'No DO'}
                  {item.placementDate ? ` · ${dayjs(item.placementDate).format('DD MMM')}` : ''}
                </AppText>
              </View>
              <Badge tone={TONE[item.status] || 'neutral'} label={titleise(item.status)} />
            </View>

            <View style={styles.routeRow}>
              <Ionicons name="location-outline" size={14} color={colors.textMuted} />
              <AppText variant="small" weight="semibold" numberOfLines={1} style={styles.routeText}>
                {item.fromLocation || '—'}
              </AppText>
              <Ionicons name="arrow-forward" size={13} color={colors.textMuted} />
              <AppText variant="small" weight="semibold" numberOfLines={1} style={styles.routeText}>
                {item.toLocation || '—'}
              </AppText>
            </View>

            <View style={styles.metaRow}>
              <Meta icon={item.vehicleType === 'HIRE' ? 'business-outline' : 'car-outline'} text={vehicle} />
              <Meta icon="cube-outline" text={item.material || '—'} />
              {item.previousCargo ? (
                <Meta icon="alert-circle-outline" text={`prev: ${item.previousCargo}`} />
              ) : null}
            </View>
          </Card>
        );
      }}
      empty={{
        icon: 'grid-outline',
        title: 'No placements',
        message: 'Nothing matches this filter.',
      }}
    />
  );
}

function Meta({ icon, text }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={12} color={colors.textMuted} />
      <AppText variant="caption" muted weight="medium" numberOfLines={1}>{text}</AppText>
    </View>
  );
}

const titleise = (s) =>
  String(s || '—').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  headText: { flex: 1 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeText: { flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10, flexWrap: 'wrap' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
