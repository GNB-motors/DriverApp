import React, { useState, useMemo } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import {
  AppText,
  Card,
  Button,
  colors,
  radius,
  spacing,
} from "../../../components/ui";
import { useApi } from "../../../hooks/useApi";
import client from "../../../services/client";
import { apiConfigured } from "../../../services/client";
import { vehicleOptionsFromResponse } from '../../../telematics/services/liveData';
import { useAuth } from "../../../context/AuthContext";

function VehicleRow({ vehicle, onSelect }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Select ${vehicle.registrationNumber}`}
      onPress={() => onSelect(vehicle)}
      style={({ pressed }) => [
        styles.vehicleRow,
        pressed && { backgroundColor: colors.infoBg },
      ]}
    >
      <View style={styles.vehicleIcon}>
        <Ionicons name="bus-outline" size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText weight="semibold">{vehicle.registrationNumber}</AppText>
        <AppText variant="small" muted>
          {vehicle.model || "—"} {vehicle.type ? `· ${vehicle.type}` : ""}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

export default function FieldAgentVehiclePickerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const enabled = apiConfigured() && !!token;
  const [query, setQuery] = useState("");

  const { data, loading, error, refetch } = useApi(
    async () => {
      const res = await client.get("/vehicles/options");
      return vehicleOptionsFromResponse(res.data);
    },
    [],
    { enabled, fallback: [] }
  );

  const vehicles = useMemo(() => Array.isArray(data) ? data : [], [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(
      (v) =>
        (v.registrationNumber || "").toLowerCase().includes(q) ||
        (v.model || "").toLowerCase().includes(q)
    );
  }, [vehicles, query]);

  function selectVehicle(vehicle) {
    navigation.replace("FuelCapture", {
      vehicleId: vehicle._id || vehicle.id,
      vehicleNumber: vehicle.registrationNumber || vehicle.vehicleNumber,
    });
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + spacing.sm }]}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <View>
          <AppText variant="h3" weight="extrabold" color={colors.white}>
            Select truck
          </AppText>
          <AppText variant="small" color={colors.onPrimaryMuted}>
            Search by registration number
          </AppText>
        </View>
      </LinearGradient>

      {/* Search bar */}
      <View style={[styles.searchWrap, { marginTop: 14 }]}>
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="e.g. MH 04 AB 1234"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
            accessibilityLabel="Search vehicles"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {loading && vehicles.length === 0 ? (
          <AppText muted style={{ textAlign: "center", marginTop: 32 }}>Loading trucks…</AppText>
        ) : error ? (
          <Card>
            <AppText color={colors.error} accessibilityRole="alert">{error.message}</AppText>
            <Button label="Retry" onPress={refetch} />
          </Card>
        ) : !enabled ? (
          <Card><AppText muted>Sign in to a configured server to load trucks.</AppText></Card>
        ) : filtered.length === 0 ? (
          <Card style={{ alignItems: "center", gap: 12, padding: 24 }}>
            <Ionicons name="search-outline" size={32} color={colors.textMuted} />
            <AppText weight="semibold" style={{ textAlign: "center" }}>
              {query ? `No trucks match "${query}"` : "No trucks available"}
            </AppText>
            <AppText variant="small" muted style={{ textAlign: "center" }}>
              {query ? "Try a different number or clear the search." : "No trucks were returned for your organization."}
            </AppText>
            {query ? <Button label="Clear search" variant="secondary" size="small" onPress={() => setQuery("")} /> : null}
          </Card>
        ) : (
          <Card style={styles.list}>
            {filtered.map((vehicle, i) => (
              <View key={vehicle._id || vehicle.id || String(i)}>
                {i > 0 && <View style={styles.divider} />}
                <VehicleRow vehicle={vehicle} onSelect={selectVehicle} />
              </View>
            ))}
          </Card>
        )}

        <AppText variant="small" muted style={styles.note}>
          {!loading && !error && enabled ? `${filtered.length} of ${vehicles.length} trucks` : ""}
        </AppText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: { paddingHorizontal: 16 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 0,
  },
  scroll: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  list: { overflow: "hidden", padding: 0 },
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  vehicleIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.infoBg,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 66 },
  note: { textAlign: "center", marginTop: 8 },
});
