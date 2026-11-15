import React from 'react';
import { StyleSheet, View } from 'react-native';
import { driveTokens } from '../../theme/driveTokens';
import { boundsOf } from './navigationFormat';
import { nativeNavigationAvailable, requireNavigationNative } from './nativeNavigation';
import { mapStyleUrl } from './mapStyle';
import { SvgXml } from 'react-native-svg';
import { navTruckSvg } from './navTruckIcon';

let maplibre = null;
const loadMapLibre = () => (maplibre ||= requireNavigationNative(() => require('@maplibre/maplibre-react-native')));

const INDIA_CENTER = [79.0, 22.5];
const TRUCK_SIZE = 84;
const line = coordinates => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } });
const point = coordinates => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates } });

export const mapStyleConfigured = () => nativeNavigationAvailable;

// routes: [{ id, coordinates, selected }]. follow: chase the truck; otherwise frame every route.
export default function NavigationMap({ routes = [], position, course, destination, follow = false, padding, onUserPan }) {
  if (!nativeNavigationAvailable) return <View style={[StyleSheet.absoluteFill, { backgroundColor: driveTokens.day.map }]} />;
  const { Map, Camera, GeoJSONSource, Layer, Marker } = loadMapLibre();
  // Markers don't turn with the map: when following, the camera already faces the course, so the truck points up.
  const heading = follow || !Number.isFinite(course) ? 0 : course;
  const truckXml = navTruckSvg({ heading });
  const drawn = routes.filter(r => r.coordinates?.length > 1);
  const selected = drawn.find(r => r.selected) || drawn[0];
  // Frame the routes alone once they exist, so each GPS fix doesn't move the overview.
  const bounds = boundsOf(drawn.length ? drawn.flatMap(r => r.coordinates) : [...(position ? [position] : []), ...(destination ? [destination] : [])]);
  const insets = { top: 24, bottom: 24, left: 32, right: 32, ...padding };
  let camera = null;
  if (follow && position) camera = <Camera center={position} zoom={16.5} pitch={55} bearing={Number.isFinite(course) ? course : 0} padding={{ ...insets, top: insets.top + 160 }} duration={900} />;
  else if (bounds && (bounds[0] !== bounds[2] || bounds[1] !== bounds[3])) camera = <Camera bounds={bounds} padding={insets} pitch={0} bearing={0} duration={700} />;
  else if (position) camera = <Camera center={position} zoom={14} pitch={0} bearing={0} padding={insets} duration={700} />;
  // Before the first fix, open on India rather than the whole world.
  else camera = <Camera center={INDIA_CENTER} zoom={4} pitch={0} bearing={0} padding={insets} />;
  return <Map style={StyleSheet.absoluteFill} mapStyle={mapStyleUrl()} logo={false} compass={false} attribution
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
    {position && <Marker id="truck-position" lngLat={position} anchor="center">
      <SvgXml xml={truckXml} width={TRUCK_SIZE} height={TRUCK_SIZE} />
    </Marker>}
  </Map>;
}
