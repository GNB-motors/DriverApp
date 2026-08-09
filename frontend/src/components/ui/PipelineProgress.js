import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from './AppText';
import { colors, radius } from './index';

const STAGES = [
  { stage: 1, label: 'Indented' },
  { stage: 2, label: 'Placed' },
  { stage: 3, label: 'Loaded' },
  { stage: 4, label: 'Dispatched' },
  { stage: 5, label: 'Arrived' },
  { stage: 6, label: 'Unloaded' },
  { stage: 7, label: 'POD' },
  { stage: 8, label: 'Closed' }
];

export default function PipelineProgress({ currentStage = 1, style }) {
  const progressPercent = Math.min(100, Math.max(0, (currentStage / STAGES.length) * 100));

  const currentStageLabel = STAGES.find(s => s.stage === currentStage)?.label || `Stage ${currentStage}`;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <AppText variant="caption" weight="bold" color={colors.primary}>STAGE {currentStage}</AppText>
        <AppText variant="caption" weight="semibold" muted>{currentStageLabel}</AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progressPercent}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  track: { height: 6, backgroundColor: colors.border, borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
});
