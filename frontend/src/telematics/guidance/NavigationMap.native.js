import React from 'react';
import { StyleSheet } from 'react-native';
import { Map, Camera, GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { driveTokens } from '../../theme/driveTokens';
import { boundsOf } from './navigationFormat';

// Without the fleet's style the route and truck still draw, on a plain ground with no tiles.
const BLANK_STYLE = { version: 8, sources: {}, layers: [{ id: 'ground', type: 'background', paint: { 'background-color': driveTokens.day.map } }] };
const line = coordinates => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } });
const point = coordinates => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates } });

export const mapStyleConfigured = () => !!process.env.EXPO_PUBLIC_MAP_STYLE_URL;

// routes: [{ id, coordinates, selected }]. follow: chase the truck; otherwise frame every route.
export default function NavigationMap({ routes = [], position, course, destination, follow = false, padding, onUserPan }) {
  const style = process.env.EXPO_PUBLIC_MAP_STYLE_URL || BLANK_STYLE;
  const drawn = routes.filter(r => r.coordinates?.length > 1);
  const selected = drawn.find(r => r.selected) || drawn[0];
  // Frame the routes alone once they exist, so each GPS fix doesn't move the overview.
  const bounds = boundsOf(drawn.length ? drawn.flatMap(r => r.coordinates) : [...(position ? [position] : []), ...(destination ? [destination] : [])]);
  const insets = { top: 24, bottom: 24, left: 32, right: 32, ...padding };
  let camera = null;
  if (follow && position) camera = <Camera center={position} zoom={16.5} pitch={55} bearing={Number.isFinite(course) ? course : 0} padding={{ ...insets, top: insets.top + 160 }} duration={900} />;
  else if (bounds && (bounds[0] !== bounds[2] || bounds[1] !== bounds[3])) camera = <Camera bounds={bounds} padding={insets} pitch={0} bearing={0} duration={700} />;
  else if (position) camera = <Camera center={position} zoom={14} pitch={0} bearing={0} padding={insets} duration={700} />;
  return <Map style={StyleSheet.absoluteFill} mapStyle={style} logo={false} compass={false} attribution={!!process.env.EXPO_PUBLIC_MAP_STYLE_URL}
    onRegionWillChange={event => { if (event.nativeEvent?.userInteraction) onUserPan?.(); }}>
    {camera}
    {drawn.filter(r => r !== selected).map(r => <GeoJSONSource key={r.id} id={`route-alt-${r.id}`} data={line(r.coordinates)}>
      <Layer id={`route-alt-line-${r.id}`} type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': driveTokens.day.routeAlt, 'line-width': 7 }} />
    </GeoJSONSource>)}
    {selected && <GeoJSONSource id="route-selected" data={line(selected.coordinates)}>
      <Layer id="route-selected-casing" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': driveTokens.day.maneuver, 'line-width': 11 }} />
      <Layer id="route-selected-line" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': driveTokens.day.route, 'line-width': 7 }} />
    </GeoJSONSource>}
    {destination && <GeoJSONSource id="route-destination" data={point(destination)}>
      <Layer id="route-destination-dot" type="circle" paint={{ 'circle-color': driveTokens.day.sos, 'circle-radius': 9, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 3 }} />
    </GeoJSONSource>}
    {position && <GeoJSONSource id="truck-position" data={point(position)}>
      <Layer id="truck-position-halo" type="circle" paint={{ 'circle-color': driveTokens.day.route, 'circle-opacity': 0.18, 'circle-radius': 22 }} />
      <Layer id="truck-position-dot" type="circle" paint={{ 'circle-color': driveTokens.day.maneuver, 'circle-radius': 9, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 3 }} />
    </GeoJSONSource>}
  </Map>;
}
