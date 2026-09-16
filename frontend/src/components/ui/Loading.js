import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../../theme/tokens';

/** Centered spinner for screen/section loading. */
export default function Loading({ style }) {
  return (
    <View style={[styles.wrap, style]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 56, alignItems: 'center', justifyContent: 'center' },
});
