import React from 'react';
import { useNavigation } from '@react-navigation/native';
import SosButton from './ui/SosButton';

/**
 * Floating SOS FAB wired to navigation.
 *   tap          → SOS options sheet
 *   long-press   → emergency active (3s)
 *
 * Thin wrapper over the global <SosButton> so visuals stay on-brand.
 */
export default function SOSButton() {
  const navigation = useNavigation();

  return (
    <SosButton
      floating
      showLabel
      onPress={() => navigation.navigate('SOSOptions')}
      onLongPress={() => navigation.navigate('SOSEmergencyActive')}
      delayLongPress={3000}
    />
  );
}
