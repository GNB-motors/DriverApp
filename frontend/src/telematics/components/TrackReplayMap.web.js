/* eslint-env browser */
import React, { useEffect, useMemo, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { GoogleMap, MarkerF, PolylineF, useJsApiLoader } from "@react-google-maps/api";
import { AppText, Card, colors } from "../../components/ui";
import { truckSvg } from "./truckIcon";
import {
  EVENT_STYLES,
  REPLAY_ROUTE,
  REPLAY_TRAVELLED,
  SEGMENT_STYLES,
  STOP_STYLES,
  fitCoordinates,
  formatDuration,
  formatIstTime,
  travelledRuns,
} from "./trackModel";

const MAX_EVENT_MARKERS = 150;
const INDIA_CENTER = { lat: 21.2514, lng: 81.6296 };
const toLatLng = (c) => ({ lat: c.latitude, lng: c.longitude });

/** Google polyline options for a solid, dashed or dotted line. */
function lineOptions({ color, width, dash }, zIndex, opacity = 0.95) {
  const maps = window.google?.maps;
  if (!dash || !maps) return { strokeColor: color, strokeWeight: width, strokeOpacity: opacity, zIndex };
  const dotted = dash[0] <= 2;
  return {
    strokeOpacity: 0,
    strokeWeight: width,
    zIndex,
    icons: [
      {
        icon: dotted
          ? { path: maps.SymbolPath.CIRCLE, fillColor: color, fillOpacity: opacity, strokeOpacity: 0, scale: width / 2 }
          : { path: "M 0,-1 0,1", strokeColor: color, strokeOpacity: opacity, strokeWeight: width, scale: 3 },
        offset: "0",
        repeat: `${dash[0] + dash[1] + (dotted ? 2 : 0)}px`,
      },
    ],
  };
}

function circleIcon(color, size, stroke = "#ffffff", strokeWidth = 2) {
  const maps = window.google?.maps;
  if (!maps) return undefined;
  return {
    path: maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: stroke,
    strokeWeight: strokeWidth,
    scale: size / 2,
  };
}

function flagIcon(color, text) {
  const maps = window.google?.maps;
  if (!maps) return undefined;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="22"><rect x="1" y="1" rx="6" width="50" height="18" fill="${color}" stroke="#fff" stroke-width="1.5"/><text x="26" y="14" font-family="Arial" font-size="10" font-weight="700" fill="#fff" text-anchor="middle">${text}</text></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new maps.Size(52, 22),
    anchor: new maps.Point(26, 22),
  };
}

function truckIcon(moving, headingBucket) {
  const maps = window.google?.maps;
  if (!maps) return undefined;
  const svg = truckSvg({ status: moving ? "moving" : "stopped", heading: headingBucket, selected: true });
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new maps.Size(56, 56),
    anchor: new maps.Point(28, 28),
    labelOrigin: new maps.Point(28, 64),
  };
}

