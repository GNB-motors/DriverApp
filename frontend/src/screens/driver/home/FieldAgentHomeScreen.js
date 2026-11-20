import React, { useMemo } from "react";
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import {
  AppText,
  Card,
  Button,
  EmptyState,
  SkeletonCard,
  colors,
  spacing,
  radius,
} from "../../../components/ui";
import { useAuth } from "../../../context/AuthContext";
import { useLanguage } from "../../../context/LanguageContext";
import { apiConfigured } from "../../../services/client";
import { useApi } from "../../../hooks/useApi";
import fuelService from "../../../services/fuelService";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

export default function FieldAgentHomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, organization, token } = useAuth();
  const { t } = useLanguage();
  const c = (key, fallback) => t("fieldAgent", key) || fallback;

  const enabled = apiConfigured() && !!token;

  const fullName =
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    "Agent";
  const initials = (fullName[0] || "A").toUpperCase();
  const company = organization?.companyName || organization?.name || "";

  // Query only logs uploaded by this field agent (driverId: user._id)
  const { data, loading, error, refetch } = useApi(
    () => fuelService.listFuelLogs({ limit: 8, driverId: user?._id }),
    [user?._id],
    { enabled }
  );

  const rows = useMemo(() => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.rows)) return data.rows;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  }, [data]);

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
              {c("role", "Field Agent")}
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
          {/* Avatar */}
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
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        {/* Hero CTA or no-org state */}
        {!organization ? (
          <Card style={{ alignItems: "center", borderStyle: "dashed", borderWidth: 1.5, borderColor: colors.border }}>
            <View style={styles.heroIconBg}>
              <Ionicons name="business-outline" size={26} color={colors.textMuted} />
            </View>
            <AppText variant="bodyStrong" weight="bold" style={{ marginTop: 12, textAlign: "center" }}>
              {c("noOrgSelected", "No organisation selected")}
            </AppText>
            <AppText variant="small" muted style={{ marginTop: 4, marginBottom: 16, textAlign: "center" }}>
              {c("selectOrgPrompt", "Select an organisation from the Orgs tab to log fuel.")}
            </AppText>
            <Button
              size="sm"
              label={c("selectOrg", "Select Organisation")}
              onPress={() => navigation.navigate("Orgs")}
            />
          </Card>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={c("uploadReceipt", "Upload receipt")}
            onPress={() => navigation.navigate("VehiclePicker")}
            style={({ pressed }) => [
              styles.heroCta,
              pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
            ]}
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
                  <AppText variant="h3" weight="extrabold" color={colors.white}>
                    {c("uploadReceipt", "Upload receipt")}
                  </AppText>
                  <AppText variant="small" color={colors.onPrimaryMuted}>
                    {c("captureFuelBill", "Capture fuel bill photo")}
                  </AppText>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.white} />
            </LinearGradient>
          </Pressable>
        )}

        {/* Active org badge */}
        {company ? (
          <Pressable onPress={() => navigation.navigate("Orgs")} style={styles.orgBadge}>
            <View style={styles.orgBadgeIcon}>
              <Ionicons name="business" size={15} color={colors.primary} />
            </View>
            <AppText variant="small" weight="semibold" color={colors.primary} numberOfLines={1} style={{ flex: 1 }}>
              {company}
            </AppText>
            <View style={styles.switchBadge}>
              <AppText variant="caption" color={colors.primary} weight="medium">
                {c("activeOrg", "Active org")} · {c("tapToSwitch", "Switch")}
              </AppText>
            </View>
          </Pressable>
        ) : null}

        {/* Recent uploads */}
        <AppText variant="label" muted style={styles.sectionLabel}>
          {c("recentUploads", "Recent fuel uploads")}
        </AppText>

        {loading && rows.length === 0 ? (
          <SkeletonCard count={3} />
        ) : error ? (
          <EmptyState
            error
            title={c("couldNotLoad", "Couldn't load")}
            message={c("checkConnection", "Check your connection and try again.")}
            onAction={refetch}
          />
        ) : rows.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="water-outline" size={26} color={colors.textMuted} />
            </View>
            <AppText variant="bodyStrong" weight="bold" style={{ textAlign: "center" }}>
              {c("noUploadsYet", "No uploads yet")}
            </AppText>
            <AppText variant="small" muted style={{ marginTop: 4, textAlign: "center" }}>
              {c("tapToUploadFirst", "Tap \"Upload receipt\" above to capture your first fuel bill.")}
            </AppText>
          </Card>
        ) : (
          <Card style={styles.uploadList}>
            {rows.map((log, i) => {
              const when = log?.refuelTime || log?.createdAt;
              const litres = log?.litres != null ? `${Number(log.litres).toFixed(1)} L` : "—";
              const amount =
                log?.totalAmount != null
                  ? `₹${Number(log.totalAmount).toLocaleString("en-IN")}`
                  : "—";
              const loc = log?.location || "Fuel Station";
              const vehicleNum =
                log?.vehicleId?.registrationNumber ||
                log?.vehicleId?.vehicleNumber ||
                log?.vehicleNumber ||
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
                    <AppText variant="body" weight="semibold">
                      {amount}
                    </AppText>
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
            label={c("viewAllLogs", "View all fuel logs")}
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
    gap: 10,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orgBadgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.infoBg,
    alignItems: "center",
    justifyContent: "center",
  },
  switchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.infoBg,
  },

  sectionLabel: { marginTop: 4, paddingHorizontal: 4 },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 6,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },

  uploadList: { padding: 0, overflow: "hidden" },
  uploadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  uploadIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.infoBg,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 64 },
});
