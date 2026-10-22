import React, { useRef, useEffect } from 'react';
import { View, Pressable, Animated, Easing, StyleSheet, Linking, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, colors, spacing, radius } from '../../../components/ui';
import useSosLocation from '../../../hooks/useSosLocation';

const WHITE = '#FFFFFF';
const FAINT = 'rgba(255,255,255,0.12)';
const LINE = 'rgba(255,255,255,0.22)';
const MUTED = 'rgba(255,255,255,0.78)';

// India's public helplines. Nothing here is sent to the owner automatically
// yet (no incident backend), so the screen must say so and give the driver
// working ways to get help: call a helpline, or send their location themselves.
const HELPLINES = {
  accident: [{ label: 'Call 112 · Emergency', number: '112' }, { label: 'Call 1033 · Highway helpline', number: '1033' }],
  breakdown: [{ label: 'Call 1033 · Highway helpline', number: '1033' }, { label: 'Call 112 · Emergency', number: '112' }],
  theft: [{ label: 'Call 112 · Police', number: '112' }],
  medical: [{ label: 'Call 108 · Ambulance', number: '108' }, { label: 'Call 112 · Emergency', number: '112' }],
};

/**
 * 25 · SOS — get help now. Honest about what is and is not sent: the owner is
 * NOT alerted automatically until the incident backend exists (plan item 6).
 */
export default function SOSEmergencyActiveScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const title = route.params?.title || 'Emergency';
  const lines = HELPLINES[route.params?.key] || HELPLINES.accident;
  const { label: locationLabel, mapsUrl } = useSosLocation();
  const ping = useRef(new Animated.Value(0)).current;

  const call = (number) => Linking.openURL(`tel:${number}`).catch(() => {});
  const shareLocation = () => {
    const where = mapsUrl ? `My location: ${mapsUrl}` : 'I could not get my location yet.';
    Share.share({ message: `${title} — I need help. ${where}` }).catch(() => {});
  };

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
          <AppText variant="label" color={MUTED}>SOS</AppText>
          <AppText variant="small" color={WHITE}>Not sent to your owner automatically</AppText>
        </View>
      </View>

      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <Animated.View style={[styles.ring, { transform: [{ scale }], opacity }]} />
          <View style={styles.iconCore}><Ionicons name="warning" size={38} color={colors.error} /></View>
        </View>
        <AppText variant="h1" weight="extrabold" color={WHITE} center style={styles.headline}>{title}</AppText>
        <AppText variant="body" color={MUTED} center style={styles.body}>
          Call for help, then send your location to your owner. Keep your phone reachable.
        </AppText>
      </View>

      <View style={styles.locCard}>
        <Ionicons name="location" size={16} color={WHITE} />
        <AppText variant="small" color={WHITE}>Your location · </AppText>
        <AppText variant="small" mono color={MUTED}>{locationLabel}</AppText>
      </View>

      <View style={styles.actions}>
        {lines.map((h) => (
          <Pressable key={h.number} style={styles.callBtn} onPress={() => call(h.number)}>
            <Ionicons name="call" size={18} color={colors.error} />
            <AppText variant="h3" weight="bold" color={colors.error}>{h.label}</AppText>
          </Pressable>
        ))}
        <Pressable style={styles.safeBtn} onPress={shareLocation}>
          <AppText variant="bodyStrong" weight="bold" color={WHITE}>Send my location to owner</AppText>
        </Pressable>
        <Pressable style={styles.safeBtn} onPress={() => navigation.popToTop()}>
          <AppText variant="bodyStrong" weight="bold" color={WHITE}>I am safe · close</AppText>
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
  locCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: FAINT, borderRadius: radius.lg,
    borderWidth: 1, borderColor: LINE, padding: 14, marginBottom: spacing.md,
  },
  actions: { gap: spacing.sm },
  callBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, height: 54, borderRadius: radius.lg, backgroundColor: WHITE },
  safeBtn: { height: 54, borderRadius: radius.lg, borderWidth: 1.5, borderColor: LINE, alignItems: 'center', justifyContent: 'center' },
});
