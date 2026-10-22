import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import BrandMark from '../../Assets/BrandMark';
import { colors, radius, fontFamily } from '../../theme/tokens';

/**
 * SplashScreen — the branded launch moment (screen 01 in the design set).
 *
 * Used as the loading fallback while fonts (App.js) and auth/language
 * (AppNavigator) resolve. Deliberately self-contained: it does NOT use
 * AppText / useLanguage, because the font gate in App.js renders ABOVE the
 * LanguageProvider. Brand type is pinned to explicit families so it reads
 * the same regardless of the active language.
 *
 *   <SplashScreen />                 // fonts loaded — uses brand type
 *   <SplashScreen fontsReady={false} /> // during the font gate — system type
 *
 * Pass fontsReady={false} when shown before fonts resolve so we don't
 * reference unloaded families (avoids RN "font not loaded" warnings).
 */
export default function SplashScreen({
  brand = 'HIGHWAY SAHAYAK',
  tagline = 'हाईवे सहायक · Driver Portal',
  footer = 'GNB FLEET TECHNOLOGY',
  showDots = true,
  fontsReady = true,
}) {
  const brandFont = fontsReady ? { fontFamily: fontFamily.display.extrabold } : { fontWeight: '800' };
  const taglineFont = fontsReady ? { fontFamily: fontFamily.hi.medium } : { fontWeight: '500' };
  const footerFont = fontsReady ? { fontFamily: fontFamily.display.bold } : { fontWeight: '700' };

  return (
    <LinearGradient
      colors={colors.gradient}
      locations={[0, 0.7, 1]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.55, y: 1 }}
      style={styles.fill}
    >
      <StatusBar style="light" />

      {/* Logo tile */}
      <View style={styles.logoTile}>
        <BrandMark size={58} color={colors.white} />
      </View>

      <Text style={[styles.brand, brandFont]}>{brand}</Text>
      {tagline ? <Text style={[styles.tagline, taglineFont]}>{tagline}</Text> : null}

      {showDots ? <LoadingDots /> : null}

      <Text style={[styles.footer, footerFont]}>{footer}</Text>
    </LinearGradient>
  );
}

/** Three white dots pulsing in sequence (the hs-dot animation). */
function LoadingDots() {
  const dots = [useRef(new Animated.Value(0.25)).current, useRef(new Animated.Value(0.25)).current, useRef(new Animated.Value(0.25)).current];

  useEffect(() => {
    const make = (val) =>
      Animated.sequence([
        Animated.timing(val, { toValue: 1, duration: 480, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(val, { toValue: 0.25, duration: 720, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]);
    const loop = Animated.loop(Animated.stagger(200, dots.map(make)));
    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.dotsRow}>
      {dots.map((val, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: val }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoTile: {
    width: 104,
    height: 104,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 28,
    letterSpacing: 1.5,
    color: colors.white,
    marginTop: 26,
    textAlign: 'center',
  },
  tagline: {
    // Hind renders both Devanagari + Latin; system fallback before fonts load.
    fontSize: 14,
    letterSpacing: 0.3,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 6,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 46,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: radius.full,
    backgroundColor: colors.white,
  },
  footer: {
    position: 'absolute',
    bottom: 46,
    fontSize: 13,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
});
