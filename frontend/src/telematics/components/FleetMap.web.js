/* eslint-env browser */
import React, { useEffect, useRef, useState, useMemo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import {
  GoogleMap,
  MarkerF,
  PolylineF,
  useJsApiLoader,
} from "@react-google-maps/api";
import { Ionicons } from "@expo/vector-icons";
import { AppText, Card, colors, elevation, radius } from "../../components/ui";
import { mapPoints, trailCoordinates, trailSegments } from "./mapGeometry";
import { truckSvg } from "./truckIcon";
import { markerHeading, MARKER_SIZE } from "./liveMap";
import { clusterVehicles } from "./clustering";

const mapStyle = { width: "100%", height: 340 };

function markerIcon(vehicle, selected = false) {
  const svg = truckSvg({
    status: vehicle.status,
    heading: markerHeading(vehicle),
    selected,
    shadow: true,
  });
  const half = MARKER_SIZE / 2;
  const maps = window.google?.maps;
  if (!maps) return undefined;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new maps.Size(MARKER_SIZE, MARKER_SIZE),
    anchor: new maps.Point(half, half),
    labelOrigin: new maps.Point(half, MARKER_SIZE + 6),
  };
}

function clusterIcon(cluster) {
  const maps = window.google?.maps;
  if (!maps) return undefined;
  const size = cluster.count >= 100 ? 50 : cluster.count >= 10 ? 44 : 38;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${cluster.statusColor || '#1D4ED8'}" stroke="#ffffff" stroke-width="3"/>
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new maps.Size(size, size),
    anchor: new maps.Point(size / 2, size / 2),
    labelOrigin: new maps.Point(size / 2, size / 2),
  };
}

function MapCanvas({
  points = [],
  trailPoints = [],
  traveledTrailPoints = [],
  activePosition = null,
  onSelectVehicle,
  onExpand,
  caption,
  style,
  mapStyle: customMapStyle,
  children,
}) {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({
    id: "driver-app-google-maps",
    googleMapsApiKey: key || "",
  });
  const map = useRef(null);
  const selection = points.map((point) => point.id).join("|");
  const [zoom, setZoom] = useState(10);

  const fit = () => {
    if (!map.current || !window.google) return;
    const bounds = new window.google.maps.LatLngBounds();
    const allCoordinates = [
      ...points.map((point) => point.coordinates),
      ...trailCoordinates(trailPoints),
    ];
    if (activePosition && validCoordinate(activePosition)) {
      allCoordinates.push({
        latitude: activePosition.latitude,
        longitude: activePosition.longitude,
      });
    }
    allCoordinates.forEach((point) =>
      bounds.extend({ lat: point.latitude, lng: point.longitude }),
    );
    if (allCoordinates.length) {
      map.current.fitBounds(bounds, 45);
      if (allCoordinates.length === 1) map.current.setZoom(14);
    }
  };

  useEffect(() => {
    fit();
  }, [selection, isLoaded, trailPoints]);

  const approxDelta = useMemo(() => {
    // Approx degrees per zoom level
    return 360 / Math.pow(2, zoom);
  }, [zoom]);

  const clusteredItems = useMemo(() => {
    return clusterVehicles(points, {
      latitudeDelta: approxDelta,
      longitudeDelta: approxDelta,
    });
  }, [points, approxDelta]);

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
    <View style={[styles.frame, style]}>
      <GoogleMap
        mapContainerStyle={customMapStyle || mapStyle}
        onLoad={(instance) => {
          map.current = instance;
          fit();
        }}
        onUnmount={() => {
          map.current = null;
        }}
        onZoomChanged={() => {
          if (map.current) {
            setZoom(map.current.getZoom() || 10);
          }
        }}
        options={{
          streetViewControl: false,
          fullscreenControl: !onExpand,
          mapTypeControl: true,
          maxZoom: 18,
        }}
      >
        {clusteredItems.map((item) => {
          if (item.isCluster) {
            return (
              <MarkerF
                key={item.id}
                position={{
                  lat: item.coordinates.latitude,
                  lng: item.coordinates.longitude,
                }}
                title={`${item.count} trucks. Click to zoom in.`}
                icon={clusterIcon(item)}
                label={{
                  text: String(item.count),
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: "bold",
                }}
                onClick={() => {
                  if (map.current) {
                    map.current.panTo({
                      lat: item.coordinates.latitude,
                      lng: item.coordinates.longitude,
                    });
                    map.current.setZoom((map.current.getZoom() || 10) + 2);
                  }
                }}
              />
            );
          }
          const vehicle = item.vehicle;
          return (
            <MarkerF
              key={vehicle.id}
              position={{
                lat: vehicle.coordinates.latitude,
                lng: vehicle.coordinates.longitude,
              }}
              title={`${vehicle.plate}${vehicle.status ? ` · ${vehicle.status}` : ""}`}
              icon={markerIcon(vehicle)}
              label={{
                text: vehicle.plate,
                color: "#172033",
                fontSize: "11px",
                fontWeight: "bold",
                className: "map-truck-label",
              }}
              opacity={vehicle.isStale ? 0.65 : 1}
              onClick={() => onSelectVehicle?.(vehicle)}
            />
          );
        })}
        {trailSegments(trailPoints).map((segment, index) => (
          <PolylineF
            key={`trail-${index}`}
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
        {traveledTrailPoints && traveledTrailPoints.length > 1 && (
          <PolylineF
            path={trailCoordinates(traveledTrailPoints).map((point) => ({
              lat: point.latitude,
              lng: point.longitude,
            }))}
            options={{
              strokeColor: "#16A34A",
              strokeOpacity: 0.95,
              strokeWeight: 5,
              geodesic: true,
            }}
          />
        )}
        {activePosition && validCoordinate(activePosition) && (
          <MarkerF
            position={{
              lat: activePosition.latitude,
              lng: activePosition.longitude,
            }}
            icon={markerIcon({
              status: (activePosition.speed || 0) > 2 ? "moving" : "stopped",
              courseDegrees: activePosition.courseDegrees || 0,
              plate: activePosition.plate || "REPLAY",
            }, true)}
            label={{
              text: activePosition.plate || "REPLAY",
              color: "#ffffff",
              fontSize: "11px",
              fontWeight: "bold",
            }}
            zIndex={9999}
          />
        )}
        {children}
      </GoogleMap>
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

export default function FleetMap({
  vehicles = [],
  trailPoints = [],
  traveledTrailPoints = [],
  activePosition = null,
  onSelectVehicle,
  onExpand,
  caption,
  style,
  mapStyle: customMapStyle,
  children,
}) {
  const points = mapPoints(vehicles || []);
  return (
    <MapCanvas
      points={points}
      trailPoints={trailPoints}
      traveledTrailPoints={traveledTrailPoints}
      activePosition={activePosition}
      onSelectVehicle={onSelectVehicle}
      onExpand={onExpand}
      caption={caption}
      style={style}
      mapStyle={customMapStyle}
    >
      {children}
    </MapCanvas>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
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
