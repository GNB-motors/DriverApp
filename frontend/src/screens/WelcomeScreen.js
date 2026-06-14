import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { storage } from '../utils/storage';
import { SELECTED_VEHICLE_KEY } from './VehicleScreen';
import { AppText, Button, colors, spacing, radius } from '../components/ui';

export default function WelcomeScreen() {
  const { user, setIsNewLogin } = useAuth();
  const insets = useSafeAreaInsets();
  const [savedVehicle, setSavedVehicle] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
    ]).start();

    const loop = Animated.loop(
      Animated.timing(ringAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [fadeAnim, slideAnim, scaleAnim, ringAnim]);

  // Show the assigned-vehicle card if one is saved (drivers only — mirrors HomeScreen).
  useEffect(() => {
    storage.getItem(SELECTED_VEHICLE_KEY)
      .then((saved) => setSavedVehicle(saved))
      .catch(() => setSavedVehicle(null));
  }, []);

  const handleContinue = () => {
    setIsNewLogin(false);
  };

  const driverName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Driver' : 'Driver';
  const phoneDisplay = user?.phoneNumber ? `+91 ${user.phoneNumber}` : '—';
  const isFieldAgent = user?.role === 'FIELD_AGENT';
  const roleLabel = isFieldAgent ? 'Field Agent' : 'Driver';
  const showVehicle = !isFieldAgent && !!savedVehicle?.registrationNumber;

  const ringScale = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const ringOpacity = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* ── Gradient hero ── */}
      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}
      >
        <Animated.View
          style={{
            alignItems: 'center',
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View style={styles.checkWrap}>
            <Animated.View
              pointerEvents="none"
              style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
            />
            <Animated.View style={[styles.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
              <Ionicons name="checkmark" size={42} color={colors.white} />
            </Animated.View>
          </View>

          <Text style={styles.title}>Welcome back!</Text>
          <AppText variant="h3" weight="medium" color={colors.onPrimaryMuted} style={styles.username}>
            {driverName}
          </AppText>
        </Animated.View>
      </LinearGradient>

      {/* ── White card ── */}
      <View style={[styles.card, { paddingBottom: insets.bottom + spacing.xl }]}>
        <AppText variant="body" muted center style={styles.message}>
          Great to see you again. Ready for a smooth, efficient day on the road.
        </AppText>

        {/* Role + Phone */}
        <View style={styles.infoRow}>
          <InfoCard icon="person" label="Role" value={roleLabel} />
          <InfoCard icon="call" label="Phone" value={phoneDisplay} mono />
        </View>

        {/* Assigned vehicle */}
        {showVehicle ? (
          <InfoCard
            icon="car-sport"
            label="Assigned vehicle"
            value={savedVehicle.registrationNumber}
            mono
            wide
            style={{ marginTop: 12 }}
          />
        ) : null}

        <Button
          label="Get Started"
          iconRight="arrow-forward"
          onPress={handleContinue}
          size="lg"
          style={{ marginTop: 24 }}
        />
      </View>
    </View>
  );
}

// ── Info card (vertical by default, horizontal when `wide`) ──
function InfoCard({ icon, label, value, mono = false, wide = false, style }) {
  return (
    <View style={[wide ? styles.cardWide : styles.cardCol, style]}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={17} color={colors.primary} />
      </View>
      <View style={wide ? { flex: 1 } : null}>
        <AppText variant="caption" weight="semibold" muted>{label}</AppText>
        <AppText variant="bodyStrong" weight="bold" mono={mono} numberOfLines={1} style={styles.infoValue}>
          {value}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },

  // Hero
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingBottom: 62,
  },
  checkWrap: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  checkCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 33,
    letterSpacing: -0.5,
    marginTop: 30,
    color: '#ffffff',
    fontWeight: '800',
    textAlign: 'center',
  },
  username: { marginTop: 6 },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: -22,
    paddingHorizontal: 26,
    paddingTop: 30,
  },
  message: { lineHeight: 24, marginBottom: 22 },

  // Info cards
  infoRow: { flexDirection: 'row', gap: 12 },
  cardCol: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: 14,
    gap: 8,
  },
  cardWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: 14,
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.tealTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoValue: { marginTop: 2 },
});
