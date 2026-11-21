import React, { useEffect, useRef, useState, useMemo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { SvgXml } from "react-native-svg";
import { AppText, Card, colors, elevation, radius } from "../../components/ui";
import { mapPoints, trailCoordinates, trailSegments } from "./mapGeometry";
import { truckSvg } from "./truckIcon";
import { markerHeading } from "./liveMap";
import { clusterVehicles } from "./clustering";

const EMPTY_TRAIL = [];

function ClusterMarker({ cluster, onPress }) {
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    setTracking(true);
    const timer = setTimeout(() => setTracking(false), 500);
    return () => clearTimeout(timer);
  }, [cluster.count]);

  const size = cluster.count >= 100 ? 50 : cluster.count >= 10 ? 44 : 38;
  const rad = size / 2;

  return (
    <Marker
      coordinate={cluster.coordinates}
      anchor={{ x: 0.5, y: 0.5 }}
      onPress={() => onPress(cluster)}
      tracksViewChanges={tracking}
      zIndex={2000 + cluster.count}
    >
      <View
        style={[
          styles.clusterCircle,
          {
            width: size,
            height: size,
            borderRadius: rad,
            backgroundColor: cluster.statusColor || colors.primary,
          },
        ]}
      >
        <AppText
          variant="small"
          weight="extrabold"
          color={colors.white}
          style={styles.clusterText}
        >
          {cluster.count > 999 ? "999+" : cluster.count}
        </AppText>
      </View>
    </Marker>
  );
}

