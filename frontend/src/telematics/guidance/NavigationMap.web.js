import React from 'react';
import { StyleSheet, View } from 'react-native';
import { driveTokens } from '../../theme/driveTokens';
export const mapStyleConfigured = () => false;
export default function NavigationMap() { return <View style={[StyleSheet.absoluteFill, { backgroundColor: driveTokens.day.map }]} />; }
