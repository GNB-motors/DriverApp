import React, { useState } from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, colors } from '../components/ui';

// A real curved surface rather than a circle painted over a rectangular bar.
export function CurvedBarSurface({ children, center, centerLabel }) {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const mid = width / 2;
  const path = `M24 0 H${mid - 48} C${mid - 36} 0 ${mid - 38} 36 ${mid} 36 C${mid + 38} 36 ${mid + 36} 0 ${mid + 48} 0 H${width - 24} Q${width} 0 ${width} 24 V48 Q${width} 72 ${width - 24} 72 H24 Q0 72 0 48 V24 Q0 0 24 0 Z`;
  return <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 14) }]}>
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={styles.surface}>
      {width > 0 && <Svg pointerEvents="none" width={width} height={72} style={StyleSheet.absoluteFill}><Path d={path} fill={colors.surface} /></Svg>}
      <View style={styles.row}>{children}</View>
      {center && <View style={styles.center}>{center}</View>}
      {centerLabel && <AppText style={styles.centerLabel} color={colors.primary} weight="semibold">{centerLabel}</AppText>}
    </View>
  </View>;
}

export default function CurvedTabBar({ state, descriptors, navigation, centerAction, badges = {} }) {
  const middle = centerAction ? -1 : Math.floor(state.routes.length / 2);
  const press = (route, focused) => {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
  };
  const renderTab = (route, index, raised = false) => {
    const options = descriptors[route.key].options;
    const focused = index === state.index;
    const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title || route.name;
    const badge = badges[route.name] ?? options.tabBarBadge;
    return <Pressable key={route.key} accessibilityRole="button" accessibilityLabel={options.tabBarAccessibilityLabel || `${label}${badge ? `, ${badge} unread` : ''}`} accessibilityState={{ selected: focused }} onPress={() => press(route, focused)} onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })} style={raised ? styles.centerButton : styles.tab}>
      {options.tabBarIcon?.({ focused, color: raised ? colors.white : focused ? colors.primary : colors.textMuted, size: raised ? 26 : 23 })}
      {badge ? <View style={styles.badge}><AppText style={styles.badgeText} color={colors.white}>{Number(badge) > 99 ? '99+' : badge}</AppText></View> : null}
      {!raised && <AppText style={styles.label} color={focused ? colors.primary : colors.textMuted} weight={focused ? 'semibold' : 'regular'}>{label}</AppText>}
    </Pressable>;
  };
  const center = centerAction ? <Pressable accessibilityRole="button" accessibilityLabel={centerAction.label} onPress={centerAction.onPress} style={styles.centerButton}>{centerAction.icon}</Pressable> : renderTab(state.routes[middle], middle, true);
  const tabs = state.routes.map((route, index) => index === middle ? <View key={route.key} style={styles.slot} /> : renderTab(route, index));
  if (centerAction) tabs.splice(Math.ceil(tabs.length / 2), 0, <View key="center-action" style={styles.slot} />);
  return <CurvedBarSurface center={center} centerLabel={centerAction?.label || state.routes[middle]?.name}>{tabs}</CurvedBarSurface>;
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: 'transparent', paddingHorizontal: 18, paddingTop: 30, marginTop: -30, zIndex: 1 },
  surface: { height: 72, width: '100%', maxWidth: 600, alignSelf: 'center' },
  row: { height: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  tab: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 5, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  label: { fontSize: 10, textAlign: 'center' },
  slot: { width: 80 },
  center: { position: 'absolute', top: -28, left: '50%', marginLeft: -28 },
  centerButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primaryDeep, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 6, elevation: 3, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  centerLabel: { position: 'absolute', top: 45, alignSelf: 'center', fontSize: 10 },
  badge: { position: 'absolute', top: 0, right: 6, backgroundColor: colors.error, borderRadius: 10, minWidth: 16, height: 16, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 9 },
});
