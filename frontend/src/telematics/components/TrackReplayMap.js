import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { SvgXml } from "react-native-svg";
import { AppText } from "../../components/ui";
import { truckSvg } from "./truckIcon";
import { INDIA_REGION } from "./liveMap";
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

/**
 * A marker whose custom view is snapshotted once (plus whenever `refreshKey`
 * changes). Keeping tracksViewChanges on for every marker re-renders them all
 * on every frame on Android, which makes replay stutter.
 */
function StaticMarker({ refreshKey, children, ...props }) {
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    setTracking(true);
    const timer = setTimeout(() => setTracking(false), 600);
    return () => clearTimeout(timer);
  }, [refreshKey]);
  return (
    <Marker tracksViewChanges={tracking} {...props}>
      {children}
    </Marker>
  );
}

/**
 * The map half of Track & Replay (native). Draws what the web Track mode
 * draws: in "trail" mode the route coloured by leg (loaded / empty /
 * reposition) with no-signal gaps dashed; in "replay" mode the route in grey
 * with the travelled part in blue up to a truck that turns with its heading.
 */
export default function TrackReplayMap({
  track,
  mode = "trail",
  playhead = null,
  follow = false,
  satellite = false,
  topInset = 0,
  bottomInset = 0,
  fitRequest = 0,
  onSelectStop,
  style,
}) {
  const map = useRef(null);
  const region = useRef(null);
  const lastPan = useRef(0);
  const [ready, setReady] = useState(false);
  const replay = mode === "replay";

  const first = track?.points?.[0];
  const initialRegion = useMemo(
    () =>
      first
        ? { latitude: first.lat, longitude: first.lng, latitudeDelta: 0.2, longitudeDelta: 0.2 }
        : INDIA_REGION,
    // Only the first frame needs it; later fits move the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Fit the whole drive once per track (and whenever the screen asks).
  useEffect(() => {
    if (!ready || !track?.points?.length) return;
    const coords = fitCoordinates(track);
    if (coords.length === 1) {
      map.current?.animateToRegion(
        { ...coords[0], latitudeDelta: 0.02, longitudeDelta: 0.02 },
        400,
      );
      return;
    }
    map.current?.fitToCoordinates(coords, {
      edgePadding: { top: topInset + 30, right: 40, bottom: bottomInset + 30, left: 40 },
      animated: true,
    });
    // Insets change while the panels lay out; refitting on each would fight the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, track, fitRequest]);

  // Follow-cam: pan only when the truck nears the edge of what is visible (web rule).
  useEffect(() => {
    if (!follow || !replay || !playhead || !ready) return;
    const r = region.current;
    const now = Date.now();
    if (now - lastPan.current < 700) return;
    const near =
      !r ||
      Math.abs(playhead.latitude - r.latitude) > r.latitudeDelta * 0.3 ||
      Math.abs(playhead.longitude - r.longitude) > r.longitudeDelta * 0.35;
    if (!near) return;
    lastPan.current = now;
    map.current?.animateCamera(
      { center: { latitude: playhead.latitude, longitude: playhead.longitude } },
      { duration: 450 },
    );
  }, [follow, replay, playhead, ready]);

  // The base route — memoised so playback frames do not rebuild it.
  const baseLines = useMemo(
    () =>
      (track?.runs || []).map((run) => {
        const s = replay
          ? run.kind === "GAP"
            ? SEGMENT_STYLES.GAP
            : REPLAY_ROUTE
          : SEGMENT_STYLES[run.kind] || SEGMENT_STYLES.UNKNOWN;
        return (
          <Polyline
            key={`base-${mode}-${run.key}`}
            coordinates={run.coords}
            strokeColor={s.color}
            strokeWidth={s.width}
            lineDashPattern={s.dash || undefined}
            lineCap="round"
            lineJoin="round"
            zIndex={1}
          />
        );
      }),
    [track, replay, mode],
  );

  const travelled = replay ? travelledRuns(track, playhead) : [];

  const stops = useMemo(
    () => (track?.stops || []).filter((s) => s.lat != null && s.lng != null),
    [track],
  );
  const events = useMemo(
    () =>
      (track?.events || [])
        .filter((e) => e.lat != null && e.lng != null && e.kind !== "GPS_GAP")
        .slice(0, MAX_EVENT_MARKERS),
    [track],
  );

  const points = track?.points || [];
  const start = points[0];
  const end = points.length > 1 ? points[points.length - 1] : null;
  const playheadMoving = (playhead?.speedKmh || 0) > 3;

  return (
    <View style={[styles.frame, style]}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        mapType={satellite ? "hybrid" : "standard"}
        onMapReady={() => setReady(true)}
        onRegionChangeComplete={(next) => {
          region.current = next;
        }}
        toolbarEnabled={false}
        showsCompass
        rotateEnabled
      >
        {baseLines}

        {travelled.map((run) => (
          <Polyline
            key={`done-${run.key}`}
            coordinates={run.coords}
            strokeColor={REPLAY_TRAVELLED.color}
            strokeWidth={run.gap ? 2 : REPLAY_TRAVELLED.width}
            lineDashPattern={run.gap ? SEGMENT_STYLES.GAP.dash : undefined}
            lineCap="round"
            lineJoin="round"
            zIndex={4}
          />
        ))}

        {stops.map((stop, index) => {
          const s = STOP_STYLES[stop.reason] || STOP_STYLES.UNEXPLAINED;
          return (
            <StaticMarker
              key={`stop-${stop.id}`}
              refreshKey={stop.id}
              coordinate={{ latitude: stop.lat, longitude: stop.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
              title={`${stop.placeName || s.label} · ${formatDuration(stop.durationMin)}`}
              description={`${formatIstTime(stop.startMs)} – ${formatIstTime(stop.endMs)}${stop.reasonWhy ? ` · ${stop.reasonWhy}` : ""}`}
              onPress={() => onSelectStop?.(stop, index)}
              zIndex={50}
            >
              <View style={[styles.stopPin, { backgroundColor: s.color }]}>
                <Ionicons name={s.icon} size={11} color="#FFFFFF" />
              </View>
            </StaticMarker>
          );
        })}

        {events.map((event) => {
          const s = EVENT_STYLES[event.kind] || EVENT_STYLES.GPS_GAP;
          return (
            <StaticMarker
              key={`event-${event.kind}-${event.atMs}`}
              refreshKey={event.kind}
              coordinate={{ latitude: event.lat, longitude: event.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
              title={s.label}
              description={`${event.text} · ${formatIstTime(event.atMs)}`}
              zIndex={60}
            >
              <View
                style={[
                  styles.eventDot,
                  { backgroundColor: s.color },
                  event.kind === "DETOUR" && styles.diamond,
                ]}
              />
            </StaticMarker>
          );
        })}

        {start && (
          <StaticMarker
            refreshKey={`start-${start.tMs}`}
            coordinate={{ latitude: start.lat, longitude: start.lng }}
            anchor={{ x: 0.5, y: 1 }}
            title="Start"
            description={formatIstTime(start.tMs)}
            zIndex={200}
          >
            <View style={[styles.flag, { backgroundColor: "#16A34A" }]}>
              <Ionicons name="flag" size={11} color="#FFFFFF" />
              <AppText variant="caption" weight="bold" color="#FFFFFF" style={styles.flagText}>
                START
              </AppText>
            </View>
          </StaticMarker>
        )}
        {end && (
          <StaticMarker
            refreshKey={`end-${end.tMs}`}
            coordinate={{ latitude: end.lat, longitude: end.lng }}
            anchor={{ x: 0.5, y: 1 }}
            title="End"
            description={formatIstTime(end.tMs)}
            zIndex={200}
          >
            <View style={[styles.flag, { backgroundColor: "#DC2626" }]}>
              <Ionicons name="location" size={11} color="#FFFFFF" />
              <AppText variant="caption" weight="bold" color="#FFFFFF" style={styles.flagText}>
                END
              </AppText>
            </View>
          </StaticMarker>
        )}

        {replay && playhead && (
          // The truck art points north; the native `rotation` turns it, so its
          // bitmap is drawn once instead of on every frame.
          <StaticMarker
            refreshKey={playheadMoving ? "moving" : "stopped"}
            coordinate={{ latitude: playhead.latitude, longitude: playhead.longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={playhead.heading || 0}
            flat
            zIndex={9999}
          >
            <SvgXml
              xml={truckSvg({ status: playheadMoving ? "moving" : "stopped", heading: 0, selected: true })}
              width={52}
              height={52}
            />
          </StaticMarker>
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, overflow: "hidden" },
  stopPin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  eventDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  diamond: { borderRadius: 2, transform: [{ rotate: "45deg" }] },
  flag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  flagText: { fontSize: 9, lineHeight: 12 },
});
