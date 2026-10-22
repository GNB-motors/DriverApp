import React, { useRef, useEffect } from 'react';
import { View, Pressable, Animated, Easing, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, colors, spacing, radius } from '../../../components/ui';

const WHITE = '#FFFFFF';
const FAINT = 'rgba(255,255,255,0.12)';
const LINE = 'rgba(255,255,255,0.22)';
const MUTED = 'rgba(255,255,255,0.78)';

const LOCATION = 'NH-48, 12 km before Karad';
const TIME = '17:42';
const CHECKLIST = [
  { title: 'Owner notified', meta: 'Suresh · 17:42', done: true },
  { title: 'Ops desk acknowledged', meta: 'Priya · 17:44', done: true },
  { title: 'Mechanic being assigned', meta: 'ETA shared once confirmed', done: false },
];

/**
 * 25 · SOS active — help on the way. UI-only demo.
 */
export default function SOSEmergencyActiveScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const title = route.params?.title || 'Emergency';
  const ping = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(ping, { toValue: 1, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [ping]);

  const scale = ping.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const opacity = ping.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg }]}>
      <StatusBar style="light" />

      <View style={styles.topRow}>
        <View>
          <AppText variant="label" color={MUTED}>SOS active</AppText>
          <AppText variant="small" mono color={WHITE}>Sent {TIME} · 4 m ago</AppText>
        </View>
      </View>

      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <Animated.View style={[styles.ring, { transform: [{ scale }], opacity }]} />
          <View style={styles.iconCore}><Ionicons name="warning" size={38} color={colors.error} /></View>
        </View>
        <AppText variant="h1" weight="extrabold" color={WHITE} center style={styles.headline}>{title} reported</AppText>
        <AppText variant="body" color={MUTED} center style={styles.body}>
          Your owner and the ops desk have your location. Help is being arranged. Keep your phone reachable.
        </AppText>
      </View>

      <View style={styles.card}>
        {CHECKLIST.map((s, i) => (
          <View key={i} style={[styles.step, i > 0 && styles.stepDivider]}>
            {s.done ? (
              <Ionicons name="checkmark-circle" size={22} color={WHITE} />
            ) : (
              <View style={styles.pendingRing} />
            )}
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong" weight="bold" color={WHITE}>{s.title}</AppText>
              <AppText variant="caption" mono color={MUTED}>{s.meta}</AppText>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.locCard}>
        <Ionicons name="location" size={16} color={WHITE} />
        <AppText variant="small" color={WHITE}>Live location on · </AppText>
        <AppText variant="small" mono color={MUTED}>{LOCATION}</AppText>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.callBtn} onPress={() => {}}>
          <Ionicons name="call" size={18} color={colors.error} />
          <AppText variant="h3" weight="bold" color={colors.error}>Call ops desk</AppText>
        </Pressable>
        <Pressable style={styles.safeBtn} onPress={() => navigation.popToTop()}>
          <AppText variant="bodyStrong" weight="bold" color={WHITE}>I am safe · cancel SOS</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.error, paddingHorizontal: spacing.lg },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  iconWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  ring: { position: 'absolute', width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.4)' },
  iconCore: { width: 84, height: 84, borderRadius: 42, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center' },
  headline: { marginTop: spacing.sm },
  body: { maxWidth: 320 },
  card: { backgroundColor: FAINT, borderRadius: radius.xl, borderWidth: 1, borderColor: LINE, padding: 6, marginBottom: spacing.md },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  stepDivider: { borderTopWidth: 1, borderTopColor: LINE },
  pendingRing: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: MUTED },
  locCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: FAINT, borderRadius: radius.lg,
    borderWidth: 1, borderColor: LINE, padding: 14, marginBottom: spacing.md,
  },
  actions: { gap: spacing.sm },
  callBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, height: 54, borderRadius: radius.lg, backgroundColor: WHITE },
  safeBtn: { height: 54, borderRadius: radius.lg, borderWidth: 1.5, borderColor: LINE, alignItems: 'center', justifyContent: 'center' },
});
