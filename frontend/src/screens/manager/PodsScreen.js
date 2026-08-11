/**
 * PodsScreen.js — Stage 7, proofs of delivery.
 *
 * GET /api/erp/pods
 *
 * `handedToBilling` is the useful distinction here: a POD that is in but not yet
 * handed over is still blocking the bill.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import useList from '../../hooks/useList';
import { fetchPods } from '../../services/erpApi';
import ListScreen from '../../components/ListScreen';
import { AppText, Card, Badge, colors } from '../../components/ui';

const VIA_LABEL = {
  DRIVER_APP: 'Driver app',
  COURIER: 'Courier',
  HAND: 'By hand',
  EMAIL: 'Email',
  WHATSAPP: 'WhatsApp',
};

const viaLabel = (v) =>
  VIA_LABEL[v] || String(v || '—').replace(/_/g, ' ').toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());

export default function PodsScreen({ navigation }) {
  const list = useList(fetchPods, { initial: {} });

  return (
    <ListScreen
      title="PODs"
      subtitle={list.meta?.total ? `${list.meta.total} received` : undefined}
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      list={list}
      renderItem={({ item }) => {
        const trip = item.tripId;
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
                  {trip?.tripNumber || 'POD'}
                </AppText>
                <AppText variant="caption" muted weight="medium" numberOfLines={1}>
                  Received {item.receivedDate ? dayjs(item.receivedDate).format('DD MMM YYYY') : '—'}
                </AppText>
              </View>
              <Badge
                tone={item.handedToBilling ? 'valid' : 'pending'}
                label={item.handedToBilling ? 'With billing' : 'Awaiting billing'}
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
              <Meta icon="documents-outline" text={`${item.copyType || '—'} copy`} />
              <Meta
                icon={item.receivedVia === 'DRIVER_APP' ? 'phone-portrait-outline' : 'mail-outline'}
                text={viaLabel(item.receivedVia)}
              />
            </View>
          </Card>
        );
      }}
      empty={{
        icon: 'mail-open-outline',
        title: 'No PODs yet',
        message: 'Proofs of delivery appear here once drivers or couriers hand them in.',
      }}
    />
  );
}

function Meta({ icon, text }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={12} color={colors.textMuted} />
      <AppText variant="caption" muted weight="medium">{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  headText: { flex: 1 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeText: { flexShrink: 1 },
  metaRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
