/* eslint-env browser */
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { View, StyleSheet } from "react-native";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import { AppText, colors } from "../../components/ui";
import {
  INDIA_BOUNDS,
  LIVE_MAP_STYLE,
  MARKER_SIZE,
  fleetOverview,
  markerHeading,
} from "./liveMap";
import { truckSvg } from "./truckIcon";
const INTRO_DELAY_MS = 400;
const mapStyle = { width: "100%", height: "100%" };
const FOCUS_ZOOM = 8;
const EDGE = 24;
const padding = (top, bottom) => ({
  top: top + EDGE,
  right: EDGE,
  bottom: bottom + EDGE,
  left: EDGE,
});
function markerIcon(vehicle, selected) {
  const svg = truckSvg({
    status: vehicle.status,
    heading: markerHeading(vehicle),
    selected,
    shadow: true,
  });
  const half = MARKER_SIZE / 2;
  const { maps } = window.google;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new maps.Size(MARKER_SIZE, MARKER_SIZE),
    anchor: new maps.Point(half, half),
    labelOrigin: new maps.Point(half, MARKER_SIZE + 6),
  };
}
const LiveFleetMap = forwardRef(function LiveFleetMap(
  {
    vehicles,
    selectedId,
    onSelectVehicle,
    onClearSelection,
    satellite = false,
    topInset = 0,
    bottomInset = 0,
  },
  ref,
) {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({
    id: "driver-app-google-maps",
    googleMapsApiKey: key || "",
  });
  const map = useRef(null);
  const intro = useRef(null);
  useEffect(() => () => clearTimeout(intro.current), []);
  useImperativeHandle(
    ref,
    () => ({
      showIndia: () =>
        map.current?.fitBounds(INDIA_BOUNDS, padding(topInset, bottomInset)),
      showFleet: () => {
        if (!map.current || !vehicles.length) return;
        const bounds = new window.google.maps.LatLngBounds();
        vehicles.forEach(({ coordinates }) =>
          bounds.extend({
            lat: coordinates.latitude,
            lng: coordinates.longitude,
          }),
        );
        map.current.fitBounds(bounds, padding(topInset, bottomInset));
      },
      focus: ({ coordinates }) => {
        if (!map.current) return;
        map.current.panTo({
          lat: coordinates.latitude,
          lng: coordinates.longitude,
        });
        if (map.current.getZoom() < FOCUS_ZOOM) map.current.setZoom(FOCUS_ZOOM);
      },
    }),
    [vehicles, topInset, bottomInset],
  );
  const message = !key
    ? "Google Maps key is not configured for this web app."
    : loadError
      ? "Google Maps could not load. Check the map key and allowed website address."
      : !isLoaded
        ? "Loading map…"
        : null;
  if (message)
    return (
      <View style={styles.message}>
        <AppText muted={!loadError} color={loadError ? colors.error : undefined}>
          {message}
        </AppText>
      </View>
    );
  return (
    <View style={StyleSheet.absoluteFill}>
      <GoogleMap
        mapContainerStyle={mapStyle}
        onLoad={(instance) => {
          map.current = instance;
          instance.fitBounds(INDIA_BOUNDS, padding(topInset, bottomInset));
          const overview = fleetOverview(
            vehicles.map((vehicle) => vehicle.coordinates),
          );
          if (!overview) return;
          const half = overview.latitudeDelta / 2;
          intro.current = setTimeout(
            () =>
              map.current?.fitBounds(
                {
                  south: overview.latitude - half,
                  north: overview.latitude + half,
                  west: overview.longitude - half,
                  east: overview.longitude + half,
                },
                padding(topInset, bottomInset),
              ),
            INTRO_DELAY_MS,
          );
        }}
        onUnmount={() => {
          map.current = null;
        }}
        onClick={onClearSelection}
        options={{
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: "greedy",
          mapTypeId: satellite ? "hybrid" : "roadmap",
          styles: satellite ? undefined : LIVE_MAP_STYLE,
        }}
      >
        {vehicles.map((vehicle) => {
          const selected = vehicle.id === selectedId;
          return (
            <MarkerF
              key={vehicle.id}
              position={{
                lat: vehicle.coordinates.latitude,
                lng: vehicle.coordinates.longitude,
              }}
              icon={markerIcon(vehicle, selected)}
              title={`${vehicle.plate} · ${vehicle.status}`}
              label={
                selected
                  ? {
                      text: vehicle.plate,
                      color: colors.text,
                      fontSize: "12px",
                      fontWeight: "700",
                    }
                  : undefined
              }
              zIndex={selected ? 1000 : vehicle.status === "moving" ? 500 : 100}
              onClick={() => onSelectVehicle(vehicle)}
            />
          );
        })}
      </GoogleMap>
    </View>
  );
});
export default LiveFleetMap;
const styles = StyleSheet.create({
  message: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
});
