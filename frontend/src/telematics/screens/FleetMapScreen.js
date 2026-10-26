import React, { useMemo, useRef, useState } from "react";
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.chips}
        >
          {STATUSES.map((status) => {
            const active = filter === status;
            return (
              <Pressable
                key={status}
                accessibilityRole="button"
                accessibilityLabel={`${status}: ${counts[status]} trucks`}
                accessibilityState={{ selected: active }}
                onPress={() => setFilter(status)}
                style={[styles.chip, active && styles.chipActive]}
              >
                {status !== "all" && (
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: statusColor(status) },
                      active && styles.dotActive,
                    ]}
                  />
                )}
                <AppText
                  variant="small"
                  weight="semibold"
                  color={active ? colors.white : colors.text}
                  style={styles.capitalize}
                >
                  {status}
                </AppText>
                <AppText
                  variant="small"
                  weight="semibold"
                  mono
                  color={active ? colors.onPrimaryMuted : colors.textMuted}
                >
                  {counts[status]}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
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
            <Button
              label="View truck details"
              onPress={() =>
                navigation.navigate("Vehicle detail", { id: selected.id })
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
  chips: { flexDirection: "row", gap: spacing.sm, paddingBottom: spacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    ...elevation.sm,
  },
  chipActive: { backgroundColor: colors.primary },
  dot: { width: 8, height: 8, borderRadius: radius.full },
  dotActive: { borderWidth: 1.5, borderColor: colors.white },
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
