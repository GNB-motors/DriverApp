import React from 'react';
import { View } from 'react-native';
import { Map, Camera, GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { AppText } from '../../components/ui';
export default function NavigationMap({ coordinates = [], position }) {
  const style = process.env.EXPO_PUBLIC_MAP_STYLE_URL;
  if (!style) return <AppText muted>Map tiles are unavailable. Guidance uses the downloaded route; offline map coverage has not been verified.</AppText>;
  return <View style={{ height: 260 }}><Map style={{ flex: 1 }} mapStyle={style}>
    {coordinates.length > 0 && <Camera center={position || coordinates[0]} zoom={13} />}
    {coordinates.length > 1 && <GeoJSONSource id="navigation-route" data={{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } }}><Layer id="navigation-route-line" type="line" paint={{ "line-color": "#2868df", "line-width": 6 }} /></GeoJSONSource>}
    {position && <GeoJSONSource id="navigation-position" data={{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: position } }}><Layer id="navigation-position-circle" type="circle" paint={{ "circle-color": "#173eaa", "circle-radius": 8, "circle-stroke-color": "white", "circle-stroke-width": 2 }} /></GeoJSONSource>}
  </Map></View>;
}
