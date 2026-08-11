import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import {
  AppText, Card, Badge, PipelineProgress, colors, radius,
} from './ui';
import {
  stateLabel, stateTone, tripRoute, tripParty, tripQty, nextActionFor,
} from '../domain/tripState';

const badgeTone = (tone) => ({
  success: 'valid', warning: 'pending', danger: 'expired', info: 'info',
}[tone] || 'neutral');

/**
 * TripCard — one ERP trip, as a tappable row. Used by every trip list (driver
 * history, manager board, owner overview) so a trip looks the same everywhere.
 *
 * Shows the next action for the viewing role, which is the single most useful
 * thing on the card — it turns a list of states into a list of jobs.
 *
 *   <TripCard trip={trip} role={user.role} onPress={…} />
 *   <TripCard trip={trip} role={role} showTrack />
 */
export default function TripCard({ trip, role, onPress, showTrack = false, style }) {
  if (!trip) return null;

  const route = tripRoute(trip);
  const action = nextActionFor(trip, role);

  return (
    <Card padding={16} elevated="sm" onPress={onPress} style={[styles.card, style]}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <AppText variant="bodyStrong" weight="extrabold" numberOfLines={1}>
            {trip.tripNumber || '—'}
          </AppText>
          <AppText variant="caption" muted weight="medium" numberOfLines={1}>
            {tripParty(trip)}
            {trip.vehicleNumber ? ` · ${trip.vehicleNumber}` : ''}
          </AppText>
        </View>
        <Badge tone={badgeTone(stateTone(trip.state))} label={stateLabel(trip.state)} />
      </View>

      <View style={styles.routeRow}>
        <Ionicons name="location-outline" size={14} color={colors.textMuted} />
        <AppText variant="small" weight="semibold" style={styles.routeText} numberOfLines={1}>
          {route.from}
        </AppText>
        <Ionicons name="arrow-forward" size={13} color={colors.textMuted} />
        <AppText variant="small" weight="semibold" style={styles.routeText} numberOfLines={1}>
          {route.to}
        </AppText>
      </View>

      <View style={styles.metaRow}>
        <Meta icon="cube-outline" text={trip.material || '—'} />
        <Meta icon="water-outline" text={tripQty(trip)} />
        {trip.tripDate ? (
          <Meta icon="calendar-outline" text={dayjs(trip.tripDate).format('DD MMM')} />
        ) : null}
      </View>

      {showTrack ? <PipelineProgress trip={trip} compact style={styles.track} /> : null}

      {action ? (
        <View style={[styles.action, action.wait && styles.actionWait]}>
          <Ionicons
            name={action.wait ? 'time-outline' : 'arrow-forward-circle'}
            size={14}
            color={action.wait ? colors.textMuted : colors.primary}
          />
          <AppText
            variant="caption"
            weight="bold"
            color={action.wait ? colors.textMuted : colors.primary}
          >
            {action.wait ? action.label : `Next: ${action.label}`}
          </AppText>
        </View>
      ) : null}
    </Card>
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

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  headText: { flex: 1 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeText: { flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10, flexWrap: 'wrap' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  track: { marginTop: 14 },
  action: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 13,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border,
  },
  actionWait: { opacity: 0.75 },
});
