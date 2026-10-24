/* eslint-env browser */
import React, { useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import {
  GoogleMap,
  MarkerF,
  PolylineF,
  useJsApiLoader,
} from "@react-google-maps/api";
import { AppText, Card, colors } from "../../components/ui";
import { mapPoints, trailCoordinates, trailSegments } from "./mapGeometry";
const mapStyle = { width: "100%", height: 340 };
function MapCanvas({ points, trailPoints, onSelectVehicle, caption }) {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({
    id: "driver-app-google-maps",
    googleMapsApiKey: key || "",
  });
  const map = useRef(null);
  const selection = points.map((point) => point.id).join("|");
  const fit = () => {
    if (!map.current || !window.google) return;
    const bounds = new window.google.maps.LatLngBounds();
    [
      ...points.map((point) => point.coordinates),
      ...trailCoordinates(trailPoints),
    ].forEach((point) =>
      bounds.extend({ lat: point.latitude, lng: point.longitude }),
    );
    map.current.fitBounds(bounds, 45);
    if (points.length === 1 && !trailPoints.length) map.current.setZoom(14);
  };
  useEffect(() => {
    fit();
  }, [selection, isLoaded, trailPoints]);
  if (!key)
    return (
      <Card>
        <AppText muted>
          Google Maps key is not configured for this web app.
        </AppText>
      </Card>
    );
  if (loadError)
    return (
      <Card>
        <AppText color={colors.error}>
          Google Maps could not load. Check the map key and allowed website
          address.
        </AppText>
      </Card>
    );
  if (!isLoaded)
    return (
      <Card>
        <AppText muted>Loading map…</AppText>
      </Card>
    );

  return (
    <View style={styles.frame}>
      <GoogleMap
        mapContainerStyle={mapStyle}
        onLoad={(instance) => {
          map.current = instance;
          fit();
        }}
        onUnmount={() => {
          map.current = null;
        }}
        options={{
          streetViewControl: false,
          fullscreenControl: true,
          mapTypeControl: true,
          maxZoom: 18,
        }}
      >
        {points.map((vehicle) => (
          <MarkerF
            key={vehicle.id}
            position={{
              lat: vehicle.coordinates.latitude,
              lng: vehicle.coordinates.longitude,
            }}
            title={`${vehicle.plate}${vehicle.status ? ` · ${vehicle.status}` : ""}`}
            label={{
              text: vehicle.plate,
              color: "#25314C",
              fontSize: "11px",
              fontWeight: "600",
            }}
            opacity={vehicle.isStale ? 0.65 : 1}
            onClick={() => onSelectVehicle?.(vehicle)}
          />
        ))}
        {trailSegments(trailPoints).map((segment, index) => (
          <PolylineF
            key={index}
            path={segment.map((point) => ({
              lat: point.latitude,
              lng: point.longitude,
            }))}
            options={{
              strokeColor: colors.primary,
              strokeOpacity: 0.85,
              strokeWeight: 4,
              geodesic: true,
            }}
          />
        ))}
      </GoogleMap>
      <AppText variant="caption" muted style={styles.caption}>
        {caption ||
          `${points.length} trucks with reported coordinates · Tap a marker for details`}
      </AppText>
    </View>
  );
}
const EMPTY_TRAIL = [];
export default function FleetMap({
  vehicles,
  trailPoints = EMPTY_TRAIL,
  onSelectVehicle,
  caption,
}) {
  const points = mapPoints(vehicles);
  return points.length ? (
    <MapCanvas
      points={points}
      trailPoints={trailPoints}
      onSelectVehicle={onSelectVehicle}
      caption={caption}
    />
  ) : (
    <Card>
      <AppText muted>
        No reported coordinates are available in this view.
      </AppText>
    </Card>
  );
}
const styles = StyleSheet.create({
  frame: {
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  caption: { padding: 12 },
});
