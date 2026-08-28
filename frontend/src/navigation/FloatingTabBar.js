import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FuelIcon } from './NavIcons';
import { storage } from '../utils/storage';
import { SELECTED_VEHICLE_KEY } from '../screens/VehicleScreen';
import { AppText, colors } from '../components/ui';

const INACTIVE = '#93939A';

/**
 * FloatingTabBar — the rounded floating tab bar from the dashboard design.
 * Rendered in normal flow (reserves its own height), with an optional raised
 * center refuel FAB that overflows above the bar.
 *
 * Pass showFab to insert the center FAB (drivers). The FAB opens RefuelDetails
 * with the saved vehicle, mirroring HomeScreen.startRefuel.
 */
export default function FloatingTabBar({ state, descriptors, navigation, showFab = false }) {
  const insets = useSafeAreaInsets();

  const handleRefuel = async () => {
    let saved = null;
    try {
      saved = await storage.getItem(SELECTED_VEHICLE_KEY);
    } catch {
      saved = null;
    }
    navigation.navigate('RefuelDetails', {
      vehicleId: saved?._id || null,
      vehicleLabel: saved?.registrationNumber || null,
      vehicleAssigned: !!saved,
    });
  };

  const renderTab = (route, index) => {
    const { options } = descriptors[route.key];
    const focused = state.index === index;
    const color = focused ? colors.primary : INACTIVE;
    const label = options.tabBarLabel ?? route.name;

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
    };

    return (
      <Pressable key={route.key} style={styles.tab} onPress={onPress} hitSlop={6}>
        {options.tabBarIcon ? options.tabBarIcon({ focused, color, size: 22 }) : null}
        <AppText weight={focused ? 'bold' : 'semibold'} color={focused ? colors.primaryDeep : color} style={styles.label}>
          {label}
        </AppText>
      </Pressable>
    );
  };

  let inner;
  if (showFab) {
    const mid = Math.ceil(state.routes.length / 2);
    inner = (
      <>
        {state.routes.slice(0, mid).map((r, i) => renderTab(r, i))}
        <View style={styles.fabSlot} />
        {state.routes.slice(mid).map((r, i) => renderTab(r, i + mid))}
      </>
    );
  } else {
    inner = state.routes.map((r, i) => renderTab(r, i));
  }

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 14) }]}>
      <View style={styles.bar}>{inner}</View>

      {showFab ? (
        <Pressable style={styles.fab} onPress={handleRefuel} accessibilityRole="button" accessibilityLabel="Start refuel">
          <LinearGradient
            colors={colors.gradient}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.fabGradient}
          >
            <FuelIcon size={26} color={colors.white} />
          </LinearGradient>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  bar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingHorizontal: 14,
    shadowColor: '#0A1024',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: { fontSize: 10 },
  fabSlot: { width: 58 },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    top: -22,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: '#213EA7',
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
