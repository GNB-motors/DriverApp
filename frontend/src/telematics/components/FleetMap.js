import React from 'react';
import { View } from 'react-native';
import { AppText, Card } from '../../components/ui';
export default function FleetMap({ vehicles }) {
  const points = vehicles.filter((vehicle) => vehicle.coordinates);
  return <Card><AppText weight="semibold">Map integration pending</AppText>{points.map((vehicle) => <View key={vehicle.id}><AppText>{vehicle.plate}: {vehicle.coordinates.latitude}, {vehicle.coordinates.longitude}</AppText></View>)}{!points.length && <AppText muted>No location coordinates available in this view.</AppText>}</Card>;
}