export default function FleetMap({
  vehicles = [],
  trailPoints = EMPTY_TRAIL,
  traveledTrailPoints = EMPTY_TRAIL,
  activePosition = null,
  onSelectVehicle,
  onExpand,
  caption,
  style,
  mapStyle,
  children,
}) {
  const map = useRef(null);
  const points = mapPoints(vehicles || []);
  const selection = points.map((point) => point.id).join("|");
  const trailCoords = trailCoordinates(trailPoints);
  const allCoords = [
    ...points.map((point) => point.coordinates),
    ...trailCoords,
  ];
  const [region, setRegion] = useState({
    latitude: allCoords[0]?.latitude || (activePosition ? activePosition.latitude : 20.5937),
    longitude: allCoords[0]?.longitude || (activePosition ? activePosition.longitude : 78.9629),
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

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

  const clusteredItems = useMemo(
    () => clusterVehicles(points, region),
    [points, region],
  );

  const handleClusterPress = (cluster) => {
    const lats = cluster.vehicles.map((v) => v.coordinates.latitude);
    const lngs = cluster.vehicles.map((v) => v.coordinates.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latSpan = maxLat - minLat;
    const lngSpan = maxLng - minLng;

    const currentLatDelta = region?.latitudeDelta || 0.1;
    const currentLngDelta = region?.longitudeDelta || 0.1;

    map.current?.animateToRegion(
      {
        latitude: cluster.coordinates.latitude,
        longitude: cluster.coordinates.longitude,
        latitudeDelta: Math.max(
          0.01,
          latSpan > 0 ? latSpan * 1.8 : currentLatDelta / 2.8,
        ),
        longitudeDelta: Math.max(
          0.01,
          lngSpan > 0 ? lngSpan * 1.8 : currentLngDelta / 2.8,
        ),
      },
      450,
    );
  };

  if (!allCoords.length && !activePosition)
    return (
      <Card style={style}>
        <AppText muted>
          No reported coordinates are available in this view.
        </AppText>
      </Card>
    );

  return (
    <View style={[styles.frame, style]}>
      <MapView
        ref={map}
        style={[styles.map, mapStyle]}
        onMapReady={fit}
        initialRegion={{
          latitude: allCoords[0]?.latitude || (activePosition ? activePosition.latitude : 20.5937),
          longitude: allCoords[0]?.longitude || (activePosition ? activePosition.longitude : 78.9629),
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        onRegionChangeComplete={(next) => setRegion(next)}
      >
        {clusteredItems.map((item) => {
          if (item.isCluster) {
            return (
              <ClusterMarker
                key={item.id}
                cluster={item}
                onPress={handleClusterPress}
              />
            );
          }
          const vehicle = item.vehicle;
          const heading = markerHeading(vehicle);
          const xml = truckSvg({ status: vehicle.status, heading: heading ?? 0 });
          return (
            <Marker
              key={vehicle.id}
              coordinate={vehicle.coordinates}
              title={vehicle.plate}
              description={vehicle.status}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => onSelectVehicle?.(vehicle)}
            >
              <View style={styles.markerContainer}>
                <SvgXml xml={xml} width={54} height={54} />
                <View style={styles.plateTag}>
                  <AppText
                    variant="caption"
                    mono
                    weight="bold"
                    color={colors.white}
                    style={styles.plateText}
                  >
                    {vehicle.plate}
                  </AppText>
                </View>
              </View>
            </Marker>
          );
        })}
        {trailSegments(trailPoints).map((segment, index) => (
          <Polyline
            key={`trail-${index}`}
            coordinates={segment}
            strokeColor={colors.primary}
            strokeWidth={4}
          />
        ))}
        {traveledTrailPoints && traveledTrailPoints.length > 1 && (
          <Polyline
            coordinates={trailCoordinates(traveledTrailPoints)}
            strokeColor={colors.success}
            strokeWidth={5}
            zIndex={100}
          />
        )}
        {trailPoints.length > 0 && validCoordinate(trailPoints[0]) && (
          <Marker
            coordinate={{
              latitude: Number(trailPoints[0].latitude),
              longitude: Number(trailPoints[0].longitude),
            }}
            title="Start Point"
            zIndex={200}
          >
            <View style={styles.startFlagPin}>
              <Ionicons name="flag" size={12} color="#FFFFFF" />
              <AppText variant="caption" weight="bold" color="#FFFFFF" style={styles.pinText}>
                START
              </AppText>
            </View>
          </Marker>
        )}
        {trailPoints.length > 1 && validCoordinate(trailPoints[trailPoints.length - 1]) && (
          <Marker
            coordinate={{
              latitude: Number(trailPoints[trailPoints.length - 1].latitude),
              longitude: Number(trailPoints[trailPoints.length - 1].longitude),
            }}
            title="End / Current Point"
            zIndex={200}
          >
            <View style={styles.endFlagPin}>
              <Ionicons name="location" size={12} color="#FFFFFF" />
              <AppText variant="caption" weight="bold" color="#FFFFFF" style={styles.pinText}>
                END
              </AppText>
            </View>
          </Marker>
        )}
        {activePosition && validCoordinate(activePosition) && (
          <Marker
            coordinate={{
              latitude: Number(activePosition.latitude),
              longitude: Number(activePosition.longitude),
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={9999}
          >
            <View style={styles.markerContainer}>
              <SvgXml
                xml={truckSvg({
                  status: (activePosition.speed || 0) > 2 ? 'moving' : 'stopped',
                  heading: activePosition.courseDegrees || 0,
                  selected: true,
                })}
                width={56}
                height={56}
              />
              <View style={[styles.plateTag, { backgroundColor: colors.primaryDeep }]}>
                <AppText
                  variant="caption"
                  mono
                  weight="bold"
                  color={colors.white}
                  style={styles.plateText}
                >
                  {activePosition.plate || 'REPLAY'}
                </AppText>
              </View>
            </View>
          </Marker>
        )}
        {children}
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
  markerContainer: {
    alignItems: "center",
  },
  plateTag: {
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: "#172033",
    borderWidth: 1,
    borderColor: "#334155",
  },
  plateText: {
    fontSize: 9,
    lineHeight: 12,
  },
  clusterCircle: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: colors.white,
    ...elevation.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
  },
  clusterText: {
    fontSize: 14,
    lineHeight: 18,
    textAlign: "center",
  },
  startFlagPin: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16A34A",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    ...elevation.sm,
  },
  endFlagPin: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DC2626",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    ...elevation.sm,
  },
  pinText: {
    fontSize: 9,
    lineHeight: 12,
    marginLeft: 3,
  },
});
