import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppText from './AppText';
import { colors, radius, spacing } from '../../theme/tokens';

/**
 * SubHeader — the flat white header used by the ERP / ops screens.
 *
 * `ScreenHeader` is the teal gradient hero and belongs to the driver's core
 * flows. Ops and finance screens are dense lists, so they use this quieter
 * header. It was copy-pasted into ~20 screens; this is that block, once.
 *
 *   <SubHeader title="Trips" subtitle="23 in transit" onBack={nav.goBack} />
 *   <SubHeader title="Approvals" right={<Badge tone="pending" label="2" />} />
 */
export default function SubHeader({
  title,
  subtitle,
  onBack,
  right,
  children,
  style,
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }, style]}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={10}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
        ) : null}

        <View style={styles.titleBlock}>
          <AppText variant="h2" weight="extrabold" numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="small" weight="medium" muted numberOfLines={1}>
              {subtitle}
            </AppText>
          ) : null}
        </View>

        {right ? <View style={styles.right}>{right}</View> : null}
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: 22,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: { flex: 1 },
  right: { marginLeft: 'auto' },
});
