import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path, Circle, Polygon, Defs, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import { AppText } from '../../components/ui';
import { BRAND, INK, HERO_COLORS, Glow, LineIcon, CtaButton } from './onboardingKit';

const FEATURES = [
  { key: 'bill', label: 'Bills and fuel receipts, captured and approved', Icon: ReceiptIcon, tint: 'rgba(47,88,238,0.10)', color: BRAND },
  { key: 'wallet', label: 'Trip spends and advances, always clear', Icon: WalletIcon, tint: 'rgba(47,88,238,0.10)', color: BRAND },
  { key: 'sos', label: 'Emergencies reach the right people instantly', Icon: SirenIcon, tint: 'rgba(229,104,107,0.12)', color: '#D4484C' },
];

// The road is the design's 520×360 plane under CSS perspective(320px) rotateX(58deg)
// about its bottom edge; project it once so native renders the same trapezoid.
const ROAD_W = 520;
const ROAD_H = 360;
const PERSPECTIVE = 320;
const TILT = (58 * Math.PI) / 180;

function project(u, v) {
  const y = v - ROAD_H;
  const f = PERSPECTIVE / (PERSPECTIVE - y * Math.sin(TILT));
  return [u * f, y * Math.cos(TILT) * f];
}

const ROAD_SVG_H = Math.ceil(-project(0, 0)[1]);
const toPoint = ([x, y]) => `${(ROAD_W / 2 + x).toFixed(2)},${(ROAD_SVG_H + y).toFixed(2)}`;
const quad = (u0, u1, v0, v1) =>
  [project(u0, v0), project(u1, v0), project(u1, v1), project(u0, v1)].map(toPoint).join(' ');
const yAt = (v) => ROAD_SVG_H + project(0, v)[1];
const offsetAt = (v) => (yAt(v) - yAt(0)) / (yAt(ROAD_H) - yAt(0));

const HALF = ROAD_W / 2;
const ROAD_SURFACE = quad(-HALF, HALF, 0, ROAD_H);
const ROAD_EDGES = [quad(-HALF, -HALF + 2, 0, ROAD_H), quad(HALF - 2, HALF, 0, ROAD_H)];
const SURFACE_STOPS = [0, 90, 180, 270, 360].map((v) => ({ v, opacity: (0.07 * v) / ROAD_H }));
const DASH_STOPS = [0, 54, 108, 162, 216, 360].map((v) => ({ v, opacity: 0.55 * Math.min(v / 216, 1) }));
const DASHES = [];
for (let v = 0; v < ROAD_H; v += 56) DASHES.push(quad(-3, 3, v, Math.min(v + 28, ROAD_H)));

const EYEBROW_FONT = Platform.select({ ios: 'Helvetica', web: 'Helvetica, Arial, sans-serif', default: 'sans-serif' });

export default function GetStartedScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <LinearGradient
        colors={HERO_COLORS}
        locations={[0, 0.38, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.hero}
      >
        <Glow id="glowTop" size={320} rgb="130,155,245" opacity={0.45} style={styles.glowTop} />
        <Glow id="glowBottom" size={260} rgb="109,138,243" opacity={0.35} style={styles.glowBottom} />
        <Road />

        <View style={[styles.heroBody, { paddingTop: insets.top }]}>
          <View style={styles.logoShadow}>
            <LinearGradient
              colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.08)']}
              start={{ x: 0.281, y: -0.102 }}
              end={{ x: 0.719, y: 1.102 }}
              style={styles.logoGlass}
            >
              <View style={styles.logoTile}>
                <BusIcon />
              </View>
              <View pointerEvents="none" style={styles.logoHighlight} />
            </LinearGradient>
          </View>

          <View style={styles.titleBlock}>
            <AppText style={styles.eyebrow}>GNB Fleet Technology</AppText>
            <AppText variant="display" weight="bold" color="#FFFFFF" center style={styles.title}>
              Highway Sahayak
            </AppText>
            <AppText color="#DCE3FD" center style={styles.subtitle}>
              Trucks, trips and bills — one app for the whole team.
            </AppText>
          </View>
        </View>
      </LinearGradient>

      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 13, 24) }]}>
        <View style={styles.features}>
          {FEATURES.map(({ key, label, Icon, tint, color }) => (
            <View key={key} style={styles.featureRow}>
              <View style={[styles.featureTile, { backgroundColor: tint }]}>
                <Icon color={color} />
              </View>
              <AppText weight="medium" color={INK} style={styles.featureText}>
                {label}
              </AppText>
            </View>
          ))}
        </View>

        <CtaButton label="Get started" onPress={() => navigation.navigate('OnboardingLanguage')} />
      </View>
    </View>
  );
}

