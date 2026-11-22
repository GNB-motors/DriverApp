import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { AppText, Button, colors, elevation, radius } from "../../components/ui";
import { useManagerData } from "../context/ManagerDataContext";
import TrackReplayMap from "../components/TrackReplayMap";
import DateField from "../workflows/DateField";
import {
  DEFAULT_SPEED,
  MS_PER_TRACK_MINUTE,
  PLAYBACK_SPEEDS,
  RANGE_PRESETS,
  SEGMENT_STYLES,
  STOP_STYLES,
  EVENT_STYLES,
  buildTrack,
  coveredKm,
  customRangeError,
  formatDuration,
  formatIstDateTime,
  formatIstTime,
  fractionOf,
  istDate,
  nextMomentAfter,
  playheadAt,
  playheadStatus,
  previousMomentBefore,
  resolveRange,
  timeAtFraction,
} from "../components/trackModel";

const TICK_MS = 80;
const DAY_MS = 86400000;
const compact = (value) => String(value || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
const noonIst = (date) => `${date}T12:00:00+05:30`;

function useVehicle(params, vehicles) {
  return useMemo(() => {
    const paramId = params?.id || params?.vehicleId;
    const cleanId = typeof paramId === "string" ? paramId.replace(/^position:/i, "") : paramId;
    const plate = compact(String(params?.plate || params?.registrationNumber || "").replace(/^position:/i, ""));
    return (
      (vehicles || []).find(
        (v) =>
          (paramId && (v.id === paramId || v._id === paramId || v.plate === paramId)) ||
          (cleanId && (v.id === cleanId || v._id === cleanId || v.plate === cleanId)) ||
          (plate &&
            (compact(v.plate) === plate ||
              compact(v.registrationNumber) === plate ||
              compact(v.telemetryRegistration) === plate)),
      ) ||
      params?.vehicle ||
      null
    );
  }, [params, vehicles]);
}

/** The timeline bar: legs as coloured strips, stops as blocks, events as dots; drag to seek. */
function Scrubber({ track, playheadMs, onSeek, onScrubStart }) {
  const [width, setWidth] = useState(0);
  const strips = useMemo(
    () =>
      track.runs.map((run) => {
        const left = fractionOf(track, run.fromMs);
        return {
          key: run.key,
          left,
          width: Math.max(0.002, fractionOf(track, run.toMs) - left),
          color: run.kind === "GAP" ? "#CBD5E1" : (SEGMENT_STYLES[run.kind] || SEGMENT_STYLES.UNKNOWN).color,
        };
      }),
    [track],
  );
  const stopBlocks = useMemo(
    () =>
      track.stops.map((stop) => {
        const left = fractionOf(track, stop.startMs);
        return {
          key: stop.id,
          left,
          width: Math.max(0.006, fractionOf(track, stop.endMs) - left),
          color: (STOP_STYLES[stop.reason] || STOP_STYLES.UNEXPLAINED).color,
        };
      }),
    [track],
  );
  const dots = useMemo(
    () =>
      track.events.map((event) => ({
        key: `${event.kind}-${event.atMs}`,
        left: fractionOf(track, event.atMs),
        color: (EVENT_STYLES[event.kind] || EVENT_STYLES.GPS_GAP).color,
      })),
    [track],
  );
  const fraction = fractionOf(track, playheadMs);
  const seek = (event) => {
    if (!width) return;
    onSeek(timeAtFraction(track, event.nativeEvent.locationX / width));
  };
  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel="Position in the drive"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(fraction * 100) }}
      style={styles.scrubber}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(event) => {
        onScrubStart?.();
        seek(event);
      }}
      onResponderMove={seek}
    >
      {/* Children ignore touches so locationX is always relative to the bar. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={styles.dotsRow}>
          {dots.map((dot) => (
            <View
              key={dot.key}
              style={[styles.eventTick, { left: `${dot.left * 100}%`, backgroundColor: dot.color }]}
            />
          ))}
        </View>
        <View style={styles.barTrack}>
          {strips.map((strip) => (
            <View
              key={strip.key}
              style={[
                styles.strip,
                { left: `${strip.left * 100}%`, width: `${strip.width * 100}%`, backgroundColor: strip.color },
              ]}
            />
          ))}
          <View style={[styles.unplayed, { left: `${fraction * 100}%` }]} />
        </View>
        <View style={styles.stopsRow}>
          {stopBlocks.map((block) => (
            <View
              key={block.key}
              style={[
                styles.stopBlock,
                { left: `${block.left * 100}%`, width: `${block.width * 100}%`, backgroundColor: block.color },
              ]}
            />
          ))}
        </View>
        <View style={[styles.thumb, { left: `${fraction * 100}%` }]} />
      </View>
    </View>
  );
}

function RoundButton({ icon, label, onPress, primary = false, size = 34, active = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      hitSlop={6}
      onPress={onPress}
      style={[
        styles.round,
        { width: size, height: size, borderRadius: size / 2 },
        primary && styles.roundPrimary,
        active && styles.roundActive,
      ]}
    >
      <Ionicons
        name={icon}
        size={primary ? 24 : 17}
        color={primary || active ? colors.white : colors.text}
      />
    </Pressable>
  );
}

function Stat({ icon, color, label, value }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={15} color={color} />
      <View style={styles.flex}>
        <AppText variant="caption" muted numberOfLines={1}>
          {label}
        </AppText>
        <AppText variant="caption" weight="bold" numberOfLines={1}>
          {value}
        </AppText>
      </View>
    </View>
  );
}

export default function RouteReplayScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { data, service, branchId } = useManagerData();
  const vehicle = useVehicle(route.params, data?.vehicles);
  const plate = vehicle?.plate || route.params?.plate || "";
  // telemetryRegistration is the exact string the position history is stored under.
  const reg = String(
    vehicle?.telemetryRegistration || vehicle?.plate || vehicle?.registrationNumber || route.params?.plate || "",
  )
    .replace(/^position:/i, "")
    .trim();

  const [mode, setMode] = useState(route.params?.mode === "history" ? "trail" : route.params?.autoPlay === false ? "trail" : "replay");
  const [preset, setPreset] = useState("last24");
  const [custom, setCustom] = useState(null);
  const [reload, setReload] = useState(0);
  const [load, setLoad] = useState({ status: "loading", track: null, error: null, label: "" });

  const [playheadMs, setPlayheadMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [follow, setFollow] = useState(true);
  const [satellite, setSatellite] = useState(false);
  const [fitRequest, setFitRequest] = useState(0);
  const [headerH, setHeaderH] = useState(0);
  const [footerH, setFooterH] = useState(0);
  const [stopsOpen, setStopsOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [draft, setDraft] = useState({ from: "", to: "" });

  const autoPlayPending = useRef(route.params?.autoPlay !== false && mode === "replay");
  const playheadRef = useRef(playheadMs);
  playheadRef.current = playheadMs;
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const track = load.track;
  const hasRoute = Boolean(track && track.points.length > 1);

  // Load the drive for the chosen range.
  useEffect(() => {
    if (!reg) {
      setLoad({ status: "error", track: null, error: "Vehicle registration number could not be determined.", label: "" });
      return undefined;
    }
    let active = true;
    const range = resolveRange(preset, custom);
    setIsPlaying(false);
    setStopsOpen(false);
    setLoad((prev) => ({ status: "loading", track: prev.track, error: null, label: range.label }));
    service
      .getVehicleTrack(reg, { branchId: branchId === "all" ? undefined : branchId, from: range.from, to: range.to })
      .then((raw) => {
        if (!active) return;
        if (raw?.held) {
          const why = raw.why;
          setLoad({
            status: "held",
            track: null,
            error: typeof why === "string" ? why : why?.text || why?.message || why?.reason || null,
            label: range.label,
          });
          return;
        }
        const next = buildTrack(raw);
        setLoad({ status: "ready", track: next, error: null, label: range.label, isFallback: raw?.source === "livetracking" || Boolean(raw?.isFallback), truncated: raw?.truncated });
        setPlayheadMs(next.startMs || 0);
        if (autoPlayPending.current && next.points.length > 1) {
          autoPlayPending.current = false;
          setIsPlaying(true);
        }
      })
      .catch((error) => {
        if (!active) return;
        setLoad({ status: "error", track: null, error: error?.message || "Could not load this route.", label: range.label });
      });
    return () => {
      active = false;
    };
  }, [reg, preset, custom, reload, branchId, service]);

  // Playback clock: 1x plays one real minute per second (web rule).
  useEffect(() => {
    if (!isPlaying || !hasRoute) return undefined;
    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      // The ref is advanced here, not only on render, so ticks that land
      // before React re-renders (a slow phone) still add up.
      const next = Math.min(
        track.endMs,
        playheadRef.current + (now - last) * speedRef.current * MS_PER_TRACK_MINUTE,
      );
      last = now;
      playheadRef.current = next;
      setPlayheadMs(next);
      if (next >= track.endMs) setIsPlaying(false);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [isPlaying, hasRoute, track]);

  const playhead = useMemo(
    () => (hasRoute ? playheadAt(track, playheadMs) : null),
    [hasRoute, track, playheadMs],
  );
  const status = playheadStatus(playhead);

  const seek = useCallback((ms) => {
    setIsPlaying(false);
    playheadRef.current = ms;
    setPlayheadMs(ms);
  }, []);

  const togglePlay = () => {
    if (!hasRoute) return;
    if (mode !== "replay") setMode("replay");
    // Play on a finished drive starts it over (web rule).
    if (!isPlaying && playheadRef.current >= track.endMs - 1000) {
      playheadRef.current = track.startMs;
      setPlayheadMs(track.startMs);
    }
    setIsPlaying((value) => !value);
  };

  const jumpTo = (ms) => {
    if (ms == null) return;
    setMode("replay");
    seek(ms);
  };

  const openStop = (stop) => {
    setStopsOpen(false);
    setFollow(true);
    jumpTo(stop.startMs);
  };

  const openCustom = () => {
    const now = Date.now();
    setDraft({
      from: noonIst(custom?.fromDate || istDate(now - DAY_MS)),
      to: noonIst(custom?.toDate || istDate(now)),
    });
    setRangeOpen(false);
    setCustomOpen(true);
  };

  const draftDates = {
    fromDate: draft.from ? istDate(Date.parse(draft.from)) : "",
    toDate: draft.to ? istDate(Date.parse(draft.to)) : "",
  };
  const draftError = customOpen ? customRangeError(draftDates.fromDate, draftDates.toDate) : null;

  const summary = track?.summary;
  const presetShort = RANGE_PRESETS.find((p) => p.key === preset)?.short || "Range";
  const covered = coveredKm(track, playhead);
  const showLegend = mode === "trail" && track && track.kinds.some((k) => k !== "UNKNOWN");

  return (
    <View style={styles.screen}>
      <StatusBar style={satellite ? "light" : "dark"} />

      {/* 1. Map, full screen */}
      <View style={StyleSheet.absoluteFill}>
        <TrackReplayMap
          track={track}
          mode={mode}
          playhead={mode === "replay" ? playhead : null}
          plate={plate}
          follow={follow}
          satellite={satellite}
          topInset={headerH}
          bottomInset={footerH}
          fitRequest={fitRequest}
          onSelectStop={openStop}
        />
      </View>

      {/* 2. Header */}
      <View
        pointerEvents="box-none"
        onLayout={(event) => setHeaderH(event.nativeEvent.layout.height)}
        style={[styles.header, { paddingTop: insets.top + 6, paddingLeft: insets.left + 12, paddingRight: insets.right + 12 }]}
      >
        <View style={styles.topBar}>
          <RoundButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />
          <View style={styles.plate}>
            <AppText variant="small" mono weight="bold" color={colors.white} numberOfLines={1}>
              {plate || reg || "TRUCK"}
            </AppText>
          </View>
          <View style={styles.flex}>
            <AppText variant="caption" weight="bold" numberOfLines={1}>
              {hasRoute ? `${summary.km} km · ${load.label}` : load.label || "Track & replay"}
            </AppText>
            <AppText variant="caption" muted numberOfLines={1}>
              {vehicle?.model && vehicle.model !== "Model unavailable" ? vehicle.model : "Fleet vehicle"}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change date range"
            style={styles.rangeButton}
            onPress={() => setRangeOpen(true)}
          >
            <Ionicons name="calendar-outline" size={15} color={colors.primary} />
            <AppText variant="caption" weight="bold" color={colors.primaryDeep}>
              {presetShort}
            </AppText>
            <Ionicons name="chevron-down" size={12} color={colors.primaryDeep} />
          </Pressable>
        </View>

        <View style={styles.modeRow} pointerEvents="box-none">
          <View style={styles.modeTabs}>
            {[
              { key: "trail", label: "Route Trail", icon: "map" },
              { key: "replay", label: "Track Replay", icon: "play-circle" },
            ].map((tab) => {
              const active = mode === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={[styles.modeTab, active && styles.modeTabActive]}
                  onPress={() => {
                    setMode(tab.key);
                    if (tab.key === "trail") setIsPlaying(false);
                  }}
                >
                  <Ionicons name={tab.icon} size={14} color={active ? colors.white : "#CBD5E1"} />
                  <AppText variant="caption" weight="bold" color={colors.white}>
                    {tab.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* 3. Map controls */}
      <View pointerEvents="box-none" style={[styles.controls, { top: headerH + 8, right: insets.right + 12 }]}>
        <RoundButton icon="scan-outline" label="Fit whole route" size={42} onPress={() => setFitRequest((n) => n + 1)} />
        <RoundButton
          icon="layers-outline"
          label={satellite ? "Show map view" : "Show satellite view"}
          size={42}
          active={satellite}
          onPress={() => setSatellite((v) => !v)}
        />
        {mode === "replay" && (
          <RoundButton
            icon="locate-outline"
            label={follow ? "Stop following the truck" : "Follow the truck"}
            size={42}
            active={follow}
            onPress={() => setFollow((v) => !v)}
          />
        )}
        <RoundButton icon="reload" label="Reload route" size={42} onPress={() => setReload((n) => n + 1)} />
      </View>

      {load.status === "loading" && (
        <View pointerEvents="none" style={[styles.loadingWrap, { top: headerH + 8 }]}>
          <View style={styles.loadingPill}>
            <ActivityIndicator size="small" color={colors.primary} />
            <AppText variant="caption" weight="bold" color={colors.primaryDeep}>
              Loading route · {load.label}
            </AppText>
          </View>
        </View>
      )}

      {/* 4. Bottom panel */}
      <View
        pointerEvents="box-none"
        onLayout={(event) => setFooterH(event.nativeEvent.layout.height)}
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 10), paddingLeft: insets.left + 10, paddingRight: insets.right + 10 }]}
      >
        {load.status === "error" && (
          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="alert-circle" size={24} color={colors.error} />
              <View style={styles.flex}>
                <AppText weight="bold" color={colors.error}>
                  Could not load route
                </AppText>
                <AppText variant="caption" muted>
                  {load.error}
                </AppText>
              </View>
            </View>
            <Button label="Try again" icon="reload" onPress={() => setReload((n) => n + 1)} />
          </View>
        )}

        {load.status === "held" && (
          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="time-outline" size={24} color={colors.warning} />
              <View style={styles.flex}>
                <AppText weight="bold">Route not available yet</AppText>
                <AppText variant="caption" muted>
                  {load.error || "This truck's track is still being prepared. Try again in a few minutes."}
                </AppText>
              </View>
            </View>
            <Button label="Try again" icon="reload" variant="secondary" onPress={() => setReload((n) => n + 1)} />
          </View>
        )}

        {load.status === "ready" && !hasRoute && (
          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
              <View style={styles.flex}>
                <AppText weight="bold">No GPS movement recorded</AppText>
                <AppText variant="caption" muted>
                  No route fixes for {plate || reg} in {load.label}.
                </AppText>
              </View>
            </View>
            <View style={styles.row}>
              {preset !== "last7" && (
                <Button label="Last 7 days" style={styles.flex} onPress={() => setPreset("last7")} />
              )}
              <Button label="Choose dates" variant="secondary" style={styles.flex} onPress={openCustom} />
            </View>
          </View>
        )}

        {hasRoute && stopsOpen && (
          <View style={[styles.card, styles.stopsCard]}>
            <View style={styles.between}>
              <AppText weight="bold">Stops ({track.stops.length})</AppText>
              <Pressable accessibilityRole="button" accessibilityLabel="Close stops" hitSlop={10} onPress={() => setStopsOpen(false)}>
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView style={styles.stopsList} nestedScrollEnabled>
              {track.stops.length === 0 ? (
                <AppText variant="caption" muted>
                  No stops in this range.
                </AppText>
              ) : (
                track.stops.map((stop, index) => {
                  const s = STOP_STYLES[stop.reason] || STOP_STYLES.UNEXPLAINED;
                  return (
                    <Pressable
                      key={stop.id}
                      accessibilityRole="button"
                      style={styles.stopRow}
                      onPress={() => openStop(stop)}
                    >
                      <View style={[styles.stopIcon, { backgroundColor: s.color }]}>
                        <Ionicons name={s.icon} size={12} color={colors.white} />
                      </View>
                      <View style={styles.flex}>
                        <AppText variant="caption" weight="bold" numberOfLines={1}>
                          {index + 1}. {stop.placeName || s.label} · {formatDuration(stop.durationMin)}
                        </AppText>
                        <AppText variant="caption" muted numberOfLines={1}>
                          {formatIstTime(stop.startMs)} → {formatIstTime(stop.endMs)}
                          {stop.reasonWhy ? ` · ${stop.reasonWhy}` : ` · ${s.label}`}
                        </AppText>
                      </View>
                      <Ionicons name="play" size={14} color={colors.primary} />
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        )}

        {hasRoute && mode === "trail" && (
          <View style={styles.card}>
            <View style={styles.between}>
              <View style={styles.flex}>
                <AppText variant="caption" muted weight="bold">
                  ROUTE TRAIL · {load.label.toUpperCase()}
                </AppText>
                <AppText variant="h3" weight="extrabold">
                  {summary.km} km travelled
                </AppText>
                <AppText variant="caption" muted>
                  {formatIstDateTime(track.startMs)} → {formatIstDateTime(track.endMs)}
                </AppText>
              </View>
              <Button label="Play" icon="play-circle-outline" onPress={togglePlay} />
            </View>
            <View style={styles.statsRow}>
              <Stat icon="time-outline" color={colors.success} label="Driving" value={formatDuration(summary.driveMin)} />
              <Stat icon="stop-circle-outline" color="#DC2626" label="Stopped" value={formatDuration(summary.stopMin)} />
              <Stat
                icon="speedometer-outline"
                color="#F59E0B"
                label="Top / Avg"
                value={`${summary.maxKmh ?? "–"} / ${summary.avgKmh ?? "–"}`}
              />
            </View>
            <Pressable accessibilityRole="button" style={styles.stopsButton} onPress={() => setStopsOpen((v) => !v)}>
              <Ionicons name="pause-circle-outline" size={16} color={colors.primary} />
              <AppText variant="caption" weight="bold" color={colors.primary} style={styles.flex}>
                {track.stops.length} stops · {track.events.filter((e) => e.kind === "OVERSPEED").length} overspeed
              </AppText>
              <Ionicons name={stopsOpen ? "chevron-down" : "chevron-up"} size={14} color={colors.primary} />
            </Pressable>
            {showLegend && (
              <View style={styles.legend}>
                {track.kinds.map((kind) => (
                  <View key={kind} style={styles.legendItem}>
                    <View style={[styles.legendSwatch, { backgroundColor: SEGMENT_STYLES[kind].color }]} />
                    <AppText variant="caption" muted>
                      {SEGMENT_STYLES[kind].label}
                    </AppText>
                  </View>
                ))}
              </View>
            )}
            {(load.isFallback || load.truncated || track.downsampled) && (
              <AppText variant="caption" muted>
                {load.truncated
                  ? "Trail is partial: the position limit was reached."
                  : track.downsampled
                    ? `Route simplified to ${track.points.length.toLocaleString("en-IN")} of ${track.rawCount.toLocaleString("en-IN")} fixes.`
                    : "Showing the live breadcrumb trail."}
              </AppText>
            )}
          </View>
        )}

        {hasRoute && mode === "replay" && (
          <View style={styles.card}>
            <View style={styles.between}>
              <View style={styles.flex}>
                <AppText variant="caption" muted weight="bold">
                  PLAYHEAD (IST)
                </AppText>
                <AppText weight="extrabold" style={styles.time}>
                  {formatIstDateTime(playhead?.atMs)}
                </AppText>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                <Ionicons name={status.icon} size={13} color={status.color} />
                <AppText variant="caption" weight="extrabold" color={status.color}>
                  {status.label}
                </AppText>
              </View>
            </View>

            <Scrubber track={track} playheadMs={playheadMs} onSeek={seek} onScrubStart={() => setIsPlaying(false)} />

            <View style={styles.between}>
              <AppText variant="caption" muted mono>
                {formatIstTime(track.startMs)}
              </AppText>
              <AppText variant="caption" weight="bold" color={colors.primary} mono>
                {covered.toFixed(1)} / {summary.km} km
              </AppText>
              <AppText variant="caption" muted mono>
                {formatIstTime(track.endMs)}
              </AppText>
            </View>

            <View style={styles.transport}>
              <RoundButton icon="play-skip-back" label="Back to start" onPress={() => seek(track.startMs)} />
              <RoundButton
                icon="play-back"
                label="Previous stop or event"
                onPress={() => jumpTo(previousMomentBefore(track, playheadMs) ?? track.startMs)}
              />
              <RoundButton icon={isPlaying ? "pause" : "play"} label={isPlaying ? "Pause" : "Play"} primary size={48} onPress={togglePlay} />
              <RoundButton
                icon="play-forward"
                label="Next stop or event"
                onPress={() => jumpTo(nextMomentAfter(track, playheadMs) ?? track.endMs)}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Show stops"
                style={styles.stopsChip}
                onPress={() => setStopsOpen((v) => !v)}
              >
                <Ionicons name="pause" size={12} color="#DC2626" />
                <AppText variant="caption" weight="bold">
                  {track.stops.length}
                </AppText>
              </Pressable>
            </View>

            <View style={styles.speeds}>
              <AppText variant="caption" muted>
                Speed
              </AppText>
              {PLAYBACK_SPEEDS.map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={`${value} times speed`}
                  accessibilityState={{ selected: speed === value }}
                  style={[styles.speedPill, speed === value && styles.speedPillActive]}
                  onPress={() => setSpeed(value)}
                >
                  <AppText variant="caption" weight="bold" color={speed === value ? colors.white : colors.text}>
                    {value}×
                  </AppText>
                </Pressable>
              ))}
              <AppText variant="caption" muted style={styles.flex} numberOfLines={1}>
                {speed} min / sec
              </AppText>
            </View>
          </View>
        )}
      </View>

      {/* 5. Range presets */}
      <Modal visible={rangeOpen} transparent animationType="fade" onRequestClose={() => setRangeOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setRangeOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]} onPress={(e) => e.stopPropagation?.()}>
            <View style={styles.between}>
              <AppText variant="small" weight="bold">
                Route date range
              </AppText>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setRangeOpen(false)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>
            {RANGE_PRESETS.map((item) => {
              const active = preset === item.key;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => {
                    if (item.key === "custom") openCustom();
                    else {
                      setPreset(item.key);
                      setRangeOpen(false);
                    }
                  }}
                >
                  <AppText weight="bold" style={styles.flex}>
                    {item.key === "custom" && preset === "custom" ? load.label : item.label}
                  </AppText>
                  {active && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* 6. Custom dates */}
      <Modal visible={customOpen} transparent animationType="slide" onRequestClose={() => setCustomOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setCustomOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]} onPress={(e) => e.stopPropagation?.()}>
            <View style={styles.between}>
              <AppText variant="h3" weight="bold">
                Choose dates
              </AppText>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setCustomOpen(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>
            <DateField
              label="From"
              includeTime={false}
              value={draft.from}
              onChange={(iso) => setDraft((d) => ({ ...d, from: noonIst(istDate(Date.parse(iso))) }))}
            />
            <DateField
              label="To"
              includeTime={false}
              value={draft.to}
              onChange={(iso) => setDraft((d) => ({ ...d, to: noonIst(istDate(Date.parse(iso))) }))}
            />
            <AppText variant="caption" color={draftError ? colors.error : colors.textMuted}>
              {draftError || `${draftDates.fromDate} to ${draftDates.toDate} · whole days in IST, up to 8 days`}
            </AppText>
            <View style={styles.row}>
              <Button label="Cancel" variant="secondary" style={styles.flex} onPress={() => setCustomOpen(false)} />
              <Button
                label="Show route"
                style={styles.flex}
                disabled={Boolean(draftError)}
                onPress={() => {
                  setCustom({ fromDate: draftDates.fromDate, toDate: draftDates.toDate });
                  setPreset("custom");
                  setCustomOpen(false);
                }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const card = {
  backgroundColor: "rgba(255,255,255,0.98)",
  borderRadius: radius.lg,
  padding: 12,
  gap: 10,
  borderWidth: 1,
  borderColor: "#E2E8F0",
  ...elevation.lg,
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#E5E9EF" },
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  header: { position: "absolute", top: 0, left: 0, right: 0, gap: 8, zIndex: 10 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.97)",
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: radius.lg,
    ...elevation.md,
  },
  plate: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    maxWidth: 130,
  },
  rangeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  modeRow: { alignItems: "center" },
  modeTabs: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: "rgba(15,23,42,0.85)",
    padding: 3,
    borderRadius: radius.full,
    ...elevation.sm,
  },
  modeTab: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
  modeTabActive: { backgroundColor: colors.primary },
  controls: { position: "absolute", gap: 8, zIndex: 10 },
  round: { backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center", ...elevation.sm },
  roundPrimary: { backgroundColor: colors.primary, ...elevation.md },
  roundActive: { backgroundColor: colors.primary },
  loadingWrap: { position: "absolute", left: 0, right: 0, alignItems: "center", zIndex: 9 },
  loadingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.97)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    ...elevation.md,
  },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, gap: 8, zIndex: 10 },
  card,
  stopsCard: { gap: 6 },
  stopsList: { maxHeight: 190 },
  stopRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  stopIcon: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  time: { fontSize: 14, marginTop: 1 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.md },
  scrubber: { height: 34, justifyContent: "center" },
  dotsRow: { position: "absolute", top: 0, left: 0, right: 0, height: 8 },
  eventTick: { position: "absolute", top: 1, width: 6, height: 6, marginLeft: -3, borderRadius: 3 },
  barTrack: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
  },
  strip: { position: "absolute", top: 0, bottom: 0 },
  unplayed: { position: "absolute", top: 0, bottom: 0, right: 0, backgroundColor: "rgba(255,255,255,0.6)" },
  stopsRow: { position: "absolute", top: 23, left: 0, right: 0, height: 5 },
  stopBlock: { position: "absolute", top: 0, height: 5, borderRadius: 2, minWidth: 3 },
  thumb: {
    position: "absolute",
    top: 6,
    width: 18,
    height: 18,
    marginLeft: -9,
    borderRadius: 9,
    backgroundColor: colors.white,
    borderWidth: 4,
    borderColor: colors.primaryDeep,
    ...elevation.sm,
  },
  transport: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14 },
  stopsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  speeds: { flexDirection: "row", alignItems: "center", gap: 6 },
  speedPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, backgroundColor: "#F1F5F9" },
  speedPillActive: { backgroundColor: colors.primary },
  statsRow: { flexDirection: "row", gap: 6 },
  stat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F8FAFC",
    padding: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  stopsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendSwatch: { width: 14, height: 4, borderRadius: 2 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    gap: 12,
  },
  option: { flexDirection: "row", alignItems: "center", paddingVertical: 11, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: "#F8FAFC" },
  optionActive: { backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: colors.primary },
});
