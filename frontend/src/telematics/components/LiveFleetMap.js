import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { View, StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { SvgXml } from "react-native-svg";
import { AppText, colors, elevation } from "../../components/ui";
import {
  INDIA_CORNERS,
  INDIA_REGION,
  LIVE_MAP_STYLE,
  MARKER_SIZE,
  fleetOverview,
  markerHeading,
} from "./liveMap";
import { truckSvg } from "./truckIcon";
import { clusterVehicles } from "./clustering";

const INTRO_DELAY_MS = 400;
const PLATE_GAP = 4;
const PLATE_HEIGHT = 22;
const FOCUS_DELTA = 2;
const EDGE = { top: 24, right: 24, bottom: 24, left: 24 };

function TruckMarker({ vehicle, selected, onPress }) {
  const heading = markerHeading(vehicle);
  const xml = useMemo(
    () => truckSvg({ status: vehicle.status, heading, selected }),
    [vehicle.status, heading, selected],
  );
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    setTracking(true);
    // Android snapshots custom marker views; track just long enough to redraw.
    const timer = setTimeout(() => setTracking(false), 500);
    return () => clearTimeout(timer);
  }, [xml]);
  const height = selected
    ? MARKER_SIZE + PLATE_GAP + PLATE_HEIGHT
    : MARKER_SIZE;
  return (
    <Marker
      coordinate={vehicle.coordinates}
      anchor={{ x: 0.5, y: MARKER_SIZE / 2 / height }}
      onPress={() => onPress(vehicle)}
      tracksViewChanges={tracking}
      zIndex={selected ? 1000 : vehicle.status === "moving" ? 500 : 100}
    >
      <View style={[styles.marker, { height }]}>
        <SvgXml xml={xml} width={MARKER_SIZE} height={MARKER_SIZE} />
        {selected && (
          <View style={styles.plate}>
            <AppText
              variant="caption"
              mono
              weight="semibold"
              color={colors.white}
            >
              {vehicle.plate}
            </AppText>
          </View>
        )}
      </View>
    </Marker>
  );
}

function ClusterMarker({ cluster, onPress }) {
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    setTracking(true);
    const timer = setTimeout(() => setTracking(false), 500);
    return () => clearTimeout(timer);
  }, [cluster.count]);

  const size = cluster.count >= 100 ? 50 : cluster.count >= 10 ? 44 : 38;
  const radius = size / 2;

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
            borderRadius: radius,
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
  const map = useRef(null);
  const region = useRef(INDIA_REGION);
  const [currentRegion, setCurrentRegion] = useState(INDIA_REGION);
  const intro = useRef(null);
  useEffect(() => () => clearTimeout(intro.current), []);

  const showIndiaThenZoom = () => {
    fit(INDIA_CORNERS, false);
    const overview = fleetOverview(
      vehicles.map((vehicle) => vehicle.coordinates),
    );
    if (overview)
      intro.current = setTimeout(
        () => map.current?.animateToRegion(overview, 900),
        INTRO_DELAY_MS,
      );
  };

  const fit = (coordinates, animated = true) =>
    map.current?.fitToCoordinates(coordinates, {
      edgePadding: EDGE,
      animated,
    });

  useImperativeHandle(
    ref,
    () => ({
      showIndia: () => fit(INDIA_CORNERS),
      showFleet: () => {
        if (vehicles.length) fit(vehicles.map((vehicle) => vehicle.coordinates));
      },
      // Zooms in to roughly district level when far out; never zooms back out.
      focus: (vehicle) => {
        const { latitudeDelta, longitudeDelta } = region.current;
        const scale = Math.min(1, FOCUS_DELTA / latitudeDelta);
        map.current?.animateToRegion(
          {
            ...vehicle.coordinates,
            latitudeDelta: latitudeDelta * scale,
            longitudeDelta: longitudeDelta * scale,
          },
          500,
        );
      },
    }),
    [vehicles],
  );

  const clusteredItems = useMemo(
    () => clusterVehicles(vehicles, currentRegion),
    [vehicles, currentRegion],
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

    const currentLatDelta =
      region.current?.latitudeDelta || INDIA_REGION.latitudeDelta;
    const currentLngDelta =
      region.current?.longitudeDelta || INDIA_REGION.longitudeDelta;

    const nextLatDelta = Math.max(
      latSpan > 0 ? latSpan * 1.8 : 0.015,
      currentLatDelta / 2.8,
    );
    const nextLngDelta = Math.max(
      lngSpan > 0 ? lngSpan * 1.8 : 0.015,
      currentLngDelta / 2.8,
    );

    map.current?.animateToRegion(
      {
        latitude: cluster.coordinates.latitude,
        longitude: cluster.coordinates.longitude,
        latitudeDelta: Math.max(0.01, nextLatDelta),
        longitudeDelta: Math.max(0.01, nextLngDelta),
      },
      450,
    );
  };

  return (
    <MapView
      ref={map}
      style={StyleSheet.absoluteFill}
      initialRegion={INDIA_REGION}
      onMapReady={showIndiaThenZoom}
      onRegionChangeComplete={(next) => {
        region.current = next;
        setCurrentRegion(next);
      }}
      onPress={(event) => {
        if (event.nativeEvent.action !== "marker-press") onClearSelection();
      }}
      mapType={satellite ? "hybrid" : "standard"}
      customMapStyle={satellite ? undefined : LIVE_MAP_STYLE}
      mapPadding={{ top: topInset, right: 0, bottom: bottomInset, left: 0 }}
      showsPointsOfInterests={false}
      toolbarEnabled={false}
      moveOnMarkerPress={false}
      rotateEnabled={false}
      pitchEnabled={false}
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
        return (
          <TruckMarker
            key={item.vehicle.id}
            vehicle={item.vehicle}
            selected={item.vehicle.id === selectedId}
            onPress={onSelectVehicle}
          />
        );
      })}
    </MapView>
  );
});

export default LiveFleetMap;

const styles = StyleSheet.create({
  marker: { alignItems: "center" },
  plate: {
    height: PLATE_HEIGHT,
    marginTop: PLATE_GAP,
    paddingHorizontal: 8,
    borderRadius: 6,
    justifyContent: "center",
    backgroundColor: "#0C1020",
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
});
