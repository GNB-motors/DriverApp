import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from './AppText';
import Badge from './Badge';
import { colors, radius } from '../../theme/tokens';
import {
  TRIP_TRACK,
  trackIndex,
  stateLabel,
  ADVANCE_GATE_LABELS,
  advanceGateTone,
} from '../../domain/tripState';

/**
 * PipelineProgress — the ERP trip state machine, rendered honestly.
 *
 * The backend does NOT expose a single numeric stage; it exposes a `state` plus
 * two independent gates (`advanceGate`, `cnGate`). Advance settlement runs in
 * parallel and never blocks dispatch or close, so it cannot sit on the same line
 * as the operational states. This renders the linear track from `state` and puts
 * the advance on its own row beneath it.
 *
 *   <PipelineProgress trip={trip} />
 *
 * Pass `compact` for list rows (track only, no labels or advance row).
 */
export default function PipelineProgress({ trip, compact = false, style }) {
  const state = trip?.state;
  const current = trackIndex(state);
  const cancelled = state === 'CANCELLED';

  return (
    <View style={[styles.wrap, style]}>
      {!compact && (
        <View style={styles.header}>
          <AppText variant="caption" weight="bold" color={cancelled ? colors.danger : colors.primary}>
            {stateLabel(state).toUpperCase()}
          </AppText>
          {trip?.cnGate === 'UPDATED' && trip?.consignment?.cnNumber ? (
            <AppText variant="caption" weight="semibold" muted>
              CN {trip.consignment.cnNumber}
            </AppText>
          ) : null}
        </View>
      )}

      <View style={styles.track}>
        {TRIP_TRACK.map((step, i) => {
          const done = !cancelled && i < current;
          const active = !cancelled && i === current;
          const isLast = i === TRIP_TRACK.length - 1;

          return (
            <View key={step.state} style={styles.stepWrap}>
              <View style={styles.nodeRow}>
                <View
                  style={[
                    styles.node,
                    compact && styles.nodeCompact,
                    done && styles.nodeDone,
                    active && styles.nodeActive,
                    cancelled && styles.nodeCancelled,
                  ]}
                >
                  {done ? (
                    <Ionicons name="checkmark" size={compact ? 9 : 12} color={colors.white} />
                  ) : (
                    <View
                      style={[
                        styles.dot,
                        active && styles.dotActive,
                        compact && styles.dotCompact,
                      ]}
                    />
                  )}
                </View>
                {!isLast && (
                  <View style={[styles.connector, done && styles.connectorDone]} />
                )}
              </View>

              {!compact && (
                <AppText
                  variant="caption"
                  weight={active ? 'bold' : 'medium'}
                  muted={!active && !done}
                  color={active ? colors.primary : undefined}
                  numberOfLines={1}
                  style={styles.label}
                >
                  {step.short}
                </AppText>
              )}
            </View>
          );
        })}
      </View>

      {/* Advance is a parallel financial track — deliberately on its own row so
          it is never mistaken for an operational step. */}
      {!compact && trip?.advanceGate && trip.advanceGate !== 'NONE' && (
        <View style={styles.advanceRow}>
          <Ionicons name="wallet-outline" size={14} color={colors.textMuted} />
          <AppText variant="caption" muted weight="medium" style={styles.advanceLabel}>
            Advance
          </AppText>
          <Badge
            tone={badgeTone(advanceGateTone(trip.advanceGate))}
            label={ADVANCE_GATE_LABELS[trip.advanceGate] || trip.advanceGate}
          />
        </View>
      )}
    </View>
  );
}

/** tripState tones → Badge tones. */
function badgeTone(tone) {
  switch (tone) {
    case 'success': return 'valid';
    case 'warning': return 'pending';
    case 'danger': return 'expired';
    case 'info': return 'info';
    default: return 'neutral';
  }
}

const NODE = 22;
const NODE_SM = 16;

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  track: { flexDirection: 'row', alignItems: 'flex-start' },
  stepWrap: { flex: 1, alignItems: 'flex-start' },
  nodeRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCompact: { width: NODE_SM, height: NODE_SM },
  nodeDone: { backgroundColor: colors.success, borderColor: colors.success },
  nodeActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  nodeCancelled: { borderColor: colors.border, backgroundColor: colors.background },
  dot: { width: 6, height: 6, borderRadius: radius.full, backgroundColor: colors.border },
  dotCompact: { width: 4, height: 4 },
  dotActive: { backgroundColor: colors.white },
  connector: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: 3 },
  connectorDone: { backgroundColor: colors.success },
  label: { fontSize: 9.5, marginTop: 6, letterSpacing: 0.1 },
  advanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  advanceLabel: { flex: 1 },
});
