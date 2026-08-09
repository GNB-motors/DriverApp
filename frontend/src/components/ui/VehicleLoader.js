/**
 * VehicleLoader.js
 *
 * Branded loading component for the DriverApp.
 * Mirrors the web service's LottieLoader with the same truck-material-onsite
 * animation, adapted for React Native with lottie-react-native.
 *
 * Props:
 *   visible   {boolean}  — show/hide. Default: false
 *   overlay   {boolean}  — full-screen semi-transparent overlay. Default: true
 *   size      {number}   — animation square size in dp. Default: 140
 *   message   {string}   — label below the truck. Default: 'Loading...'
 *   dark      {boolean}  — dark background overlay (for use on light screens). Default: false
 *
 * Usage — inline (no overlay):
 *   <VehicleLoader visible={isLoading} overlay={false} size={100} message="Fetching trip..." />
 *
 * Usage — full-screen overlay:
 *   <VehicleLoader visible={isSubmitting} message="Submitting CN..." />
 */

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import LottieView from 'lottie-react-native';
import { AppText, colors, spacing } from './index';

const TruckAnimation = require('../../Assets/truck-animation.json');

// ── Road strip drawn in SVG-style using Views ─────────────────────────────
function RoadStrip() {
  return (
    <View style={road.container}>
      {/* Road surface */}
      <View style={road.surface} />
      {/* Dashed centre line */}
      <View style={road.dashRow}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={road.dash} />
        ))}
      </View>
    </View>
  );
}

const road = StyleSheet.create({
  container: { width: '100%', height: 18, overflow: 'hidden', borderRadius: 4 },
  surface: { ...StyleSheet.absoluteFillObject, backgroundColor: '#1A3D35' },
  dashRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 7 },
  dash: { width: 18, height: 4, borderRadius: 2, backgroundColor: '#FFD166', opacity: 0.8 },
});

// ── Loader content ────────────────────────────────────────────────────────
function LoaderContent({ size = 140, message }) {
  const animRef = useRef(null);

  useEffect(() => {
    animRef.current?.play();
  }, []);

  return (
    <View style={content.wrapper}>
      {/* Truck animation */}
      <LottieView
        ref={animRef}
        source={TruckAnimation}
        autoPlay
        loop
        style={{ width: size, height: size }}
        resizeMode="cover"
      />

      {/* Road strip below the truck */}
      <RoadStrip />

      {/* Message */}
      {!!message && (
        <AppText
          variant="small"
          weight="semibold"
          color={colors.primary}
          center
          style={content.message}
        >
          {message}
        </AppText>
      )}
    </View>
  );
}

const content = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  message: { marginTop: 14, letterSpacing: 0.3 },
});

// ── Main export ───────────────────────────────────────────────────────────
export default function VehicleLoader({
  visible = false,
  overlay = true,
  size = 140,
  message = 'Loading...',
  dark = false,
}) {
  if (!visible) return null;

  if (!overlay) {
    return <LoaderContent size={size} message={message} />;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={[styles.overlay, dark && styles.overlayDark]}>
        <View style={styles.card}>
          <LoaderContent size={size} message={message} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayDark: {
    backgroundColor: 'rgba(10,59,53,0.88)',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 28,
    alignItems: 'center',
    // Soft shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
    minWidth: 200,
  },
});
