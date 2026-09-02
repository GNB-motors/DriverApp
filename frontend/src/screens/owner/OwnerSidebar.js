import React, { useEffect, useRef } from "react";
import { View, Pressable, ScrollView, StyleSheet, Alert, Animated, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { AppText, colors, spacing, radius } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useDrawer } from "../../context/DrawerContext";
import { apiConfigured } from "../../services/client";
import { useApi } from "../../hooks/useApi";
import billService from "../../services/billService";
import approvalService from "../../services/approvalService";
import { useNavigation } from "@react-navigation/native";
import { OWNER_NAV } from "./ownerNav";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function pendingCountOf(data) {
  if (!data) return 0;
  if (Array.isArray(data)) return data.length;
  if (typeof data.total === "number") return data.total;
  return (data.results || data.items || data.rows || data.data || []).length;
}

export default function OwnerSidebar() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { logout, organization, token } = useAuth();
  const { isOpen, closeDrawer, translateX, scrimOpacity } = useDrawer();
  const company = organization?.companyName || organization?.name || "Company";

  const enabled = apiConfigured() && !!token;
  const { data: pendingData } = useApi(() => billService.listBills({ status: "PENDING" }), [], { enabled, fallback: null });
  const { data: pendingErpData } = useApi(() => approvalService.getApprovalsSummary(), [], { enabled, fallback: null });
  const pendingBills = pendingCountOf(pendingData) + (Number(pendingErpData?.total) || 0);

  const confirmLogout = () => Alert.alert("Log out?", "You will need to sign in again.", [{ text: "Cancel", style: "cancel" }, { text: "Log out", style: "destructive", onPress: logout }]);

  const go = (key) => {
    closeDrawer();
    navigation.navigate(key);
  };

  // If closed and animation finished, don't render to block touches
  const [renderState, setRenderState] = React.useState(isOpen);
  useEffect(() => {
    if (isOpen) setRenderState(true);
    else {
      const timer = setTimeout(() => setRenderState(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!renderState && !isOpen) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={isOpen ? "auto" : "none"}>
      {/* Backdrop */}
      <Animated.View style={[styles.scrim, { opacity: scrimOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} accessibilityLabel="Close menu" />
      </Animated.View>

      {/* Drawer Panel */}
      <Animated.View style={[styles.panel, { transform: [{ translateX }], paddingTop: insets.top }]}>
        <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.brand}>
          <View style={styles.brandRow}>
            <View style={styles.brandLogo}><Ionicons name="cube" size={20} color={colors.white} /></View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong" weight="extrabold" color={colors.white} numberOfLines={1}>{company}</AppText>
              <AppText variant="caption" color={colors.onPrimaryMuted}>Owner dashboard</AppText>
            </View>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.navScroll} showsVerticalScrollIndicator={false}>
          {OWNER_NAV.map((section) => (
            <View key={section.group} style={styles.section}>
              <AppText variant="label" muted style={styles.sectionLabel}>{section.group}</AppText>
              {section.items.map((item) => {
                const badge = item.key === "OwnerApprovals" ? (pendingBills || undefined) : item.badge;
                return (
                  <Pressable key={item.key} onPress={() => go(item.key)} style={styles.navItem}>
                    <Ionicons name={item.icon} size={19} color={colors.textMuted} />
                    <AppText variant="bodyStrong" weight="semibold" color={colors.text} style={{ flex: 1 }}>{item.label}</AppText>
                    {badge ? (
                      <View style={styles.navBadge}><AppText mono weight="bold" color={colors.white} style={styles.navBadgeText}>{badge}</AppText></View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.navFooter, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Pressable onPress={() => { closeDrawer(); confirmLogout(); }} style={styles.backItem}>
            <Ionicons name="log-out-outline" size={19} color={colors.error} />
            <AppText variant="bodyStrong" weight="semibold" color={colors.error}>Log out</AppText>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(18,18,20,0.5)" },
  panel: { position: "absolute", top: 0, bottom: 0, left: 0, width: Math.min(SCREEN_WIDTH * 0.84, 320), backgroundColor: colors.surface, flexDirection: "column" },
  brand: { padding: spacing.lg, paddingBottom: spacing.lg },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandLogo: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.onPrimaryFaint, alignItems: "center", justifyContent: "center" },
  navScroll: { padding: spacing.md, paddingBottom: spacing.xl },
  section: { marginBottom: spacing.md },
  sectionLabel: { marginLeft: 8, marginBottom: 6 },
  navItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 12, borderRadius: radius.md },
  navBadge: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  navBadgeText: { fontSize: 10, lineHeight: 13 },
  navFooter: { borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  backItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 12, borderRadius: radius.md },
});
