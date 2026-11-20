import React, { useState, useMemo, useRef } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import {
  AppText,
  Card,
  EmptyState,
  SkeletonCard,
  colors,
  radius,
  spacing,
} from "../../../components/ui";
import { useAuth } from "../../../context/AuthContext";
import { useLanguage } from "../../../context/LanguageContext";
import { useApi } from "../../../hooks/useApi";
import client from "../../../services/client";

/**
 * Screen for Field Agents to see and switch their active organization context.
 */
export default function FieldAgentOrgsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { setActiveOrg, organization } = useAuth();
  const { t } = useLanguage();

  const c = (key, fallback) => t("fieldAgent", key) || fallback;

  // Custom API hook to fetch organizations for this field agent
  const { data: rawOrgs, loading, error, refetch } = useApi(
    async () => {
      const res = await client.get("/me/orgs");
      return res.data?.data ?? res.data ?? [];
    },
    [],
    { enabled: true }
  );

  const orgList = useMemo(() => {
    if (Array.isArray(rawOrgs)) return rawOrgs;
    if (Array.isArray(rawOrgs?.data)) return rawOrgs.data;
    if (Array.isArray(rawOrgs?.orgs)) return rawOrgs.orgs;
    return [];
  }, [rawOrgs]);

  const [search, setSearch] = useState("");
  const [selectionError, setSelectionError] = useState("");
  const [switchingId, setSwitchingId] = useState(null);
  const switchingRef = useRef(false);

  const filteredOrgs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orgList;
    return orgList.filter((o) =>
      (o.companyName || o.name || "").toLowerCase().includes(q)
    );
  }, [orgList, search]);

  const handleSelectOrg = async (org) => {
    const targetId = org.orgId || org._id || org.id;
    if (switchingRef.current || !targetId) return;

    switchingRef.current = true;
    setSwitchingId(targetId);
    setSelectionError("");

    try {
      await setActiveOrg(org);
      navigation.navigate("Home");
    } catch (failure) {
      setSelectionError(failure?.message || "Failed to switch organization");
    } finally {
      switchingRef.current = false;
      setSwitchingId(null);
    }
  };

  const currentOrgId = String(organization?._id || organization?.orgId || "");

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + spacing.sm }]}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="h3" weight="extrabold" color={colors.white}>
              {c("myOrgsTitle", "My Organisations")}
            </AppText>
            <AppText variant="small" color={colors.onPrimaryMuted}>
              {c("selectOrgSubtitle", "Select an organisation to log fuel for")}
            </AppText>
          </View>
          <View style={styles.badgeWrap}>
            <AppText variant="small" weight="bold" color={colors.white}>
              {orgList.length}
            </AppText>
          </View>
        </View>

        {/* Search bar inside header if multiple orgs */}
        {orgList.length > 2 ? (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              placeholder={c("searchOrgs", "Search organisation...")}
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
              clearButtonMode="while-editing"
            />
            {search ? (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        {selectionError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={colors.error} />
            <AppText variant="small" color={colors.error} style={{ flex: 1 }}>
              {selectionError}
            </AppText>
          </View>
        ) : null}

        {loading && orgList.length === 0 ? (
          <SkeletonCard count={4} />
        ) : error ? (
          <EmptyState
            error
            title={c("couldNotLoad", "Couldn't load")}
            message={c("checkConnection", "Check your connection and try again.")}
            onAction={refetch}
          />
        ) : orgList.length === 0 ? (
          <EmptyState
            icon="business-outline"
            title={c("noOrgs", "No organisations")}
            message={c("noOrgsMessage", "You haven't been added to any organisations yet.")}
          />
        ) : filteredOrgs.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="No matching organisations"
            message={`No organization found matching "${search}"`}
          />
        ) : (
          <View style={styles.list}>
            {filteredOrgs.map((org) => {
              const orgId = String(org.orgId || org._id || org.id || "");
              const orgName = org.companyName || org.name || "Organisation";
              const isActive = currentOrgId && currentOrgId === orgId;
              const isSwitchingThis = switchingId === orgId;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={orgName}
                  disabled={!!switchingId}
                  key={orgId || orgName}
                  onPress={() => handleSelectOrg(org)}
                  style={({ pressed }) => [
                    styles.pressableWrap,
                    pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
                  ]}
                >
                  <Card
                    elevated="sm"
                    padding={16}
                    style={[styles.orgCard, isActive && styles.activeCard]}
                  >
                    <View style={styles.orgRow}>
                      <View style={[styles.iconBox, isActive && styles.activeIconBox]}>
                        <Ionicons
                          name="business"
                          size={22}
                          color={isActive ? colors.primary : colors.textMuted}
                        />
                      </View>

                      <View style={styles.orgInfo}>
                        <View style={styles.titleRow}>
                          <AppText
                            variant="bodyStrong"
                            weight="bold"
                            numberOfLines={1}
                            color={isActive ? colors.primary : colors.text}
                          >
                            {orgName}
                          </AppText>
                          {isActive ? (
                            <View style={styles.activePill}>
                              <AppText
                                variant="caption"
                                weight="bold"
                                color={colors.primary}
                              >
                                ACTIVE
                              </AppText>
                            </View>
                          ) : null}
                        </View>
                        <AppText variant="caption" muted numberOfLines={1}>
                          {isActive
                            ? c("currentlyActive", "Currently active")
                            : c("tapToSwitch", "Tap to switch")}
                        </AppText>
                      </View>

                      {isSwitchingThis ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : isActive ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color={colors.primary}
                        />
                      ) : (
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={colors.textMuted}
                        />
                      )}
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgeWrap: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    marginTop: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  scroll: { padding: 18, gap: 12 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  list: { gap: 12 },
  pressableWrap: {
    borderRadius: radius.lg,
  },
  orgCard: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  activeCard: {
    borderColor: colors.primary,
    backgroundColor: colors.infoBg,
  },
  orgRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeIconBox: {
    borderColor: colors.infoBg,
    backgroundColor: colors.white,
  },
  orgInfo: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activePill: {
    backgroundColor: "rgba(238, 107, 30, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
