import React, { useMemo, useRef, useState, useEffect } from "react";
import { View, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import {
  AppText,
  Button,
  TextField,
  colors,
  elevation,
  radius,
  spacing,
} from "../../components/ui";
import { useManagerData } from "../context/ManagerDataContext";
import { FreshnessChip, StatusChip } from "../components";
import LiveFleetMap from "../components/LiveFleetMap";
import { statusColor } from "../components/liveMap";
import { mapPoints } from "../components/mapGeometry";
const STATUSES = ["all", "moving", "stopped", "idling", "offline"];
const matches = (vehicle, query) =>
  `${vehicle.plate} ${vehicle.model}`.toLowerCase().includes(query);
function MapButton({ icon, label, active = false, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.mapButton, active && styles.mapButtonActive]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={active ? colors.white : colors.text}
      />
    </Pressable>
  );
}
export default function FleetMapScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { data } = useManagerData();
  const map = useRef(null);
  const [filter, setFilter] = useState(route.params?.filter || "all");
  useEffect(() => {
    if (route.params?.filter) {
      setFilter(route.params.filter);
    }
  }, [route.params?.filter]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [satellite, setSatellite] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);
  const located = useMemo(() => mapPoints(data?.vehicles || []), [data]);
  const counts = useMemo(
    () =>
      Object.fromEntries(
        STATUSES.map((status) => [
          status,
          status === "all"
            ? located.length
            : located.filter((v) => v.status === status).length,
        ]),
      ),
    [located],
  );
  const visible = (status, query) =>
    located.filter(
      (v) => (status === "all" || v.status === status) && matches(v, query),
    );
  const vehicles = visible(filter, search.trim().toLowerCase());
  const selected = vehicles.find((v) => v.id === selectedId) || null;
  const select = (vehicle) => {
    setSelectedId(vehicle.id);
    map.current?.focus(vehicle);
  };
  const changeSearch = (text) => {
    setSearch(text);
    const query = text.trim().toLowerCase();
    const found = query ? visible(filter, query) : [];
    if (found.length === 1 && found[0].id !== selectedId) select(found[0]);
  };
  return (
    <View style={styles.screen}>
      <StatusBar style={satellite ? "light" : "dark"} />
      {headerHeight > 0 && footerHeight > 0 && (
        <LiveFleetMap
          ref={map}
          vehicles={vehicles}
          selectedId={selectedId}
          onSelectVehicle={select}
          onClearSelection={() => setSelectedId(null)}
          satellite={satellite}
          topInset={headerHeight}
          bottomInset={footerHeight}
        />
      )}
      <View
        pointerEvents="box-none"
        onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
        style={[
          styles.header,
          {
            paddingTop: insets.top + spacing.sm,
            paddingLeft: insets.left + spacing.md,
            paddingRight: insets.right + spacing.md,
          },
        ]}
      >
        <View style={styles.searchRow}>
          <MapButton
            icon="arrow-back"
            label="Close full-screen map"
            onPress={() => navigation.goBack()}
          />
          <TextField
            style={styles.flex}
            fieldStyle={styles.search}
            accessibilityLabel="Search trucks"
            placeholder="Registration or model"
            icon="search-outline"
            value={search}
            onChangeText={changeSearch}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
        </View>
        <View style={styles.chipsRow}>
          {STATUSES.map((status) => {
            const active = filter === status;
            const count = counts[status] ?? 0;
            const sColor = status !== "all" ? statusColor(status) : colors.primary;
            return (
              <Pressable
                key={status}
                accessibilityRole="button"
                accessibilityLabel={`${status}: ${count} trucks`}
                accessibilityState={{ selected: active }}
                onPress={() => setFilter(status)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <View style={styles.chipTopRow}>
                  {status !== "all" && (
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: active ? colors.white : sColor },
                      ]}
                    />
                  )}
                  <AppText
                    variant="caption"
                    weight={active ? "bold" : "semibold"}
                    color={active ? colors.white : colors.textMuted}
                    style={styles.chipLabel}
                    numberOfLines={1}
                  >
                    {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                  </AppText>
                </View>
                <AppText
                  variant="small"
                  weight="extrabold"
                  color={active ? colors.white : colors.text}
                  style={styles.chipCount}
                >
                  {count}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View
        pointerEvents="box-none"
        style={[
          styles.controls,
          { top: headerHeight + spacing.sm, right: insets.right + spacing.md },
        ]}
      >
        <MapButton
          icon="earth-outline"
          label="Show all of India"
          onPress={() => map.current?.showIndia()}
        />
        <MapButton
          icon="scan-outline"
          label="Fit trucks on map"
          onPress={() => map.current?.showFleet()}
        />
        <MapButton
          icon="layers-outline"
          label={satellite ? "Show map view" : "Show satellite view"}
          active={satellite}
          onPress={() => setSatellite(!satellite)}
        />
      </View>
      <View
        pointerEvents="box-none"
        onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + spacing.md,
            paddingLeft: insets.left + spacing.md,
            paddingRight: insets.right + spacing.md,
          },
        ]}
      >
        {selected ? (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.flex}>
                <AppText variant="h2" mono>
                  {selected.plate}
                </AppText>
                <AppText variant="small" muted>
                  {selected.model}
                </AppText>
              </View>
              <StatusChip status={selected.status} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close truck details"
                hitSlop={10}
                onPress={() => setSelectedId(null)}
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
            <View style={styles.inline}>
              <Ionicons
                name="location-outline"
                size={16}
                color={colors.textMuted}
              />
              <AppText
                variant="small"
                muted
                numberOfLines={2}
                style={styles.flex}
              >
                {selected.location}
              </AppText>
            </View>
            <View style={styles.between}>
              <AppText variant="caption" color={colors.primaryDeep}>
                {selected.speed == null
                  ? "Speed unavailable"
                  : `${Math.round(selected.speed)} km/h`}
              </AppText>
              <FreshnessChip updatedAt={selected.updatedAt} />
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
              <Button
                label="Play Route"
                icon="play-circle-outline"
                style={{ flex: 1 }}
                onPress={() =>
                  navigation.navigate("Route replay", {
                    vehicleId: selected.id,
                    plate: selected.plate,
                    vehicle: selected,
                    mode: "replay",
                    autoPlay: true,
                  })
                }
              />
              <Button
                label="Route History"
                icon="trail-sign-outline"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() =>
                  navigation.navigate("Route replay", {
                    vehicleId: selected.id,
                    plate: selected.plate,
                    vehicle: selected,
                    mode: "history",
                    autoPlay: false,
                  })
                }
              />
            </View>
            <Button
              label="View truck details"
              variant="secondary"
              onPress={() =>
                navigation.navigate("Vehicle detail", {
                  id: selected.id,
                  plate: selected.plate,
                  vehicle: selected,
                })
              }
            />
          </View>
        ) : (
          <View style={styles.summary}>
            <Ionicons name="bus-outline" size={16} color={colors.primary} />
            <AppText variant="small" weight="semibold">
              {!data
                ? "Loading trucks…"
                : vehicles.length
                  ? `${vehicles.length} trucks on map · Tap a truck for details`
                  : "No trucks match this view"}
            </AppText>
          </View>
        )}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f0f3f6" },
  flex: { flex: 1 },
  header: { position: "absolute", top: 0, left: 0, right: 0, gap: spacing.sm },
  searchRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  search: elevation.md,
  chipsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
    paddingBottom: spacing.xs,
    width: "100%",
  },
  chip: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.hairline,
    ...elevation.sm,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDeep,
    ...elevation.md,
  },
  chipTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  chipLabel: {
    fontSize: 10,
    lineHeight: 13,
  },
  chipCount: {
    fontSize: 13,
    lineHeight: 16,
    marginTop: 1,
  },
  capitalize: { textTransform: "capitalize" },
  controls: { position: "absolute", gap: spacing.sm },
  mapButton: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...elevation.md,
  },
  mapButtonActive: { backgroundColor: colors.primary },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0 },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    ...elevation.lg,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  inline: { flexDirection: "row", alignItems: "center", gap: 6 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    ...elevation.md,
  },
});
