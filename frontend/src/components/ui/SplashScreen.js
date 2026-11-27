import React, { useContext, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, Path } from 'react-native-svg';
import { fontFamily } from '../../theme/tokens';

/**
 * SplashScreen — design screen 01 (Splash).
 *
 * Shown while fonts (App.js) and auth/language (AppNavigator) resolve, and as
 * the first onboarding step. Deliberately self-contained: no AppText or
 * useLanguage, because the font gate renders above LanguageProvider. Pass
 * fontsReady={false} before fonts load so no unloaded family is referenced.
 *
 * Without `progress` the bar loops on its own (boot); the onboarding intro
 * passes an Animated value it drives itself, plus `onPress`.
 */
export default function SplashScreen({
  brand = 'Highway Sahayak',
  tagline = 'Your trip partner on every road',
  footer = 'GNB · Since 1980',
  fontsReady = true,
  script = 'latin',
  progress,
  onPress,
  pressLabel,
}) {
  // The font gate renders this above SafeAreaProvider, where the hook would throw.
  const insets = useContext(SafeAreaInsetsContext) || { top: 24, bottom: 0 };
  const own = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (progress) return undefined;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(own, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      Animated.timing(own, { toValue: 0, duration: 0, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [own, progress]);
  const value = progress || own;
  const families = !fontsReady ? null : script === 'hi' ? fontFamily.hi : script === 'bn' ? fontFamily.bn : null;
  const brandFont = !fontsReady ? { fontWeight: '800' } : { fontFamily: families ? families.bold : fontFamily.heading.extrabold, letterSpacing: families ? 0 : -1 };
  const bodyFont = !fontsReady ? null : { fontFamily: families ? families.regular : fontFamily.display.regular };
  const mark = (
    <>
      <View style={styles.tile}>
        <Svg width={60} height={60} viewBox="0 0 48 48" fill="none" stroke="#213EA7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M4 14h22v18H4z" /><Path d="M26 20h9l7 7v5H26z" />
          <Circle cx="12" cy="35" r="4" fill="#fff" /><Circle cx="34" cy="35" r="4" fill="#fff" /><Path d="M9 22h10" />
        </Svg>
      </View>
      <View style={styles.titles}>
        <Text style={[styles.brand, brandFont, families && { lineHeight: 50 }]}>{brand}</Text>
        {tagline ? <Text style={[styles.tagline, bodyFont]}>{tagline}</Text> : null}
      </View>
    </>
  );
  return (
    <View style={[styles.fill, { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 48 }]}>
      <StatusBar style="light" />
      <View />
      {onPress ? (
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={pressLabel || brand} style={styles.center}>{mark}</Pressable>
      ) : <View style={styles.center} accessible accessibilityLabel={brand}>{mark}</View>}
      <View style={styles.bottom}>
        <View style={styles.track} accessibilityRole="progressbar">
          <Animated.View style={[styles.bar, { width: value.interpolate({ inputRange: [0, 1], outputRange: ['8%', '100%'] }) }]} />
        </View>
        {footer ? <Text style={[styles.footer, bodyFont]}>{footer}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#213EA7', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 32 },
  center: { alignItems: 'center', gap: 20 },
  tile: {
    width: 104, height: 104, borderRadius: 30, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#08103C', shadowOpacity: 0.35, shadowRadius: 15, shadowOffset: { width: 0, height: 12 }, elevation: 10,
  },
  titles: { alignItems: 'center' },
  brand: { fontSize: 34, lineHeight: 38, color: '#FFFFFF', textAlign: 'center' },
  tagline: { marginTop: 8, fontSize: 15, lineHeight: 22, color: '#CBD6FF', textAlign: 'center' },
  bottom: { alignItems: 'center', gap: 18, width: '100%' },
  track: { width: 140, height: 4, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 4, backgroundColor: '#FFFFFF' },
  footer: { fontSize: 13, lineHeight: 18, color: '#CBD6FF', textAlign: 'center' },
});
