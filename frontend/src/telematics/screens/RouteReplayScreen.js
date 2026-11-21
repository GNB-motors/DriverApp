import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  AppText,
  Button,
  Card,
  colors,
  elevation,
  radius,
  spacing,
} from "../../components/ui";
import { useManagerData } from "../context/ManagerDataContext";
import FleetMap from "../components/FleetMap";
import { validCoordinate } from "../components/mapGeometry";

const IST_OFFSET_MS = 5.5 * 3600 * 1000;

function toIstDateString(date) {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return ist.toISOString().slice(0, 10);
}

function formatIstTime(dateOrIso) {
  if (!dateOrIso) return "--:--";
  const d = new Date(dateOrIso);
  if (isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function formatIstDateTime(dateOrIso) {
  if (!dateOrIso) return "N/A";
  const d = new Date(dateOrIso);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function haversineDistanceKm(c1, c2) {
  const R = 6371;
  const dLat = ((c2.latitude - c1.latitude) * Math.PI) / 180;
  const dLon = ((c2.longitude - c1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.latitude * Math.PI) / 180) *
      Math.cos((c2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function RouteReplayScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { data, service, branchId } = useManagerData();

  // Resolve target vehicle & registration
  const paramId = route.params?.id || route.params?.vehicleId;
  const paramPlate = (
    route.params?.plate ||
    route.params?.registrationNumber ||
    ""
  ).replace(/^position:/i, "");
  const cleanId =
    typeof paramId === "string" ? paramId.replace(/^position:/i, "") : paramId;

  const vehicle =
    (data?.vehicles || []).find(
      (v) =>
        (paramId && (v.id === paramId || v._id === paramId || v.plate === paramId)) ||
        (cleanId && (v.id === cleanId || v._id === cleanId || v.plate === cleanId)) ||
        (paramPlate &&
          (v.plate === paramPlate ||
            v.registrationNumber === paramPlate ||
            v.telemetryRegistration === paramPlate)),
    ) ||
    route.params?.vehicle ||
    null;

  const reg =
    vehicle?.telemetryRegistration ||
    vehicle?.plate ||
    vehicle?.registrationNumber ||
    paramPlate ||
    (cleanId ? String(cleanId) : "");

  // View Mode: 'replay' or 'history'
  const [mode, setMode] = useState(
    route.params?.mode || (route.params?.autoPlay ? "replay" : "history"),
  );

  // Time preset & range
  const [preset, setPreset] = useState("last24");
  const [customRange, setCustomRange] = useState({
    from: new Date(Date.now() - 24 * 3600000).toISOString(),
    to: new Date().toISOString(),
  });
  const [isRangePickerOpen, setIsRangePickerOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customFromInput, setCustomFromInput] = useState("");
  const [customToInput, setCustomToInput] = useState("");
  const [isStopsOpen, setIsStopsOpen] = useState(false);

  const activeRange = useMemo(() => {
    const now = new Date();
    if (preset === "last24") {
      return {
        from: new Date(now.getTime() - 24 * 3600000).toISOString(),
        to: now.toISOString(),
        label: "Last 24 Hours",
      };
    }
    if (preset === "today") {
      const nowIst = new Date(now.getTime() + IST_OFFSET_MS);
      const startOfDay = new Date(
        Date.UTC(
          nowIst.getUTCFullYear(),
          nowIst.getUTCMonth(),
          nowIst.getUTCDate(),
        ) - IST_OFFSET_MS,
      );
      return {
        from: startOfDay.toISOString(),
        to: now.toISOString(),
        label: "Today",
      };
    }
    if (preset === "yesterday") {
      const nowIst = new Date(now.getTime() + IST_OFFSET_MS);
      const startOfYesterday = new Date(
        Date.UTC(
          nowIst.getUTCFullYear(),
          nowIst.getUTCMonth(),
          nowIst.getUTCDate() - 1,
        ) - IST_OFFSET_MS,
      );
      const endOfYesterday = new Date(
        Date.UTC(
          nowIst.getUTCFullYear(),
          nowIst.getUTCMonth(),
          nowIst.getUTCDate(),
        ) -
          IST_OFFSET_MS -
          1,
      );
      return {
        from: startOfYesterday.toISOString(),
        to: endOfYesterday.toISOString(),
        label: "Yesterday",
      };
    }
    if (preset === "last48") {
      return {
        from: new Date(now.getTime() - 48 * 3600000).toISOString(),
        to: now.toISOString(),
        label: "Last 48 Hours",
      };
    }
    return {
      from: customRange.from,
      to: customRange.to,
      label: "Custom Range",
    };
  }, [preset, customRange]);

  // Trail state
  const [trailState, setTrailState] = useState({
    loading: true,
    error: null,
    fixes: [],
    distanceKm: 0,
    maxSpeed: 0,
    avgSpeed: 0,
    movingMinutes: 0,
    stoppedMinutes: 0,
    stoppages: [],
  });
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(Boolean(route.params?.autoPlay));
  const [progress, setProgress] = useState(0); // 0.0 to 1.0
  const [speedMultiplier, setSpeedMultiplier] = useState(5); // 1x, 2x, 5x, 10x, 20x
  const scrubberTrackRef = useRef(null);

  // Load trail from API
  useEffect(() => {
    let active = true;
    if (!reg) {
      setTrailState((prev) => ({
        ...prev,
        loading: false,
        error: "Vehicle registration number could not be determined.",
      }));
      return;
    }

    setTrailState((prev) => ({ ...prev, loading: true, error: null }));
    setProgress(0);
    setIsPlaying(Boolean(route.params?.autoPlay));

    service
      .getTrail(reg, {
        branchId: branchId === "all" ? undefined : branchId,
        from: activeRange.from,
        to: activeRange.to,
        limit: 10000,
      })
      .then((res) => {
        if (!active) return;
        const rawPoints = Array.isArray(res?.points) ? res.points : [];
        const fixes = rawPoints
          .filter((p) => p && validCoordinate(p) && p.eventDateTime)
          .map((p) => ({
            ...p,
            latitude: Number(p.latitude),
            longitude: Number(p.longitude),
            at: Date.parse(p.eventDateTime),
            speed: Number(p.speed != null ? p.speed : 0),
            courseDegrees: Number(p.courseDegrees != null ? p.courseDegrees : 0),
          }))
          .sort((a, b) => a.at - b.at);

        // Compute metrics
        let totalDist = Number(res?.distanceKm || 0);
        if (!totalDist && fixes.length > 1) {
          for (let i = 1; i < fixes.length; i++) {
            totalDist += haversineDistanceKm(fixes[i - 1], fixes[i]);
          }
        }

        let maxSpd = 0;
        let sumMovingSpd = 0;
        let movingPointsCount = 0;
        let movingMs = 0;
        let stoppedMs = 0;
        const stops = [];
        let currentStopStart = null;

        for (let i = 0; i < fixes.length; i++) {
          const pt = fixes[i];
          if (pt.speed > maxSpd) maxSpd = pt.speed;
          if (pt.speed > 3) {
            sumMovingSpd += pt.speed;
            movingPointsCount++;
          }

          if (i > 0) {
            const dt = Math.max(0, pt.at - fixes[i - 1].at);
            if (dt < 2 * 3600 * 1000) {
              if (pt.speed > 3) {
                movingMs += dt;
                if (currentStopStart) {
                  const stopDuration = fixes[i - 1].at - currentStopStart.at;
                  if (stopDuration >= 3 * 60 * 1000) {
                    stops.push({
                      id: `stop-${stops.length + 1}`,
                      startAt: currentStopStart.at,
                      endAt: fixes[i - 1].at,
                      durationMinutes: Math.round(stopDuration / 60000),
                      latitude: currentStopStart.latitude,
                      longitude: currentStopStart.longitude,
                    });
                  }
                  currentStopStart = null;
                }
              } else {
                stoppedMs += dt;
                if (!currentStopStart) {
                  currentStopStart = pt;
                }
              }
            }
          }
        }

        if (currentStopStart && fixes.length > 0) {
          const stopDuration = fixes[fixes.length - 1].at - currentStopStart.at;
          if (stopDuration >= 3 * 60 * 1000) {
            stops.push({
              id: `stop-${stops.length + 1}`,
              startAt: currentStopStart.at,
              endAt: fixes[fixes.length - 1].at,
              durationMinutes: Math.round(stopDuration / 60000),
              latitude: currentStopStart.latitude,
              longitude: currentStopStart.longitude,
            });
          }
        }

        const avgSpd =
          movingPointsCount > 0 ? Math.round(sumMovingSpd / movingPointsCount) : 0;

        setTrailState({
          loading: false,
          error: null,
          fixes,
          distanceKm: Math.round(totalDist * 10) / 10,
          maxSpeed: Math.round(maxSpd),
          avgSpeed: avgSpd,
          movingMinutes: Math.round(movingMs / 60000),
          stoppedMinutes: Math.round(stoppedMs / 60000),
          stoppages: stops,
        });
      })
      .catch((err) => {
        if (!active) return;
        setTrailState((prev) => ({
          ...prev,
          loading: false,
          error: err.message || "Failed to load vehicle trail from server.",
        }));
      });

    return () => {
      active = false;
    };
  }, [reg, activeRange.from, activeRange.to, branchId, service, reloadTrigger]);

  // Replay animation timer
  useEffect(() => {
    if (!isPlaying || mode !== "replay" || trailState.fixes.length < 2) return;

    // Base duration for 1x replay is ~30 seconds for complete route
    const intervalMs = 60;
    const step = intervalMs / (30000 / speedMultiplier);

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        if (next >= 1.0) {
          setIsPlaying(false);
          return 1.0;
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, mode, trailState.fixes.length, speedMultiplier]);

  // Active playhead point
  const currentFixIndex = useMemo(() => {
    if (!trailState.fixes.length) return 0;
    return Math.min(
      trailState.fixes.length - 1,
      Math.max(0, Math.floor(progress * (trailState.fixes.length - 1))),
    );
  }, [progress, trailState.fixes.length]);

  const currentFix = trailState.fixes[currentFixIndex] || null;

  const traveledFixes = useMemo(() => {
    if (!trailState.fixes.length) return [];
    return trailState.fixes.slice(0, currentFixIndex + 1);
  }, [trailState.fixes, currentFixIndex]);

  const activePosition = useMemo(() => {
    if (!currentFix) return null;
    return {
      latitude: currentFix.latitude,
      longitude: currentFix.longitude,
      speed: currentFix.speed,
      courseDegrees: currentFix.courseDegrees,
      plate: vehicle?.plate || reg || "TRUCK",
    };
  }, [currentFix, vehicle?.plate, reg]);

  // Scrubber touch seek
  const handleScrub = (event) => {
    const { locationX } = event.nativeEvent;
    scrubberTrackRef.current?.measure?.((x, y, width) => {
      if (width > 0) {
        const fraction = Math.max(0, Math.min(1, locationX / width));
        setProgress(fraction);
      }
    });
    // Fallback seek
    const estWidth = 300;
    const fallbackFrac = Math.max(0, Math.min(1, locationX / estWidth));
    setProgress(fallbackFrac);
  };

  const handleCustomRangeSubmit = () => {
    if (!customFromInput || !customToInput) {
      Alert.alert("Custom Range", "Please enter valid From and To dates (YYYY-MM-DD).");
      return;
    }
    const fromDate = new Date(`${customFromInput}T00:00:00+05:30`);
    const toDate = new Date(`${customToInput}T23:59:59+05:30`);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      Alert.alert("Invalid Date", "Please ensure dates are formatted as YYYY-MM-DD.");
      return;
    }
    if (toDate < fromDate) {
      Alert.alert("Invalid Range", "To date must be after From date.");
      return;
    }
    setCustomRange({
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    });
    setPreset("custom");
    setIsCustomModalOpen(false);
    setIsRangePickerOpen(false);
  };

  const totalKm = trailState.distanceKm;
  const coveredKm = totalKm > 0 ? (totalKm * progress).toFixed(1) : 0;

  return (
    <View style={styles.screen}>
      {/* ============================================================== */}
      {/* 1. FULL-SCREEN MAP CANVAS (100% DISPLAY)                        */}
      {/* ============================================================== */}
      <View style={StyleSheet.absoluteFill}>
        <FleetMap
          vehicles={vehicle ? [vehicle] : []}
          trailPoints={trailState.fixes}
          traveledTrailPoints={mode === "replay" ? traveledFixes : []}
          activePosition={mode === "replay" ? activePosition : null}
          caption={false}
          style={styles.fullScreenMap}
          mapStyle={styles.fullScreenMap}
        />
      </View>

      {/* ============================================================== */}
      {/* 2. FLOATING TOP HEADER OVERLAY                                  */}
      {/* ============================================================== */}
      <View
        pointerEvents="box-none"
        style={[styles.floatingHeader, { paddingTop: insets.top + spacing.xs }]}
      >
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => navigation.goBack()}
            style={styles.iconCircleButton}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>

          {/* Vehicle Plate & Info Badge */}
          <View style={styles.vehicleInfoBadge}>
            <View style={styles.plateContainer}>
              <AppText variant="small" mono weight="bold" color={colors.white}>
                {vehicle?.plate || reg || "TRUCK"}
              </AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" weight="bold" numberOfLines={1}>
                {trailState.fixes.length > 0
                  ? `${trailState.distanceKm} km · ${trailState.fixes.length} fixes`
                  : activeRange.label}
              </AppText>
              <AppText variant="caption" muted numberOfLines={1}>
                {vehicle?.model || "Fleet vehicle"}
              </AppText>
            </View>
          </View>

          {/* Range Picker Button */}
          <Pressable
            style={styles.rangePickerButton}
            onPress={() => setIsRangePickerOpen(true)}
          >
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <AppText variant="caption" weight="bold" color={colors.primaryDeep}>
              {preset === "last24"
                ? "24h"
                : preset === "today"
                  ? "Today"
                  : preset === "yesterday"
                    ? "Yest"
                    : preset === "last48"
                      ? "48h"
                      : "Range"} ▾
            </AppText>
          </Pressable>

          {/* Reload Trail Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reload trail"
            onPress={() => setReloadTrigger((n) => n + 1)}
            style={styles.iconCircleButtonSmall}
          >
            <Ionicons name="reload" size={16} color={colors.text} />
          </Pressable>
        </View>

        {/* Mode Switcher Pill: Trail History vs Route Replay */}
        <View style={styles.modeTabsRow}>
          <Pressable
            style={[
              styles.modeTabPill,
              mode === "history" && styles.modeTabPillActive,
            ]}
            onPress={() => {
              setMode("history");
              setIsPlaying(false);
            }}
          >
            <Ionicons
              name="map"
              size={14}
              color={mode === "history" ? colors.white : colors.textMuted}
            />
            <AppText
              variant="caption"
              weight="bold"
              color={mode === "history" ? colors.white : colors.text}
            >
              Route Trail
            </AppText>
          </Pressable>

          <Pressable
            style={[
              styles.modeTabPill,
              mode === "replay" && styles.modeTabPillActive,
            ]}
            onPress={() => setMode("replay")}
          >
            <Ionicons
              name="play-circle"
              size={15}
              color={mode === "replay" ? colors.white : colors.textMuted}
            />
            <AppText
              variant="caption"
              weight="bold"
              color={mode === "replay" ? colors.white : colors.text}
            >
              Track Replay
            </AppText>
          </Pressable>
        </View>
      </View>

      {/* ============================================================== */}
      {/* 3. FLOATING STATUS / EMPTY / ERROR BANNERS                     */}
      {/* ============================================================== */}
      {trailState.loading && (
        <View style={styles.topLoadingPillWrapper} pointerEvents="none">
          <View style={styles.topLoadingPill}>
            <ActivityIndicator size="small" color={colors.primary} />
            <AppText variant="caption" weight="bold" color={colors.primaryDeep}>
              Loading recorded GPS route track…
            </AppText>
          </View>
        </View>
      )}

      {trailState.error && (
        <View
          style={[
            styles.floatingBottom,
            { paddingBottom: Math.max(insets.bottom, 10) },
          ]}
        >
          <Card style={styles.timelineFloatingCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="alert-circle" size={24} color={colors.error} />
              <View style={{ flex: 1 }}>
                <AppText weight="bold" color={colors.error}>
                  Could not load route
                </AppText>
                <AppText variant="caption" muted>
                  {trailState.error}
                </AppText>
              </View>
            </View>
            <Button
              label="Retry Loading Trail"
              icon="reload"
              onPress={() => setReloadTrigger((n) => n + 1)}
              style={{ marginTop: 6 }}
            />
          </Card>
        </View>
      )}

      {!trailState.loading && !trailState.error && trailState.fixes.length === 0 && (
        <View
          style={[
            styles.floatingBottom,
            { paddingBottom: Math.max(insets.bottom, 10) },
          ]}
        >
          <Card style={styles.timelineFloatingCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <AppText weight="bold">No GPS movement recorded</AppText>
                <AppText variant="caption" muted>
                  No route fixes recorded for {vehicle?.plate || reg} in {activeRange.label}.
                </AppText>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
              <Button
                label="Last 48 Hours"
                style={{ flex: 1 }}
                onPress={() => setPreset("last48")}
              />
              <Button
                label="Custom Date Range"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => {
                  setCustomFromInput(toIstDateString(new Date(Date.now() - 48 * 3600000)));
                  setCustomToInput(toIstDateString(new Date()));
                  setIsCustomModalOpen(true);
                }}
              />
            </View>
          </Card>
        </View>
      )}

      {/* ============================================================== */}
      {/* 4. FLOATING BOTTOM CONTROLS (WEB TrackTimeline STYLE)           */}
      {/* ============================================================== */}
      {!trailState.loading && !trailState.error && trailState.fixes.length > 0 && (
        <View
          style={[
            styles.floatingBottom,
            { paddingBottom: Math.max(insets.bottom, 10) },
          ]}
        >
          {/* Stoppages Drawer (if opened) */}
          {isStopsOpen && (
            <Card style={styles.stopsDrawerCard}>
              <View style={styles.stopsDrawerHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="pause-circle" size={16} color="#DC2626" />
                  <AppText weight="bold">
                    Detected Stoppages ({trailState.stoppages.length})
                  </AppText>
                </View>
                <Pressable onPress={() => setIsStopsOpen(false)} hitSlop={10}>
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
              <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                {trailState.stoppages.length === 0 ? (
                  <AppText variant="caption" muted style={{ paddingVertical: 8 }}>
                    No long stoppages (&gt; 3 mins) detected.
                  </AppText>
                ) : (
                  trailState.stoppages.map((stop, i) => (
                    <Pressable
                      key={stop.id || i}
                      style={styles.stopRow}
                      onPress={() => {
                        const stopIdx = trailState.fixes.findIndex((f) => f.at >= stop.startAt);
                        if (stopIdx >= 0) {
                          setProgress(stopIdx / (trailState.fixes.length - 1));
                          setMode("replay");
                        }
                        setIsStopsOpen(false);
                      }}
                    >
                      <View style={styles.stopDot} />
                      <View style={{ flex: 1 }}>
                        <AppText variant="caption" weight="bold">
                          Stop #{i + 1} · {formatDuration(stop.durationMinutes)}
                        </AppText>
                        <AppText variant="caption" muted>
                          {formatIstTime(stop.startAt)} → {formatIstTime(stop.endAt)}
                        </AppText>
                      </View>
                      <Ionicons name="play" size={14} color={colors.primary} />
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </Card>
          )}

          {/* Main Floating HUD Card */}
          <Card style={styles.timelineFloatingCard}>
            {mode === "replay" ? (
              /* --- REPLAY TIMELINE HUD --- */
              <>
                {/* HUD Top Strip: Time, Speed, Ignition, Distance */}
                <View style={styles.hudTopStrip}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="caption" muted weight="bold">
                      PLAYHEAD TIME (IST)
                    </AppText>
                    <AppText weight="extrabold" style={styles.hudTimestampText}>
                      {currentFix ? formatIstDateTime(currentFix.at) : "--"}
                    </AppText>
                  </View>

                  {/* Speed Badge */}
                  <View
                    style={[
                      styles.speedChip,
                      {
                        backgroundColor:
                          (currentFix?.speed || 0) > 3
                            ? "#DCFCE7"
                            : (currentFix?.ignition === true || currentFix?.ignition === 1)
                              ? "#FEF3C7"
                              : "#FEE2E2",
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        (currentFix?.speed || 0) > 3
                          ? "speedometer"
                          : (currentFix?.ignition === true || currentFix?.ignition === 1)
                            ? "flash"
                            : "stop-circle"
                      }
                      size={15}
                      color={
                        (currentFix?.speed || 0) > 3
                          ? colors.success
                          : (currentFix?.ignition === true || currentFix?.ignition === 1)
                            ? "#D97706"
                            : "#DC2626"
                      }
                    />
                    <AppText
                      variant="caption"
                      weight="extrabold"
                      color={
                        (currentFix?.speed || 0) > 3
                          ? "#15803D"
                          : (currentFix?.ignition === true || currentFix?.ignition === 1)
                            ? "#B45309"
                            : "#B91C1C"
                      }
                    >
                      {currentFix?.speed != null ? Math.round(currentFix.speed) : 0} km/h
                    </AppText>
                  </View>

                  {/* Ignition & Distance */}
                  <View style={styles.hudRightSummary}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <View
                        style={[
                          styles.ignDot,
                          {
                            backgroundColor:
                              currentFix?.ignition === true || currentFix?.ignition === 1
                                ? colors.success
                                : colors.textMuted,
                          },
                        ]}
                      />
                      <AppText variant="caption" weight="bold">
                        IGN{" "}
                        {currentFix?.ignition === true || currentFix?.ignition === 1
                          ? "ON"
                          : "OFF"}
                      </AppText>
                    </View>
                    <AppText variant="caption" muted mono>
                      {coveredKm}/{totalKm} km
                    </AppText>
                  </View>
                </View>

                {/* Scrubber Progress Bar */}
                <View style={styles.scrubberContainer}>
                  <Pressable
                    ref={scrubberTrackRef}
                    style={styles.scrubberTrack}
                    onPress={handleScrub}
                  >
                    <View
                      style={[
                        styles.scrubberFill,
                        { width: `${Math.round(progress * 100)}%` },
                      ]}
                    />
                    <View
                      style={[
                        styles.scrubberThumb,
                        { left: `${Math.max(0, Math.min(97, progress * 100))}%` },
                      ]}
                    />
                  </Pressable>

                  <View style={styles.scrubberTimeLabels}>
                    <AppText variant="caption" muted mono>
                      {formatIstTime(trailState.fixes[0]?.at)} (Start)
                    </AppText>
                    <AppText variant="caption" weight="bold" color={colors.primary}>
                      {Math.round(progress * 100)}%
                    </AppText>
                    <AppText variant="caption" muted mono>
                      {formatIstTime(trailState.fixes[trailState.fixes.length - 1]?.at)} (End)
                    </AppText>
                  </View>
                </View>

                {/* Transport Controls & Multipliers */}
                <View style={styles.transportRow}>
                  {/* Jump Start */}
                  <Pressable
                    style={styles.transportSubBtn}
                    onPress={() => {
                      setProgress(0);
                      setIsPlaying(false);
                    }}
                  >
                    <Ionicons name="play-skip-back" size={18} color={colors.text} />
                  </Pressable>

                  {/* -15s */}
                  <Pressable
                    style={styles.transportSubBtn}
                    onPress={() => setProgress((p) => Math.max(0, p - 0.05))}
                  >
                    <Ionicons name="play-back" size={18} color={colors.text} />
                  </Pressable>

                  {/* Big Play/Pause Button */}
                  <Pressable
                    style={styles.playPauseCircle}
                    onPress={() => setIsPlaying((p) => !p)}
                  >
                    <Ionicons
                      name={isPlaying ? "pause" : "play"}
                      size={24}
                      color={colors.white}
                    />
                  </Pressable>

                  {/* +15s */}
                  <Pressable
                    style={styles.transportSubBtn}
                    onPress={() => setProgress((p) => Math.min(1, p + 0.05))}
                  >
                    <Ionicons name="play-forward" size={18} color={colors.text} />
                  </Pressable>

                  {/* Speed Multiplier Pills */}
                  <View style={styles.speedPillsGroup}>
                    {[1, 2, 5, 10, 20].map((s) => (
                      <Pressable
                        key={s}
                        style={[
                          styles.speedPill,
                          speedMultiplier === s && styles.speedPillActive,
                        ]}
                        onPress={() => setSpeedMultiplier(s)}
                      >
                        <AppText
                          variant="caption"
                          weight="bold"
                          color={speedMultiplier === s ? colors.white : colors.text}
                        >
                          {s}x
                        </AppText>
                      </Pressable>
                    ))}
                  </View>

                  {/* Stoppages toggle button */}
                  <Pressable
                    style={styles.stopsToggleChip}
                    onPress={() => setIsStopsOpen((p) => !p)}
                  >
                    <Ionicons name="pause" size={12} color="#DC2626" />
                    <AppText variant="caption" weight="bold" color={colors.text}>
                      {trailState.stoppages.length}
                    </AppText>
                  </Pressable>
                </View>
              </>
            ) : (
              /* --- TRAIL HISTORY SUMMARY HUD --- */
              <>
                <View style={styles.historyHudHeader}>
                  <View>
                    <AppText variant="caption" muted weight="bold">
                      RECORDED ROUTE OVERVIEW
                    </AppText>
                    <AppText variant="h3" weight="extrabold">
                      {trailState.distanceKm} km traveled
                    </AppText>
                  </View>
                  <Button
                    label="Play Replay"
                    icon="play-circle-outline"
                    onPress={() => {
                      setMode("replay");
                      setIsPlaying(true);
                    }}
                  />
                </View>

                {/* 4 Stats Chips */}
                <View style={styles.historyStatsGrid}>
                  <View style={styles.historyStatChip}>
                    <Ionicons name="speedometer-outline" size={16} color="#F59E0B" />
                    <View>
                      <AppText variant="caption" muted>
                        Top / Avg
                      </AppText>
                      <AppText variant="caption" weight="bold">
                        {trailState.maxSpeed} / {trailState.avgSpeed} km/h
                      </AppText>
                    </View>
                  </View>

                  <View style={styles.historyStatChip}>
                    <Ionicons name="time-outline" size={16} color={colors.success} />
                    <View>
                      <AppText variant="caption" muted>
                        Moving
                      </AppText>
                      <AppText variant="caption" weight="bold">
                        {formatDuration(trailState.movingMinutes)}
                      </AppText>
                    </View>
                  </View>

                  <View style={styles.historyStatChip}>
                    <Ionicons name="stop-circle-outline" size={16} color="#DC2626" />
                    <View>
                      <AppText variant="caption" muted>
                        Stopped
                      </AppText>
                      <AppText variant="caption" weight="bold">
                        {formatDuration(trailState.stoppedMinutes)}
                      </AppText>
                    </View>
                  </View>

                  <Pressable
                    style={styles.historyStatChip}
                    onPress={() => setIsStopsOpen((p) => !p)}
                  >
                    <Ionicons name="pause-circle-outline" size={16} color={colors.primary} />
                    <View>
                      <AppText variant="caption" muted>
                        Stoppages
                      </AppText>
                      <AppText variant="caption" weight="bold" color={colors.primary}>
                        {trailState.stoppages.length} stops ▾
                      </AppText>
                    </View>
                  </Pressable>
                </View>
              </>
            )}
          </Card>
        </View>
      )}

      {/* ============================================================== */}
      {/* 5. RANGE PICKER MODAL (Presets)                                 */}
      {/* ============================================================== */}
      <Modal
        visible={isRangePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRangePickerOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsRangePickerOpen(false)}
        >
          <View style={styles.rangePickerModalContent}>
            <View style={styles.modalHeaderRow}>
              <AppText variant="small" weight="bold">
                Select Telematics Date Range
              </AppText>
              <Pressable onPress={() => setIsRangePickerOpen(false)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            {[
              { key: "last24", label: "Last 24 Hours (Default)", desc: "Past 24 hours of live fixes" },
              { key: "today", label: "Today", desc: "Since 00:00:00 IST today" },
              { key: "yesterday", label: "Yesterday", desc: "Full day 00:00 to 23:59 IST" },
              { key: "last48", label: "Last 48 Hours", desc: "Past 2 days of trail records" },
              { key: "custom", label: "Custom Range…", desc: "Specify custom start and end date" },
            ].map((item) => (
              <Pressable
                key={item.key}
                style={[
                  styles.rangeOptionRow,
                  preset === item.key && styles.rangeOptionRowActive,
                ]}
                onPress={() => {
                  if (item.key === "custom") {
                    setCustomFromInput(toIstDateString(new Date(Date.now() - 24 * 3600000)));
                    setCustomToInput(toIstDateString(new Date()));
                    setIsRangePickerOpen(false);
                    setIsCustomModalOpen(true);
                  } else {
                    setPreset(item.key);
                    setIsRangePickerOpen(false);
                  }
                }}
              >
                <View style={{ flex: 1 }}>
                  <AppText weight="bold">{item.label}</AppText>
                  <AppText variant="caption" muted>
                    {item.desc}
                  </AppText>
                </View>
                {preset === item.key && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* ============================================================== */}
      {/* 6. CUSTOM DATE RANGE INPUT MODAL                               */}
      {/* ============================================================== */}
      <Modal
        visible={isCustomModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCustomModalOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsCustomModalOpen(false)}
        >
          <Pressable style={styles.customDateModalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <AppText variant="h3" weight="bold">
                Custom Route Date Range
              </AppText>
              <Pressable onPress={() => setIsCustomModalOpen(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <AppText variant="caption" weight="bold">
                FROM DATE (YYYY-MM-DD):
              </AppText>
              <TextInput
                style={styles.textInput}
                value={customFromInput}
                onChangeText={setCustomFromInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <AppText variant="caption" weight="bold">
                TO DATE (YYYY-MM-DD):
              </AppText>
              <TextInput
                style={styles.textInput}
                value={customToInput}
                onChangeText={setCustomToInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalActionsRow}>
              <Button
                label="Cancel"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => setIsCustomModalOpen(false)}
              />
              <Button
                label="Apply Range"
                style={{ flex: 1 }}
                onPress={handleCustomRangeSubmit}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  fullScreenMap: {
    flex: 1,
    width: "100%",
    height: "100%",
    borderRadius: 0,
  },
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 12,
    gap: 8,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.lg,
    gap: 8,
    ...elevation.md,
  },
  iconCircleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleButtonSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleInfoBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  plateContainer: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#334155",
  },
  rangePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  modeTabsRow: {
    flexDirection: "row",
    gap: 8,
    alignSelf: "center",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    padding: 3,
    borderRadius: radius.full,
    ...elevation.sm,
  },
  modeTabPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  modeTabPillActive: {
    backgroundColor: colors.primary,
  },
  topLoadingPillWrapper: {
    position: "absolute",
    top: 105,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 95,
  },
  topLoadingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    ...elevation.md,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  floatingBottom: {
    position: "absolute",
    bottom: 0,
    left: 12,
    right: 12,
    zIndex: 100,
    gap: 8,
  },
  timelineFloatingCard: {
    backgroundColor: "rgba(255, 255, 255, 0.97)",
    borderRadius: radius.lg,
    padding: 12,
    gap: 10,
    ...elevation.lg,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  hudTopStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hudTimestampText: {
    fontSize: 14,
    marginTop: 1,
  },
  speedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.md,
  },
  hudRightSummary: {
    alignItems: "flex-end",
    gap: 2,
  },
  ignDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  scrubberContainer: {
    marginTop: 2,
  },
  scrubberTrack: {
    height: 22,
    justifyContent: "center",
    backgroundColor: "#E2E8F0",
    borderRadius: 11,
    position: "relative",
    overflow: "hidden",
  },
  scrubberFill: {
    height: "100%",
    backgroundColor: colors.primary,
    opacity: 0.9,
  },
  scrubberThumb: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.primaryDeep,
    top: 4,
  },
  scrubberTimeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 3,
  },
  transportRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  transportSubBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  playPauseCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...elevation.md,
  },
  speedPillsGroup: {
    flexDirection: "row",
    gap: 4,
  },
  speedPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: "#F1F5F9",
  },
  speedPillActive: {
    backgroundColor: colors.primary,
  },
  stopsToggleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  stopsDrawerCard: {
    backgroundColor: "rgba(255, 255, 255, 0.97)",
    borderRadius: radius.md,
    padding: 10,
    gap: 8,
    ...elevation.md,
  },
  stopsDrawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stopRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 8,
  },
  stopDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DC2626",
  },
  historyHudHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  historyStatsGrid: {
    flexDirection: "row",
    gap: 6,
  },
  historyStatChip: {
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  rangePickerModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    gap: 10,
  },
  customDateModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 14,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  rangeOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: "#F8FAFC",
  },
  rangeOptionRowActive: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  inputGroup: {
    gap: 6,
  },
  textInput: {
    backgroundColor: "#F1F5F9",
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    fontSize: 15,
    color: colors.text,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
});
