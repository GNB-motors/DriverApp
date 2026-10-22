import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from './AppText';
import Card from './Card';
import { colors, spacing } from '../../theme/tokens';

export default function StatCard({ label, value, subtitle, tone = 'primary', icon }) {
  const getToneColor = () => {
    switch (tone) {
      case 'success': return colors.success;
      case 'warning': return colors.warning;
      case 'danger': return colors.danger;
      default: return colors.primaryDeep;
    }
  };

  return (
    <Card padding={16} elevated="sm" style={styles.card}>
      <AppText variant="caption" muted style={styles.label}>{label}</AppText>
      <View style={styles.valueRow}>
        <AppText variant="h2" weight="extrabold" style={{ color: getToneColor() }}>
          {value}
        </AppText>
        {icon && <View style={styles.icon}>{icon}</View>}
      </View>
      {subtitle && (
        <AppText variant="small" muted style={styles.subtitle}>
          {subtitle}
        </AppText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 120 },
  label: { marginBottom: 4, letterSpacing: 0.5 },
  valueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  icon: { opacity: 0.8 },
  subtitle: { marginTop: 4 },
});
