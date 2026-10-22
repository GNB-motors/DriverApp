import React, { useEffect, useRef } from 'react';
import { View, Pressable, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme/tokens';
import AppText from './AppText';

/**
 * SosButton — pulsing emergency control (the SOS button from components.html).
 *
 *   <SosButton onPress={…} onLongPress={…} floating />
 *
 * Props:
 *   size           diameter in px (default 96; floating FAB defaults to 64)
 *   floating       absolute-position bottom-right FAB
 *   showLabel      render the "SOS" caption (default true)
 *   onPress, onLongPress, delayLongPress
 */
export default function SosButton({
  size,
  floating = false,
  showLabel = true,
  onPress,
  onLongPress,
  delayLongPress = 3000,
  style,
}) {
  const diameter = size || (floating ? 64 : 96);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.55, 0.1, 0] });

  return (
    <View
      style={[
        styles.wrap,
        floating && styles.floating,
        { width: diameter, height: diameter },
        style,
      ]}
    >
      {/* expanding pulse ring */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            width: diameter,
            height: diameter,
            borderRadius: diameter / 2,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />
      {/* core — the only interactive element */}
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={delayLongPress}
        accessibilityRole="button"
        accessibilityLabel="SOS emergency"
        style={({ pressed }) => [
          styles.core,
          { width: diameter, height: diameter, borderRadius: diameter / 2 },
          pressed && { opacity: 0.9 },
        ]}
      >
        <Ionicons name="warning" size={diameter * 0.3} color={colors.white} />
        {showLabel ? (
          <AppText weight="extrabold" color={colors.white} style={[styles.label, { fontSize: diameter * 0.18 }]}>
            SOS
          </AppText>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  floating: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    zIndex: 999,
  },
  ring: {
    position: 'absolute',
    backgroundColor: colors.error,
  },
  core: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
  },
  label: { letterSpacing: 1, marginTop: 1 },
});