/** The map half of Track & Replay (web build). Same layers as the native map. */
export default function TrackReplayMap({
  track,
  mode = "trail",
  playhead = null,
  plate = "",
  follow = false,
  satellite = false,
  topInset = 0,
  bottomInset = 0,
  fitRequest = 0,
  onSelectStop,
  style,
}) {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyBTdzCwl2NZxdXjQP9chBV5F7FxKj3triA";
  // Same loader id and key as FleetMap.web, so the two never conflict.
  const { isLoaded, loadError } = useJsApiLoader({ id: "driver-app-google-maps", googleMapsApiKey: key });
  const map = useRef(null);
  const replay = mode === "replay";
  // GoogleMap re-applies `center`/`zoom` whenever the prop object changes, so
  // they are pinned to the first render; fit() and follow move the camera.
  const initialCamera = useRef(null);
  if (!initialCamera.current) {
    const p = track?.points?.[0];
    initialCamera.current = p ? { center: { lat: p.lat, lng: p.lng }, zoom: 11 } : { center: INDIA_CENTER, zoom: 5 };
  }

  const fit = () => {
    const maps = window.google?.maps;
    if (!map.current || !maps || !track?.points?.length) return;
    const coords = fitCoordinates(track);
    if (coords.length === 1) {
      map.current.panTo(toLatLng(coords[0]));
      map.current.setZoom(15);
      return;
    }
    const bounds = new maps.LatLngBounds();
    coords.forEach((c) => bounds.extend(toLatLng(c)));
    map.current.fitBounds(bounds, { top: topInset + 30, right: 50, bottom: bottomInset + 30, left: 50 });
  };

  useEffect(() => {
    fit();
    // Insets change while the panels lay out; refitting on each would fight the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, track, fitRequest]);

  // Follow-cam: pan when the truck nears the edge of the visible box (web rule).
  useEffect(() => {
    if (!follow || !replay || !playhead || !map.current) return;
    const box = map.current.getBounds?.();
    if (!box) return;
    const ne = box.getNorthEast();
    const sw = box.getSouthWest();
    const latPad = (ne.lat() - sw.lat()) * 0.18;
    const lngPad = (ne.lng() - sw.lng()) * 0.15;
    const { latitude: lat, longitude: lng } = playhead;
    if (lat > ne.lat() - latPad || lat < sw.lat() + latPad || lng > ne.lng() - lngPad || lng < sw.lng() + lngPad)
      map.current.panTo({ lat, lng });
  }, [follow, replay, playhead]);

  const baseLines = useMemo(() => {
    if (!isLoaded) return null;
    return (track?.runs || []).map((run) => {
      const s = replay
        ? run.kind === "GAP"
          ? SEGMENT_STYLES.GAP
          : REPLAY_ROUTE
        : SEGMENT_STYLES[run.kind] || SEGMENT_STYLES.UNKNOWN;
      return (
        <PolylineF
          key={`base-${mode}-${run.key}`}
          path={run.coords.map(toLatLng)}
          options={lineOptions(s, 1, replay && run.kind !== "GAP" ? 0.75 : 0.95)}
        />
      );
    });
  }, [isLoaded, track, replay, mode]);

  const stops = useMemo(() => (track?.stops || []).filter((s) => s.lat != null && s.lng != null), [track]);
  const events = useMemo(
    () =>
      (track?.events || [])
        .filter((e) => e.lat != null && e.lng != null && e.kind !== "GPS_GAP")
        .slice(0, MAX_EVENT_MARKERS),
    [track],
  );

  const moving = (playhead?.speedKmh || 0) > 3;
  const headingBucket = Math.round((playhead?.heading || 0) / 5) * 5;
  const playheadIcon = useMemo(
    () => (isLoaded ? truckIcon(moving, headingBucket) : undefined),
    [isLoaded, moving, headingBucket],
  );

  if (loadError)
    return (
      <Card style={styles.notice}>
        <AppText color={colors.error}>Google Maps could not load. Check the map key and allowed website address.</AppText>
      </Card>
    );
  if (!isLoaded)
    return (
      <View style={[styles.frame, styles.center, style]}>
        <AppText muted>Loading map…</AppText>
      </View>
    );

  const travelled = replay ? travelledRuns(track, playhead) : [];
  const points = track?.points || [];
  const start = points[0];
  const end = points.length > 1 ? points[points.length - 1] : null;

  return (
    <View style={[styles.frame, style]}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={initialCamera.current.center}
        zoom={initialCamera.current.zoom}
        mapTypeId={satellite ? "hybrid" : "roadmap"}
        onLoad={(instance) => {
          map.current = instance;
          fit();
        }}
        onUnmount={() => {
          map.current = null;
        }}
        options={{
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
          clickableIcons: false,
          gestureHandling: "greedy",
          maxZoom: 19,
        }}
      >
        {baseLines}
        {travelled.map((run) => (
          <PolylineF
            key={`done-${run.key}`}
            path={run.coords.map(toLatLng)}
            options={lineOptions(
              run.gap ? { ...SEGMENT_STYLES.GAP, color: REPLAY_TRAVELLED.color } : { ...REPLAY_TRAVELLED, dash: null },
              4,
            )}
          />
        ))}
        {stops.map((stop, index) => {
          const s = STOP_STYLES[stop.reason] || STOP_STYLES.UNEXPLAINED;
          return (
            <MarkerF
              key={`stop-${stop.id}`}
              position={{ lat: stop.lat, lng: stop.lng }}
              icon={circleIcon(s.color, 18)}
              title={`${stop.placeName || s.label} · ${formatDuration(stop.durationMin)} · ${formatIstTime(stop.startMs)}–${formatIstTime(stop.endMs)}`}
              onClick={() => onSelectStop?.(stop, index)}
              zIndex={50}
            />
          );
        })}
        {events.map((event) => {
          const s = EVENT_STYLES[event.kind] || EVENT_STYLES.GPS_GAP;
          return (
            <MarkerF
              key={`event-${event.kind}-${event.atMs}`}
              position={{ lat: event.lat, lng: event.lng }}
              icon={circleIcon(s.color, 11)}
              title={`${s.label} · ${event.text} · ${formatIstTime(event.atMs)}`}
              zIndex={60}
            />
          );
        })}
        {start && (
          <MarkerF position={{ lat: start.lat, lng: start.lng }} icon={flagIcon("#16A34A", "START")} title={`Start · ${formatIstTime(start.tMs)}`} zIndex={200} />
        )}
        {end && (
          <MarkerF position={{ lat: end.lat, lng: end.lng }} icon={flagIcon("#DC2626", "END")} title={`End · ${formatIstTime(end.tMs)}`} zIndex={200} />
        )}
        {replay && playhead && (
          <MarkerF
            position={{ lat: playhead.latitude, lng: playhead.longitude }}
            icon={playheadIcon}
            label={plate ? { text: plate, color: "#172033", fontSize: "11px", fontWeight: "bold" } : undefined}
            zIndex={9999}
          />
        )}
      </GoogleMap>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, overflow: "hidden", backgroundColor: "#E5E9EF" },
  center: { alignItems: "center", justifyContent: "center" },
  notice: { margin: 16 },
});
