import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, colors, spacing, radius } from '../../../components/ui';
import * as mock from '../../../demo/mock';

/**
 * 24 · SOS options — pick the kind of trouble. UI-only demo.
 * Rendered inside a transparentModal route, so the scrim + sheet are inline.
 */
const TONES = {
  error: { fg: colors.error, bg: colors.expiredBg },
  warning: { fg: colors.warning, bg: colors.pendingBg },
  purple: { fg: '#4A4266', bg: '#F0EEF6' },
  info: { fg: colors.infoText, bg: colors.infoBg },
};

export default function SOSOptionsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { sos } = mock;

  const pick = (opt) => navigation.navigate('SOSEmergencyActive', { title: opt.title, key: opt.key });

  return (
    <View style={styles.fill}>
      <StatusBar style="light" />
      <Pressable style={styles.scrim} onPress={() => navigation.goBack()} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.handle} />

        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Ionicons name="warning" size={22} color={colors.error} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="h3" weight="extrabold">Emergency SOS</AppText>
            <AppText variant="small" muted>Your location is shared the moment you send it</AppText>
          </View>
        </View>

        <View style={styles.options}>
          {sos.options.map((opt) => {
            const t = TONES[opt.tone] || TONES.error;
            return (
              <Pressable
                key={opt.key}
                onPress={() => pick(opt)}
                style={[styles.option, opt.tone === 'error' && styles.optionAccident]}
              >
                <View style={[styles.optIcon, { backgroundColor: t.bg }]}>
                  <Ionicons name={opt.icon} size={20} color={t.fg} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong" weight="bold">{opt.title}</AppText>
                  <AppText variant="caption" muted>{opt.desc}</AppText>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#B4B4BC" />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.locationChip}>
          <Ionicons name="location" size={15} color={colors.textMuted} />
          <AppText variant="caption" mono muted>{sos.location} · {sos.time}</AppText>
        </View>

        <Pressable style={styles.cancel} onPress={() => navigation.goBack()}>
          <AppText variant="bodyStrong" weight="bold" muted>Cancel</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(18,18,20,0.66)' },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: spacing.lg, paddingTop: 10, gap: spacing.md,
  },
  handle: { width: 44, height: 4, borderRadius: radius.full, backgroundColor: '#D8D8DE', alignSelf: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.expiredBg, alignItems: 'center', justifyContent: 'center' },
  options: { gap: 10 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  optionAccident: { borderColor: '#F0CFCB' },
  optIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  locationChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
    backgroundColor: colors.background, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 8,
  },
  cancel: {
    height: 52, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
});
