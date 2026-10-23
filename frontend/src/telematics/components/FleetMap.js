import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect, Text as SvgText, G } from 'react-native-svg';
import { AppText, colors, radius } from '../../components/ui';
// Synthetic coordinates plotted onto a schematic, never a geographic basemap.
export default function FleetMap({ vehicles, trail = false }) {
  const points = vehicles.filter((v) => v.coordinates);
  const latitudes = points.map((v) => v.coordinates.latitude); const longitudes = points.map((v) => v.coordinates.longitude);
  const minLat = Math.min(...latitudes); const minLng = Math.min(...longitudes);
  const latRange = Math.max(0.1, Math.max(...latitudes) - minLat); const lngRange = Math.max(0.1, Math.max(...longitudes) - minLng);
  return <View style={s.frame}><Svg width="100%" height={220} viewBox="0 0 340 220" accessibilityLabel="Illustrative sample fleet positions. Vehicle details are listed below."><Rect width="340" height="220" fill={colors.blueTint} />{[30, 85, 150, 210].map((y) => <Path key={y} d={`M0 ${y} Q160 ${y - 60} 340 ${y + 15}`} stroke={colors.surface} strokeWidth="12" fill="none" />)}<Path d="M20 0 Q90 120 140 220 M270 0 Q200 110 320 220" stroke={colors.surface} strokeWidth="10" fill="none" />{trail && <Path d="M55 175 Q95 195 120 110 T260 50" fill="none" stroke={colors.primary} strokeWidth="4" strokeDasharray="7 5" />}{points.map((vehicle, i) => { const x = 55 + (vehicle.coordinates.longitude - minLng) / lngRange * 225; const y = 165 - (vehicle.coordinates.latitude - minLat) / latRange * 115; return <G key={vehicle.id}><Circle cx={x} cy={y} r={17} fill={colors.surface} /><Circle cx={x} cy={y} r={13} fill={vehicle.status === 'offline' ? colors.textMuted : colors.primary} /><SvgText x={x} y={y + 4} textAnchor="middle" fill={colors.white} fontSize="11" fontWeight="bold">{i + 1}</SvgText></G>; })}</Svg><View style={s.caption}><AppText variant="caption" muted>{points.length ? 'Schematic · Synthetic coordinates · Not live' : 'No sample positions in this view'}</AppText></View></View>;
}
const s = StyleSheet.create({ frame: { overflow: 'hidden', borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, caption: { padding: 12 } });
