import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText, colors } from '../components/ui';
import { useDrawer } from '../context/DrawerContext';

const INACTIVE = '#93939A';

/**
 * FloatingTabBar — the rounded floating tab bar from the Nova design.
 * When `showFab` is set and there are 5 tabs, the middle tab (Trips) renders as
 * a raised circular FAB. Any tab may show a red count badge via
 * options.tabBarBadge.
 */
export default function FloatingTabBar({ state, descriptors, navigation, showFab = false }) {
  const insets = useSafeAreaInsets();
  const { isOpen } = useDrawer();
  const fabIndex = showFab ? Math.floor(state.routes.length / 2) : -1;

  // Hide the tab bar entirely while the side drawer is open so it doesn’t
  // peek above the sidebar overlay.
  if (isOpen) return null;

  const go = (route, focused) => () => {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
  };

  const renderTab = (route, index) => {
    const { options } = descriptors[route.key];
    if (options.tabBarItemStyle?.display === 'none') return null;
    
    const focused = state.index === index;
    const color = focused ? colors.primary : INACTIVE;
    const label = options.tabBarLabel ?? route.name;
    const badge = options.tabBarBadge;

    return (
      <Pressable key={route.key} style={styles.tab} onPress={go(route, focused)} hitSlop={6}>
        <View>
          {options.tabBarIcon ? options.tabBarIcon({ focused, color, size: 22 }) : null}
          {badge != null ? (
            <View style={styles.badge}>
              <AppText mono weight="bold" color={colors.white} style={styles.badgeText}>
                {String(badge)}
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText weight={focused ? 'bold' : 'semibold'} color={focused ? colors.primaryDeep : color} style={styles.label}>
          {label}
        </AppText>
      </Pressable>
    );
  };

  const fabRoute = fabIndex >= 0 ? state.routes[fabIndex] : null;
  const fabOptions = fabRoute ? descriptors[fabRoute.key].options : null;
  const fabFocused = fabIndex >= 0 && state.index === fabIndex;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 14) }]}>
      <View style={styles.bar}>
        {state.routes.map((r, i) => (i === fabIndex ? <View key={r.key} style={styles.fabSlot} /> : renderTab(r, i)))}
      </View>

      {fabRoute ? (
        <Pressable style={styles.fab} onPress={go(fabRoute, fabFocused)} accessibilityRole="button" accessibilityLabel={fabRoute.name}>
          <LinearGradient colors={colors.gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.fabGradient}>
            {fabOptions?.tabBarIcon ? fabOptions.tabBarIcon({ focused: true, color: colors.white, size: 26 }) : null}
          </LinearGradient>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.background, paddingHorizontal: 18, paddingTop: 10 },
  bar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingHorizontal: 10,
    shadowColor: colors.primaryDeep,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontSize: 10 },
  badge: {
    position: 'absolute',
    top: -5,
    right: -9,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.errorStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 9, lineHeight: 12 },
  fabSlot: { width: 64 },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    top: -22,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: colors.primaryDeep,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  fabGradient: {
    flex: 1,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.background,
  },
});
