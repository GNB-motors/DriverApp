import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
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
  if (!dateOrIso) return "N/A";
  const d = new Date(dateOrIso);
  if (isNaN(d.getTime())) return "N/A";
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
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customFromInput, setCustomFromInput] = useState("");
  const [customToInput, setCustomToInput] = useState("");

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
        label: "Today (00:00 - Now)",
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
        label: "Yesterday (Full Day)",
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
    trips: [],
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
          trips: Array.isArray(res?.trips) ? res.trips : [],
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

    // Total base duration of replay animation is 25 seconds for the full route at 1x
    const intervalMs = 60;
    const step = (intervalMs / (25000 / speedMultiplier));

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

  // Scrubber drag / seek
  const handleScrub = (event) => {
    const { locationX } = event.nativeEvent;
    // Estimated scrubber width: total width minus padding (~340)
    const estimatedWidth = 320;
    const fraction = Math.max(0, Math.min(1, locationX / estimatedWidth));
    setProgress(fraction);
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
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.headerTitleContainer}>
          <View style={styles.plateRow}>
            <View style={styles.plateBadge}>
              <AppText
                variant="small"
                mono
                weight="bold"
                color={colors.white}
              >
                {vehicle?.plate || reg || "TRUCK ROUTE"}
              </AppText>
            </View>
            <View style={styles.liveIndicator}>
              <View style={styles.pulseDot} />
              <AppText variant="caption" weight="bold" color={colors.primaryDeep}>
                GPS TELEMETRY
              </AppText>
            </View>
          </View>
          <AppText variant="caption" muted numberOfLines={1}>
            {vehicle?.model ? `${vehicle.model} · ` : ""}
            {activeRange.label}
          </AppText>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reload trail"
          onPress={() => setReloadTrigger((n) => n + 1)}
          style={styles.refreshButton}
        >
          <Ionicons name="reload" size={18} color={colors.primary} />
        </Pressable>
      </View>

      {/* Mode Switcher: Trail History vs Route Replay */}
      <View style={styles.modeTabs}>
        <Pressable
          style={[
            styles.modeTab,
            mode === "history" && styles.modeTabActive,
          ]}
          onPress={() => {
            setMode("history");
            setIsPlaying(false);
          }}
        >
          <Ionicons
            name="map-outline"
            size={16}
            color={mode === "history" ? colors.primary : colors.textMuted}
          />
          <AppText
            variant="small"
            weight={mode === "history" ? "bold" : "medium"}
            color={mode === "history" ? colors.primary : colors.textMuted}
          >
            Trail History
          </AppText>
        </Pressable>

        <Pressable
          style={[
            styles.modeTab,
            mode === "replay" && styles.modeTabActive,
          ]}
          onPress={() => setMode("replay")}
        >
          <Ionicons
            name="play-circle-outline"
            size={16}
            color={mode === "replay" ? colors.primary : colors.textMuted}
          />
          <AppText
            variant="small"
            weight={mode === "replay" ? "bold" : "medium"}
            color={mode === "replay" ? colors.primary : colors.textMuted}
          >
            Play Route Replay
          </AppText>
        </Pressable>
      </View>

      {/* Date Range Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.presetsBar}
      >
        {[
          { key: "last24", label: "Last 24h" },
          { key: "today", label: "Today" },
          { key: "yesterday", label: "Yesterday" },
          { key: "last48", label: "Last 48h" },
          { key: "custom", label: preset === "custom" ? "Custom Range ▾" : "Custom ▾" },
        ].map((item) => {
          const isActive = preset === item.key;
          return (
            <Pressable
              key={item.key}
              style={[styles.presetChip, isActive && styles.presetChipActive]}
              onPress={() => {
                if (item.key === "custom") {
                  setCustomFromInput(toIstDateString(new Date(Date.now() - 24 * 3600000)));
                  setCustomToInput(toIstDateString(new Date()));
                  setIsCustomModalOpen(true);
                } else {
                  setPreset(item.key);
                }
              }}
            >
              <AppText
                variant="caption"
                weight={isActive ? "bold" : "medium"}
                color={isActive ? colors.white : colors.text}
              >
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Main Content Area */}
      {trailState.loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText weight="bold" style={{ marginTop: 12 }}>
            Loading recorded route trail…
          </AppText>
          <AppText variant="caption" muted>
            Fetching GPS points from telematics gateway
          </AppText>
        </View>
      ) : trailState.error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={44} color={colors.error} />
          <AppText weight="bold" color={colors.error} style={{ marginTop: 8 }}>
            Unable to load route
          </AppText>
          <AppText variant="caption" muted style={styles.errorText}>
            {trailState.error}
          </AppText>
          <Button
            label="Retry Loading Trail"
            icon="reload"
            onPress={() => setReloadTrigger((n) => n + 1)}
            style={{ marginTop: 12 }}
          />
        </View>
      ) : trailState.fixes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="navigate-circle-outline" size={48} color={colors.textMuted} />
          <AppText weight="bold" style={{ marginTop: 8 }}>
            No GPS points recorded in this window
          </AppText>
          <AppText variant="caption" muted style={styles.emptySubText}>
            Vehicle {vehicle?.plate || reg} has no recorded telemetry positions between{" "}
            {formatIstDateTime(activeRange.from)} and {formatIstDateTime(activeRange.to)}.
          </AppText>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <Button
              label="Try Last 48 Hours"
              variant="secondary"
              onPress={() => setPreset("last48")}
            />
            <Button
              label="Select Custom Date"
              onPress={() => {
                setCustomFromInput(toIstDateString(new Date(Date.now() - 48 * 3600000)));
                setCustomToInput(toIstDateString(new Date()));
                setIsCustomModalOpen(true);
              }}
            />
          </View>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          {/* Map Section */}
          <View style={styles.mapCard}>
            <FleetMap
              vehicles={vehicle ? [vehicle] : []}
              trailPoints={trailState.fixes}
              traveledTrailPoints={mode === "replay" ? traveledFixes : []}
              activePosition={mode === "replay" ? activePosition : null}
              caption={`${trailState.fixes.length} recorded GPS fixes · ${trailState.distanceKm} km traveled`}
              mapStyle={{ height: 320 }}
            />
          </View>

          {/* Mode-Specific Controls */}
          {mode === "replay" ? (
            /* =================== REPLAY CONTROLS =================== */
            <View style={styles.replayControlsContainer}>
              {/* Playhead HUD Card */}
              <Card style={styles.hudCard}>
                <View style={styles.hudRow}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="caption" muted weight="bold">
                      REPLAY TIMESTAMP (IST)
                    </AppText>
                    <AppText weight="extrabold" style={styles.hudTime}>
                      {currentFix ? formatIstDateTime(currentFix.at) : "N/A"}
                    </AppText>
                  </View>

                  <View style={styles.hudSpeedBadge}>
                    <Ionicons
                      name={
                        (currentFix?.speed || 0) > 3
                          ? "speedometer"
                          : "pause-circle"
                      }
                      size={18}
                      color={
                        (currentFix?.speed || 0) > 3
                          ? colors.success
                          : colors.warning
                      }
                    />
                    <AppText
                      variant="h3"
                      weight="extrabold"
                      color={
                        (currentFix?.speed || 0) > 3
                          ? colors.success
                          : colors.text
                      }
                    >
                      {currentFix?.speed != null
                        ? Math.round(currentFix.speed)
                        : 0}
                    </AppText>
                    <AppText variant="caption" muted weight="bold">
                      km/h
                    </AppText>
                  </View>
                </View>

                {/* Sub-telemetry strip */}
                <View style={styles.telemetryStrip}>
                  <View style={styles.telemetryItem}>
                    <AppText variant="caption" muted>
                      Status:
                    </AppText>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            (currentFix?.speed || 0) > 3
                              ? colors.success
                              : (currentFix?.ignition === true || currentFix?.ignition === 1)
                                ? "#F59E0B"
                                : "#EF4444",
                        },
                      ]}
                    />
                    <AppText variant="caption" weight="bold">
                      {(currentFix?.speed || 0) > 3
                        ? "Moving"
                        : (currentFix?.ignition === true || currentFix?.ignition === 1)
                          ? "Idling"
                          : "Stopped"}
                    </AppText>
                  </View>

                  <View style={styles.telemetryItem}>
                    <AppText variant="caption" muted>
                      Ignition:
                    </AppText>
                    <AppText
                      variant="caption"
                      weight="bold"
                      color={
                        currentFix?.ignition === true || currentFix?.ignition === 1
                          ? colors.success
                          : colors.textMuted
                      }
                    >
                      {currentFix?.ignition === true || currentFix?.ignition === 1
                        ? "ON"
                        : "OFF"}
                    </AppText>
                  </View>

                  <View style={styles.telemetryItem}>
                    <AppText variant="caption" muted>
                      Point:
                    </AppText>
                    <AppText variant="caption" mono weight="bold">
                      {currentFixIndex + 1}/{trailState.fixes.length}
                    </AppText>
                  </View>
                </View>

                {/* Interactive Scrubber Bar */}
                <View style={styles.scrubberWrapper}>
                  <Pressable
                    style={styles.scrubberTrack}
                    onPress={handleScrub}
                  >
                    <View
                      style={[
                        styles.scrubberProgress,
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

                  <View style={styles.scrubberLabels}>
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

                {/* Player Transport Controls */}
                <View style={styles.transportRow}>
                  {/* Reset to Start */}
                  <Pressable
                    style={styles.transportButtonSecondary}
                    onPress={() => {
                      setProgress(0);
                      setIsPlaying(false);
                    }}
                  >
                    <Ionicons name="play-skip-back" size={20} color={colors.text} />
                  </Pressable>

                  {/* -15s jump */}
                  <Pressable
                    style={styles.transportButtonSecondary}
                    onPress={() => {
                      setProgress((p) => Math.max(0, p - 0.05));
                    }}
                  >
                    <Ionicons name="play-back" size={20} color={colors.text} />
                  </Pressable>

                  {/* Main Play / Pause Button */}
                  <Pressable
                    style={styles.playPauseButton}
                    onPress={() => setIsPlaying((p) => !p)}
                  >
                    <Ionicons
                      name={isPlaying ? "pause" : "play"}
                      size={28}
                      color={colors.white}
                    />
                  </Pressable>

                  {/* +15s jump */}
                  <Pressable
                    style={styles.transportButtonSecondary}
                    onPress={() => {
                      setProgress((p) => Math.min(1, p + 0.05));
                    }}
                  >
                    <Ionicons name="play-forward" size={20} color={colors.text} />
                  </Pressable>

                  {/* Jump to End */}
                  <Pressable
                    style={styles.transportButtonSecondary}
                    onPress={() => {
                      setProgress(1);
                      setIsPlaying(false);
                    }}
                  >
                    <Ionicons name="play-skip-forward" size={20} color={colors.text} />
                  </Pressable>
                </View>

                {/* Speed Multipliers */}
                <View style={styles.speedRow}>
                  <AppText variant="caption" muted weight="bold">
                    REPLAY SPEED:
                  </AppText>
                  <View style={styles.speedPills}>
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
                </View>
              </Card>
            </View>
          ) : (
            /* =================== TRAIL HISTORY STATS & BREAKDOWN =================== */
            <View style={styles.historyContainer}>
              {/* Summary KPIs */}
              <View style={styles.kpiGrid}>
                <Card style={styles.kpiCard}>
                  <Ionicons name="git-commit-outline" size={20} color={colors.primary} />
                  <AppText variant="caption" muted weight="bold">
                    DISTANCE TRAVELED
                  </AppText>
                  <AppText variant="h3" weight="extrabold">
                    {trailState.distanceKm} km
                  </AppText>
                </Card>

                <Card style={styles.kpiCard}>
                  <Ionicons name="speedometer-outline" size={20} color="#F59E0B" />
                  <AppText variant="caption" muted weight="bold">
                    TOP / AVG SPEED
                  </AppText>
                  <AppText variant="h3" weight="extrabold">
                    {trailState.maxSpeed} / {trailState.avgSpeed}
                  </AppText>
                  <AppText variant="caption" muted>
                    km/h
                  </AppText>
                </Card>

                <Card style={styles.kpiCard}>
                  <Ionicons name="time-outline" size={20} color={colors.success} />
                  <AppText variant="caption" muted weight="bold">
                    MOVING TIME
                  </AppText>
                  <AppText variant="h3" weight="extrabold">
                    {formatDuration(trailState.movingMinutes)}
                  </AppText>
                </Card>

                <Card style={styles.kpiCard}>
                  <Ionicons name="stop-circle-outline" size={20} color="#EF4444" />
                  <AppText variant="caption" muted weight="bold">
                    STOPPED TIME
                  </AppText>
                  <AppText variant="h3" weight="extrabold">
                    {formatDuration(trailState.stoppedMinutes)}
                  </AppText>
                </Card>
              </View>

              {/* Start & End Point Details */}
              <Card style={{ gap: 10, marginTop: 12 }}>
                <View style={styles.pointRow}>
                  <View style={[styles.flagDot, { backgroundColor: "#16A34A" }]}>
                    <Ionicons name="flag" size={14} color="#FFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="caption" weight="bold" color="#16A34A">
                      ROUTE START
                    </AppText>
                    <AppText weight="bold">
                      {formatIstDateTime(trailState.fixes[0]?.at)}
                    </AppText>
                    <AppText variant="caption" mono muted>
                      {trailState.fixes[0]?.latitude.toFixed(5)},{" "}
                      {trailState.fixes[0]?.longitude.toFixed(5)}
                    </AppText>
                  </View>
                </View>

                <View style={styles.pointDivider} />

                <View style={styles.pointRow}>
                  <View style={[styles.flagDot, { backgroundColor: "#DC2626" }]}>
                    <Ionicons name="location" size={14} color="#FFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="caption" weight="bold" color="#DC2626">
                      LAST RECORDED POINT
                    </AppText>
                    <AppText weight="bold">
                      {formatIstDateTime(
                        trailState.fixes[trailState.fixes.length - 1]?.at,
                      )}
                    </AppText>
                    <AppText variant="caption" mono muted>
                      {trailState.fixes[trailState.fixes.length - 1]?.latitude.toFixed(5)},{" "}
                      {trailState.fixes[trailState.fixes.length - 1]?.longitude.toFixed(5)}
                    </AppText>
                  </View>
                </View>
              </Card>

              {/* Stoppages List */}
              <View style={{ marginTop: 16 }}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="hand-left-outline" size={18} color={colors.text} />
                  <AppText weight="bold">
                    Detected Stoppages ({trailState.stoppages.length})
                  </AppText>
                </View>

                {trailState.stoppages.length === 0 ? (
                  <Card style={{ padding: 14 }}>
                    <AppText variant="caption" muted>
                      No extended stoppages (&gt; 3 mins) detected along this trail.
                    </AppText>
                  </Card>
                ) : (
                  trailState.stoppages.map((stop, idx) => (
                    <Card
                      key={stop.id || idx}
                      style={{
                        marginBottom: 8,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <View style={{ gap: 2, flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <View
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: "#EF4444",
                            }}
                          />
                          <AppText weight="bold">
                            Stop #{idx + 1} · {formatDuration(stop.durationMinutes)}
                          </AppText>
                        </View>
                        <AppText variant="caption" muted>
                          {formatIstDateTime(stop.startAt)} → {formatIstTime(stop.endAt)}
                        </AppText>
                      </View>

                      <Button
                        label="Play from here"
                        variant="secondary"
                        onPress={() => {
                          const stopIndex = trailState.fixes.findIndex(
                            (f) => f.at >= stop.startAt,
                          );
                          if (stopIndex >= 0) {
                            setProgress(stopIndex / (trailState.fixes.length - 1));
                            setMode("replay");
                            setIsPlaying(true);
                          }
                        }}
                      />
                    </Card>
                  ))
                )}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Custom Date Range Modal */}
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
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <AppText variant="h3" weight="bold">
                Select Custom Date Range
              </AppText>
              <Pressable onPress={() => setIsCustomModalOpen(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>

            <AppText variant="caption" muted style={{ marginBottom: 16 }}>
              Specify start and end dates (YYYY-MM-DD) to fetch the exact recorded GPS route trail from the telematics gateway.
            </AppText>

            <View style={styles.inputGroup}>
              <AppText variant="caption" weight="bold">
                START DATE (FROM):
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
                END DATE (TO):
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

            <View style={styles.modalActions}>
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
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  headerTitleContainer: {
    flex: 1,
  },
  plateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  plateBadge: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#334155",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  modeTabs: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: "#F1F5F9",
  },
  modeTabActive: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  presetsBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  presetChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorText: {
    textAlign: "center",
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptySubText: {
    textAlign: "center",
    marginTop: 6,
    maxWidth: 320,
  },
  scrollArea: {
    flex: 1,
  },
  mapCard: {
    marginHorizontal: spacing.md,
    marginTop: 8,
    borderRadius: radius.lg,
    overflow: "hidden",
    ...elevation.sm,
  },
  replayControlsContainer: {
    paddingHorizontal: spacing.md,
    marginTop: 12,
  },
  hudCard: {
    gap: 12,
    backgroundColor: colors.surface,
    borderColor: "#CBD5E1",
    borderWidth: 1,
  },
  hudRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hudTime: {
    fontSize: 16,
    marginTop: 2,
  },
  hudSpeedBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  telemetryStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F1F5F9",
    padding: 8,
    borderRadius: radius.sm,
  },
  telemetryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  scrubberWrapper: {
    marginTop: 6,
  },
  scrubberTrack: {
    height: 28,
    justifyContent: "center",
    backgroundColor: "#E2E8F0",
    borderRadius: 14,
    position: "relative",
    overflow: "hidden",
  },
  scrubberProgress: {
    height: "100%",
    backgroundColor: colors.primary,
    opacity: 0.85,
  },
  scrubberThumb: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.primaryDeep,
    top: 7,
  },
  scrubberLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  transportRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginVertical: 4,
  },
  transportButtonSecondary: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  playPauseButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...elevation.md,
  },
  speedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  speedPills: {
    flexDirection: "row",
    gap: 6,
  },
  speedPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  speedPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  historyContainer: {
    paddingHorizontal: spacing.md,
    marginTop: 12,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  kpiCard: {
    width: "48.5%",
    padding: 12,
    gap: 4,
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  pointDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 4,
  },
  flagDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
});
