import React from 'react';
import { FuelIcon } from './NavIcons';
import { storage } from '../utils/storage';
import { SELECTED_VEHICLE_KEY } from '../screens/VehicleScreen';
import { colors } from '../components/ui';
import CurvedTabBar from './CurvedTabBar';

export default function FloatingTabBar({ showFab = false, ...props }) {
  const { navigation } = props;
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

  return <CurvedTabBar {...props} centerAction={showFab ? {
    label: 'Refuel',
    onPress: handleRefuel,
    icon: <FuelIcon size={26} color={colors.white} />,
  } : undefined} />;
}
