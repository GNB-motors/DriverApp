import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { colors } from '../theme/tokens';

/**
 * A thin banner shown while the device is offline, so failures read as "no
 * connection" rather than a broken app. Overlays the top of the screen.
 */
export default function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      // isInternetReachable can be null (unknown) — only flag a definite offline.
      setOffline(state.isConnected === false || state.isInternetReachable === false);
    });
    return () => unsub();
  }, []);

  if (!offline) return null;

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 4 }]} pointerEvents="none">
      <Text style={styles.text}>No internet connection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999,
    backgroundColor: colors.error, paddingBottom: 6, paddingHorizontal: 12, alignItems: 'center',
  },
  text: { color: colors.white, fontSize: 12, fontWeight: '700' },
});