function Road() {
  return (
    <Svg width={ROAD_W} height={ROAD_SVG_H} style={[styles.absolute, styles.road]}>
      <Defs>
        <SvgLinearGradient id="roadSurface" x1="0" y1={yAt(0)} x2="0" y2={yAt(ROAD_H)} gradientUnits="userSpaceOnUse">
          {SURFACE_STOPS.map(({ v, opacity }) => (
            <Stop key={v} offset={offsetAt(v)} stopColor="#FFFFFF" stopOpacity={opacity} />
          ))}
        </SvgLinearGradient>
        <SvgLinearGradient id="roadDash" x1="0" y1={yAt(0)} x2="0" y2={yAt(ROAD_H)} gradientUnits="userSpaceOnUse">
          {DASH_STOPS.map(({ v, opacity }) => (
            <Stop key={v} offset={offsetAt(v)} stopColor="#FFFFFF" stopOpacity={opacity} />
          ))}
        </SvgLinearGradient>
      </Defs>
      <Polygon points={ROAD_SURFACE} fill="url(#roadSurface)" />
      {ROAD_EDGES.map((points) => (
        <Polygon key={points} points={points} fill="rgba(255,255,255,0.18)" />
      ))}
      {DASHES.map((points) => (
        <Polygon key={points} points={points} fill="url(#roadDash)" />
      ))}
    </Svg>
  );
}

function BusIcon() {
  return (
    <LineIcon size={34} color={BRAND}>
      <Path d="M8 6v6" />
      <Path d="M15 6v6" />
      <Path d="M2 12h19.6" />
      <Path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3" />
      <Circle cx="7" cy="18" r="2" />
      <Path d="M9 18h5" />
      <Circle cx="16" cy="18" r="2" />
    </LineIcon>
  );
}

function ReceiptIcon({ color }) {
  return (
    <LineIcon size={22} color={color}>
      <Path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <Path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <Path d="M12 17.5v-11" />
    </LineIcon>
  );
}

function WalletIcon({ color }) {
  return (
    <LineIcon size={22} color={color}>
      <Path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <Path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </LineIcon>
  );
}

function SirenIcon({ color }) {
  return (
    <LineIcon size={22} color={color}>
      <Path d="M7 18v-6a5 5 0 1 1 10 0v6" />
      <Path d="M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z" />
      <Path d="M21 12h1" />
      <Path d="M18.5 4.5 18 5" />
      <Path d="M2 12h1" />
      <Path d="M12 2v1" />
      <Path d="m4.93 4.93.71.71" />
    </LineIcon>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  absolute: { position: 'absolute' },

  hero: { flex: 1, overflow: 'hidden' },
  glowTop: { top: -120, right: -90 },
  glowBottom: { bottom: -60, left: -80 },
  road: { bottom: -40, left: '50%', marginLeft: -ROAD_W / 2 },
  heroBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 32,
    paddingBottom: 40,
  },

  logoShadow: { width: 88, height: 88, borderRadius: 26, boxShadow: '0 20px 40px rgba(5,8,22,0.35)' },
  logoGlass: {
    flex: 1,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoTile: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 25,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
  },

  titleBlock: { alignItems: 'center', gap: 10 },
  eyebrow: {
    fontFamily: EYEBROW_FONT,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 4.84,
    textTransform: 'uppercase',
    color: '#C3CEFA',
  },
  title: { fontSize: 36, lineHeight: 39.6, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, lineHeight: 24, maxWidth: 260 },

  sheet: {
    marginTop: -28,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 28,
    paddingHorizontal: 24,
    gap: 24,
    boxShadow: '0 -12px 32px rgba(14,27,77,0.18)',
  },
  features: { gap: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
  featureTile: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1, fontSize: 16, lineHeight: 21.6 },
});
