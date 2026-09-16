import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';
import AppText from './AppText';

/**
 * Stepper — a vertical timeline of stages (Active trip pipeline, route timeline).
 *
 *   <Stepper steps={[
 *     { title: 'Loading started', meta: '03 Aug · 18:40', status: 'done' },
 *     { title: 'Loading done',    meta: '04 Aug · 09:20 · 24.2 t', status: 'current' },
 *     { title: 'Gate out',        meta: '4 stages remaining', status: 'todo' },
 *   ]} />
 *
 * step.status: 'done' | 'current' | 'todo'.
 * Props: steps ([{title, meta, status}]), style.
 */
export default function Stepper({ steps = [], style }) {
  return (
    <View style={style}>
      {steps.map((s, i) => {
        const isLast = i === steps.length - 1;
        const done = s.status === 'done';
        const current = s.status === 'current';
        const nodeColor = done ? colors.primary : current ? colors.primary : colors.border;
        return (
          <View key={i} style={styles.row}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.node,
                  { backgroundColor: done || current ? nodeColor : colors.surface, borderColor: nodeColor },
                  current && styles.nodeCurrent,
                ]}
              >
                {done ? <Ionicons name="checkmark" size={12} color={colors.white} /> : null}
              </View>
              {!isLast ? (
                <View style={[styles.line, { backgroundColor: done ? colors.primary : colors.border }]} />
              ) : null}
            </View>
            <View style={[styles.content, isLast && styles.contentLast]}>
              <AppText variant="bodyStrong" weight={current ? 'bold' : 'semibold'} color={current || done ? colors.text : colors.textMuted}>
                {s.title}
              </AppText>
              {s.meta ? (
                <AppText variant="caption" mono muted style={styles.meta}>
                  {s.meta}
                </AppText>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  rail: { alignItems: 'center', width: 22 },
  node: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCurrent: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  line: { width: 2, flex: 1, minHeight: 22, marginVertical: 2 },
  content: { flex: 1, paddingBottom: spacing.lg, gap: 2 },
  contentLast: { paddingBottom: 0 },
  meta: { marginTop: 1 },
});
