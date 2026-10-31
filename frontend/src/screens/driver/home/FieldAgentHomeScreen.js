import React from "react";
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import {
  AppText, Card, Button, Loading, EmptyState, colors, spacing, radius,
} from "../../../components/ui";
import { useAuth } from "../../../context/AuthContext";
import { apiConfigured } from "../../../services/client";
import { useApi } from "../../../hooks/useApi";
import fuelService from "../../../services/fuelService";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

export default function FieldAgentHomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, organization, token } = useAuth();
  const enabled = apiConfigured() && !!token;

  const fullName =
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    "Agent";
  const initials = (fullName[0] || "A").toUpperCase();
  const company = organization?.companyName || organization?.name || "";

  const { data, loading, error, refetch } = useApi(
    () => fuelService.listFuelLogs({ limit: 8 }),
    [],
    { enabled, fallback: [] },
  );
  const rows = Array.isArray(data)
    ? data
    : (data?.results || data?.rows || data?.items || data?.data || []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Gradient header — Nova SpiceKit */}
      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + spacing.sm }]}
      >
        <View style={styles.headerContent}>
          <View style={{ flex: 1 }}>
            <AppText variant="small" color={colors.onPrimaryMuted} weight="medium">
              Field Agent
            </AppText>
            <AppText variant="h3" weight="extrabold" color={colors.white} numberOfLines={1}>
              {fullName}
            </AppText>
            {company ? (
              <AppText variant="small" color={colors.onPrimaryMuted} numberOfLines={1}>
                {company}
              </AppText>
            ) : null}
          </View>
          {/* Avatar — Nova primary gradient ring */}
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <AppText weight="extrabold" color={colors.primary} style={styles.avatarText}>
                {initials}
              </AppText>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* Hero CTA or no-org state */}
        {!organization ? (
          <Card style={{ alignItems: "center", borderStyle: "dashed", borderWidth: 1.5, borderColor: colors.border }}>
            <View style={styles.heroIconBg}>
              <Ionicons name="business-outline" size={26} color={colors.textMuted} />
            </View>
            <AppText variant="bodyStrong" weight="bold" style={{ marginTop: 12, textAlign: "center" }}>
              No organisation selected
            </AppText>
            <AppText variant="small" muted style={{ marginTop: 4, marginBottom: 16, textAlign: "center" }}>
              Select an organisation from the Orgs tab to log fuel.
            </AppText>
            <Button
              size="sm"
              label="Select Organisation"
              onPress={() => navigation.navigate("Orgs")}
            />
          </Card>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Upload fuel receipt"
            onPress={() => navigation.navigate("VehiclePicker")}
            style={styles.heroCta}
          >
            <LinearGradient
              colors={colors.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradient}
            >
              <View style={styles.heroLeft}>
                <View style={styles.heroIconBg}>
                  <Ionicons name="water" size={26} color={colors.white} />
                </View>
                <View>
                  <AppText variant="h3" weight="extrabold" color={colors.white}>Upload receipt</AppText>
                  <AppText variant="small" color={colors.onPrimaryMuted}>Capture fuel bill photo</AppText>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.white} />
            </LinearGradient>
          </Pressable>
        )}

        {/* Active org badge */}
        {company ? (
          <View style={styles.orgBadge}>
            <View style={styles.orgBadgeIcon}>
              <Ionicons name="business-outline" size={14} color={colors.primary} />
            </View>
            <AppText variant="small" weight="semibold" color={colors.primary} numberOfLines={1} style={{ flex: 1 }}>
              {company}
            </AppText>
            <AppText variant="small" muted>Active org</AppText>
          </View>
        ) : null}

        {/* Recent uploads */}
        <AppText variant="label" muted style={styles.sectionLabel}>Recent fuel uploads</AppText>
        {loading ? (
          <Loading />
        ) : error ? (
          <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} />
        ) : rows.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="water-outline" size={26} color={colors.textMuted} />
            </View>
            <AppText variant="bodyStrong" weight="bold" style={{ textAlign: "center" }}>No uploads yet</AppText>
            <AppText variant="small" muted style={{ marginTop: 4, textAlign: "center" }}>
              Tap "Upload receipt" above to capture your first fuel bill.
            </AppText>
          </Card>
        ) : (
          <Card style={styles.uploadList}>
            {rows.map((log, i) => {
              const when = log?.refuelTime || log?.createdAt;
              const litres = log?.litres != null ? `${Number(log.litres).toFixed(1)} L` : "—";
              const amount = log?.totalAmount != null
                ? `₹${Number(log.totalAmount).toLocaleString("en-IN")}`
                : "—";
              const loc = log?.location || "Unknown Location";
              const vehicleNum =
                log?.vehicleId?.registrationNumber ||
                log?.vehicleId?.vehicleNumber ||
                "Unknown Vehicle";
              return (
                <View key={log?._id || String(i)}>
                  {i > 0 ? <View style={styles.divider} /> : null}
                  <View style={styles.uploadRow}>
                    <View style={styles.uploadIcon}>
                      <Ionicons name="water" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyStrong" weight="semibold" numberOfLines={1}>
                        {vehicleNum}
                      </AppText>
                      <AppText variant="caption" muted numberOfLines={1}>
                        {loc} · {litres} · {when ? dayjs(when).fromNow() : "—"}
                      </AppText>
                    </View>
                    <AppText variant="body" weight="semibold">{amount}</AppText>
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        {rows.length > 0 ? (
          <Button
            variant="secondary"
            size="sm"
            label="View all fuel logs"
            onPress={() => navigation.navigate("Fuel")}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: 22,
    paddingBottom: 18,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.infoBg,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, color: colors.primary },

  scroll: { paddingHorizontal: 18, paddingTop: 16, gap: 14 },

  heroCta: { borderRadius: radius.xl, overflow: "hidden" },
  heroGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    gap: 14,
  },
  heroLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  heroIconBg: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.onPrimaryFaint,
    alignItems: "center",
    justifyContent: "center",
  },

  orgBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.infoBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orgBadgeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionLabel: { marginTop: 4, marginLeft: 2 },
  emptyCard: { alignItems: "center" },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  uploadList: { overflow: "hidden", padding: 0 },
  uploadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  uploadIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.infoBg,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 62 },
});
