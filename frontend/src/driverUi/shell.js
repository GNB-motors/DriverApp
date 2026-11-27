import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { c, r } from './theme';
import { Txt, useDriverCopy } from './kit';
import { GridIcon, HomeIcon, NavArrowIcon, PinIcon, WarnIcon } from './icons';
import { useDriverSetup } from './permissions';
import { useDriverData } from '../telematics/context/DriverDataContext';

/** True when permissions pass and tracking is actually running. */
export function useLocationHealthy() {
  const setup = useDriverSetup();
  const { tracking } = useDriverData();
  return !!setup?.status?.ok && (tracking?.mode !== 'off' || tracking?.busy);
}

/**
 * App header on every tab: brand, location pill (green = all good, red =
 * something off) and the SOS button, so SOS is always one tap away.
 */
export function AppHeader({ navigation, locationOk }) {
  const { t } = useDriverCopy();
  const insets = useSafeAreaInsets();
  const healthy = useLocationHealthy();
  const setup = useDriverSetup();
  const ok = locationOk ?? healthy;
  const openLocation = () => {
    if (!setup?.status?.ok) navigation.navigate('Location guide', { mode: 'guard' });
    else navigation.navigate('Location sharing');
  };
  return (
    <View style={[st.header, { paddingTop: insets.top + 12 }]}>
      <Txt display size={18} weight="extrabold" color={c.primary} numberOfLines={1} style={{ flex: 1 }}>{t('brand')}</Txt>
      <View style={st.actions}>
        <Pressable onPress={openLocation} accessibilityRole="button" accessibilityLabel={ok ? t('locationOn') : t('locationOff')} style={[st.pill, { backgroundColor: ok ? c.okBg : c.badBg }]} hitSlop={4}>
          <PinIcon color={ok ? c.okInk : c.badInk} />
          <View style={[st.pillDot, { backgroundColor: ok ? c.okDot : c.badDot }]} />
        </Pressable>
        <Pressable onPress={() => navigation.navigate('SOS')} accessibilityRole="button" accessibilityLabel="SOS" style={({ pressed }) => [st.sos, pressed && { opacity: 0.85 }]}>
          <WarnIcon color="#fff" width={2.4} />
          <Txt size={18} weight="extrabold" color="#fff" style={{ letterSpacing: 0.7 }}>SOS</Txt>
        </Pressable>
      </View>
    </View>
  );
}

const TAB_ICONS = { Home: HomeIcon, More: GridIcon };
const TAB_LABEL = { Home: 'home', Navigate: 'navigate', More: 'more' };

/** Floating three-tab bar: Home · Navigate (raised centre button) · More. */
export function DriverTabBar({ state, navigation }) {
  const { t } = useDriverCopy();
  const insets = useSafeAreaInsets();
  return (
    <View style={[st.barWrap, { paddingBottom: Math.max(insets.bottom, 14) }]} pointerEvents="box-none">
      <View style={st.bar} accessibilityRole="tablist" accessibilityLabel={t('mainNav')}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const color = focused ? c.primary : c.muted;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          const label = t(TAB_LABEL[route.name] || 'home');
          if (route.name === 'Navigate') {
            return (
              <Pressable key={route.key} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label} style={st.tab}>
                <View style={[st.raised, { backgroundColor: focused ? c.primary : c.accent }]}><NavArrowIcon color="#fff" /></View>
                <Txt size={13} weight={focused ? 'bold' : 'semibold'} color={color}>{label}</Txt>
              </Pressable>
            );
          }
          const Icon = TAB_ICONS[route.name] || HomeIcon;
          return (
            <Pressable key={route.key} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label} style={st.tab}>
              <Icon color={color} />
              <Txt size={13} weight={focused ? 'bold' : 'semibold'} color={color}>{label}</Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Space a scroll view must leave under its content so the floating bar never covers it. */
export const TAB_BAR_SPACE = 110;

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 12, paddingHorizontal: 16, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pill: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pillDot: { position: 'absolute', right: 4, top: 4, width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: '#fff' },
  sos: {
    flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, paddingHorizontal: 22, borderRadius: r.xl, backgroundColor: c.sos,
    shadowColor: c.sos, shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  barWrap: { position: 'absolute', left: 14, right: 14, bottom: 0 },
  bar: {
    height: 72, borderRadius: 24, backgroundColor: c.surface, flexDirection: 'row',
    shadowColor: c.shadow, shadowOpacity: 0.14, shadowRadius: 11, shadowOffset: { width: 0, height: 6 }, elevation: 10,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4, paddingBottom: 10 },
  raised: {
    position: 'absolute', top: -22, width: 58, height: 58, borderRadius: 29, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: c.primary, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
});
