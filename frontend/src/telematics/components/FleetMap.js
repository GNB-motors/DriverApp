import React, { useEffect, useRef } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { AppText, Card, colors, elevation, radius } from "../../components/ui";
import { mapPoints, trailCoordinates, trailSegments } from "./mapGeometry";
const EMPTY_TRAIL = [];
export default function FleetMap({
  vehicles,
  trailPoints = EMPTY_TRAIL,
  onSelectVehicle,
  onExpand,
  caption,
}) {
  const map = useRef(null);
  const points = mapPoints(vehicles);
  const selection = points.map((point) => point.id).join("|");
  const fit = () => {
    const coordinates = [
      ...points.map((point) => point.coordinates),
      ...trailCoordinates(trailPoints),
    ];
    if (coordinates.length)
      map.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 45, bottom: 50, left: 45 },
        animated: true,
      });
  };
  useEffect(() => {
    fit();
  }, [selection, trailPoints]);
  if (!points.length)
    return (
      <Card>
        <AppText muted>
          No reported coordinates are available in this view.
        </AppText>
      </Card>
    );
  return (
    <View style={styles.frame}>
      <MapView
        ref={map}
        style={styles.map}
        onMapReady={fit}
        initialRegion={{
          ...points[0].coordinates,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        {points.map((vehicle) => (
          <Marker
            key={vehicle.id}
            coordinate={vehicle.coordinates}
            title={vehicle.plate}
            description={vehicle.status}
            pinColor={vehicle.isStale ? "#8E94A0" : colors.primary}
            onCalloutPress={() => onSelectVehicle?.(vehicle)}
          />
        ))}
        {trailSegments(trailPoints).map((segment, index) => (
          <Polyline
            key={index}
            coordinates={segment}
            strokeColor={colors.primary}
            strokeWidth={4}
          />
        ))}
      </MapView>
      {onExpand && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open full-screen map"
          onPress={onExpand}
          style={styles.expand}
        >
          <Ionicons name="expand-outline" size={20} color={colors.text} />
        </Pressable>
      )}
      <AppText variant="caption" muted style={styles.caption}>
        {caption ||
          `${points.length} trucks with reported coordinates · Tap a marker for details`}
      </AppText>
    </View>
  );
}
const styles = StyleSheet.create({
  frame: {
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  map: { height: 340, width: "100%" },
  caption: { padding: 12 },
  expand: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...elevation.md,
  },
});
