import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';
import AppText from './AppText';

/**
 * ListRow — icon tile + title/subtitle + trailing accessory (the document /
 * navigation row from components.html).
 *
 *   <ListRow icon="document-text" title="Driving License" subtitle="Updated today" onPress={…} />
 *   <ListRow icon="car" title="Vehicle" right={<Badge tone="valid" label="Valid" />} />
 *
 * Props: icon, iconColor, title, subtitle, right (node — defaults to a chevron
 *        when onPress is set), onPress, showChevron, style.
 */
export default function ListRow({
  icon,
  iconColor = colors.primary,
  title,
  subtitle,
  right,
  onPress,
  showChevron,
  style,
}) {
  const chevron = (showChevron ?? !!onPress) && right === undefined;
  const Container = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed } = {}) => [styles.row, pressed && styles.pressed, style]}
    >
      {icon ? (
        <View style={styles.iconTile}>
          <Ionicons name={icon} size={19} color={iconColor} />
        </View>
      ) : null}

      <View style={styles.body}>
        <AppText variant="bodyStrong" weight="bold" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="small" muted numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {right !== undefined ? right : null}
      {chevron ? <Ionicons name="chevron-forward" size={18} color="#B4B4BC" /> : null}
    </Container>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pressed: { opacity: 0.85 },
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.tealTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  subtitle: { marginTop: 2 },
});
