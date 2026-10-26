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
import { AppText, colors } from "../../components/ui";
import {
  INDIA_CORNERS,
  INDIA_REGION,
  LIVE_MAP_STYLE,
  MARKER_SIZE,
  fleetOverview,
  markerHeading,
} from "./liveMap";
import { truckSvg } from "./truckIcon";
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
  return (
    <MapView
      ref={map}
      style={StyleSheet.absoluteFill}
      initialRegion={INDIA_REGION}
      onMapReady={showIndiaThenZoom}
      onRegionChangeComplete={(next) => {
        region.current = next;
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
      {vehicles.map((vehicle) => (
        <TruckMarker
          key={vehicle.id}
          vehicle={vehicle}
          selected={vehicle.id === selectedId}
          onPress={onSelectVehicle}
        />
      ))}
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
});
