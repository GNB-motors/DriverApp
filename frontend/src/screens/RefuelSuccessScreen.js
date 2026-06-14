import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { AppText, Button, colors, spacing } from '../components/ui';

/**
 * RefuelSuccessScreen — full-screen confirmation that replaces the old success
 * Alert. Reached via navigation.reset so back returns to Home, not Upload.
 *
 * params: { vehicleLabel, litres, amount }
 */
export default function RefuelSuccessScreen({ navigation, route }) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { vehicleLabel, litres, amount } = route.params || {};

  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    const loop = Animated.loop(
      Animated.timing(ringAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [scaleAnim, fadeAnim, ringAnim]);

  const ringScale = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const ringOpacity = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  const backToHome = () => navigation.reset({ index: 0, routes: [{ name: 'Main' }] });

  // Title from the localized success message (strip the trailing emoji).
  const title = (t('upload', 'successMsg') || 'Refuel submitted').replace('✅', '').trim();

  const fmtLitres = litres != null ? `${Number(litres).toFixed(1)} L` : '—';
  const fmtAmount = amount != null ? `₹${Math.round(amount).toLocaleString('en-IN')}` : '—';

  const rows = [
    { label: 'Vehicle', value: vehicleLabel || '—' },
    { label: 'Fuel filled', value: fmtLitres },
    { label: 'Amount', value: fmtAmount },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg }]}>
      <StatusBar style="dark" />

      <View style={styles.body}>
        {/* Animated check */}
        <View style={styles.checkWrap}>
          <Animated.View
            pointerEvents="none"
            style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
          />
          <Animated.View style={[styles.check, { transform: [{ scale: scaleAnim }] }]}>
            <Ionicons name="checkmark" size={50} color={colors.white} />
          </Animated.View>
        </View>

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', width: '100%' }}>
          <AppText weight="extrabold" center style={styles.title}>{title}</AppText>
          <AppText variant="body" weight="medium" muted center style={styles.subtitle}>
            Sent for approval
          </AppText>

          {/* Summary */}
          <View style={styles.card}>
            {rows.map((r, i) => (
              <View key={r.label} style={[styles.row, i < rows.length - 1 && styles.rowBorder]}>
                <AppText variant="small" weight="medium" muted>{r.label}</AppText>
                <AppText mono weight="semibold" style={styles.rowValue}>{r.value}</AppText>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>

      <Button label="Back to Home" onPress={backToHome} size="lg" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: 30 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  checkWrap: { width: 104, height: 104, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  ring: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(22,160,107,0.16)',
  },
  check: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 10,
  },

  title: { fontSize: 27, letterSpacing: -0.4, marginTop: 22 },
  subtitle: { marginTop: 6 },

  card: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 18,
    marginTop: 30,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#E6ECE9' },
  rowValue: { fontSize: 15 },
});
