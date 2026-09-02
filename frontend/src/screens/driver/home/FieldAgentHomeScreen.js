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

// Removed QUICK_ACTIONS to avoid redundant button

/**
 * FieldAgentHomeScreen — dedicated home for the Field Agent role.
 *
 * A field agent:
 *  - Can work for more than one organisation.
 *  - Primary job: capture and upload fuel receipts on behalf of organisations.
 *  - No trip management, no driver khata / advances.
 *
 * Layout:
 *  - Header with hamburger (opens DriverSidebar via DrawerContext).
 *  - "Upload fuel receipt" hero CTA.
 *  - Recent fuel uploads list.
 *  - Quick action grid.
 */
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

  // Recent fuel uploads
  const { data, loading, error, refetch } = useApi(
    () => fuelService.listFuelLogs({ limit: 8 }),
    [],
    { enabled, fallback: [] },
  );
  const rows = Array.isArray(data)
    ? data
    : (data?.results || data?.rows || data?.items || data?.data || []);

  const onQuick = (key) => {
    if (key === "fuel")    navigation.navigate("FuelCapture");
    else if (key === "docs")    navigation.navigate("MyDocuments");
    else if (key === "profile") navigation.navigate("Profile");
    else if (key === "sos")     navigation.navigate("SOSOptions");
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={{ flex: 1 }}>
          <AppText variant="small" weight="medium" muted>Field Agent</AppText>
          <AppText variant="h3" weight="extrabold" numberOfLines={1}>{fullName}</AppText>
        </View>
        <LinearGradient
          colors={colors.avatarGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatar}
        >
          <AppText weight="extrabold" color={colors.white} style={styles.avatarText}>{initials}</AppText>
        </LinearGradient>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* Hero CTA or Empty State */}
        {!organization ? (
          <Card variant="outline" elevated="none" padding={20} style={{ alignItems: "center", borderStyle: "dashed" }}>
            <View style={[styles.heroIconBg, { backgroundColor: colors.surface }]}>
              <Ionicons name="business-outline" size={26} color={colors.textMuted} />
            </View>
            <AppText variant="bodyStrong" weight="bold" center style={{ marginTop: 12 }}>No organisation selected</AppText>
            <AppText variant="small" muted center style={{ marginTop: 4, marginBottom: 16 }}>
              Select an organisation from the Orgs tab to log fuel.
            </AppText>
            <Button
              variant="primary"
              size="sm"
              label="Select Organisation"
              onPress={() => navigation.navigate("Orgs")}
            />
          </Card>
        ) : (
          <Pressable onPress={() => navigation.navigate("FuelCapture")} style={styles.heroCta}>
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

        {/* Organisation context badge */}
        {company ? (
          <View style={styles.orgBadge}>
            <Ionicons name="business-outline" size={15} color={colors.primary} />
            <AppText variant="small" weight="semibold" color={colors.primary} numberOfLines={1} style={{ flex: 1 }}>
              Active: {company}
            </AppText>
            <AppText variant="caption" muted>Working for</AppText>
          </View>
        ) : null}

        {/* Quick actions removed to avoid redundancy */}

        {/* Recent uploads */}
        <AppText variant="label" muted style={styles.sectionLabel}>Recent fuel uploads</AppText>
        {loading ? (
          <Loading />
        ) : error ? (
          <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} />
        ) : rows.length === 0 ? (
          <Card variant="outline" elevated="none" padding={20} style={styles.emptyCard}>
            <View style={styles.emptyIcon}><Ionicons name="water-outline" size={26} color={colors.textMuted} /></View>
            <AppText variant="bodyStrong" weight="bold" center>No uploads yet</AppText>
            <AppText variant="small" muted center style={styles.emptySub}>
              Tap &quot;Upload receipt&quot; above to capture your first fuel bill.
            </AppText>
          </Card>
        ) : (
          <Card elevated="sm" padding={0} style={styles.uploadList}>
            {rows.map((log, i) => {
              const when = log?.refuelTime || log?.createdAt;
              const litres = log?.litres != null ? `${Number(log.litres).toFixed(1)} L` : "—";
              const amount = log?.totalAmount != null
                ? `₹${Number(log.totalAmount).toLocaleString("en-IN")}`
                : "—";
              const loc = log?.location || "Unknown Location";
              const vehicleNum = log?.vehicleId?.registrationNumber || log?.vehicleId?.vehicleNumber || "Unknown Vehicle";
              return (
                <View key={log?._id || String(i)}>
                  {i > 0 ? <View style={styles.divider} /> : null}
                  <View style={styles.uploadRow}>
                    <View style={styles.uploadIcon}>
                      <Ionicons name="water" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyStrong" weight="semibold" numberOfLines={1}>{vehicleNum}</AppText>
                      <AppText variant="caption" mono muted numberOfLines={1}>
                        {loc} · {litres} · {when ? dayjs(when).fromNow() : "—"}
                      </AppText>
                    </View>
                    <AppText mono variant="body" weight="semibold">{amount}</AppText>
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
            style={styles.viewAll}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingHorizontal: 22,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.background, alignItems: "center", justifyContent: "center",
  },
  avatar: {
    width: 40, height: 40, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 16 },
  scroll: { paddingHorizontal: 18, paddingTop: 16, gap: 14 },

  heroCta: { borderRadius: 18, overflow: "hidden" },
  heroGradient: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 20, gap: 14,
  },
  heroLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  heroIconBg: {
    width: 52, height: 52, borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center", justifyContent: "center",
  },

  orgBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: colors.tealTint,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.primaryLight,
  },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridItem: {
    flexBasis: "47%", flexGrow: 1, minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 16, gap: 8,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  gridPrimary: { backgroundColor: colors.primary, borderColor: colors.primaryDeep },
  gridDanger: { backgroundColor: colors.expiredBg, borderColor: "#F0CFCB" },

  sectionLabel: { marginTop: 4, marginLeft: 2 },
  emptyCard: { alignItems: "center", borderStyle: "dashed" },
  emptyIcon: {
    width: 52, height: 52, borderRadius: radius.lg,
    backgroundColor: colors.background,
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  emptySub: { marginTop: 4 },

  uploadList: { overflow: "hidden" },
  uploadRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  uploadIcon: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.tealTint,
    alignItems: "center", justifyContent: "center",
  },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 62 },
  viewAll: { marginTop: 0 },
});
