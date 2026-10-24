import React from 'react';
import { FuelIcon } from './NavIcons';
import { colors } from '../components/ui';
import CurvedTabBar from './CurvedTabBar';

export default function FloatingTabBar({ showFab = false, ...props }) {
  const { navigation } = props;
  const handleRefuel = () => navigation.navigate('FuelCapture');

  return <CurvedTabBar {...props} centerAction={showFab ? {
    label: 'Refuel',
    onPress: handleRefuel,
    icon: <FuelIcon size={26} color={colors.white} />,
  } : undefined} />;
}
