import React from "react";
import {
  View, Pressable, ScrollView, StyleSheet, Alert, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { AppText, colors, spacing, radius } from "../../../components/ui";
import { useAuth } from "../../../context/AuthContext";
import { useDrawer, DRAWER_WIDTH_EXPORT } from "../../../context/DrawerContext";

const FIELD_AGENT_SIDEBAR_ITEMS = [
  {
    group: "My Work",
    items: [
      { key: "Fuel",          label: "Fuel log",        icon: "water-outline" },
    ],
  },
  {
    group: "Settings",
    items: [
      { key: "LanguageScreen", label: "Language",       icon: "language-outline" },
      { key: "SOSOptions",     label: "Emergency SOS",  icon: "alert-circle-outline", danger: true },
      { key: "Profile",        label: "Profile",        icon: "person-outline" },
    ],
  },
];

export default function FieldAgentSidebar() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, organization, logout } = useAuth();
  const { isOpen, translateX, scrimOpacity, closeDrawer } = useDrawer();

  if (!isOpen) return null;

  const fullName =
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "—";
  const roleLabel = "Field Agent";
  const company = organization?.companyName || organization?.name || "";

  const confirmLogout = () => {
    closeDrawer();
    setTimeout(() =>
      Alert.alert(
        "Log out?",
        "You will need to sign in again.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Log out", style: "destructive", onPress: logout },
        ],
      ), 250);
  };

  const go = (key) => {
    closeDrawer();
    setTimeout(() => navigation.navigate(key), 220);
  };

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View style={[styles.panel, { paddingTop: insets.top, transform: [{ translateX }] }]}>
        <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.brand}>
          <View style={styles.brandRow}>
            <LinearGradient colors={colors.avatarGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.brandAvatar}>
              <AppText weight="extrabold" color={colors.white} style={styles.brandAvatarText}>
                {(fullName[0] || "F").toUpperCase()}
              </AppText>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong" weight="extrabold" color={colors.white} numberOfLines={1}>
                {fullName}
              </AppText>
              {(roleLabel || company) ? (
                <AppText variant="caption" color={colors.onPrimaryMuted} numberOfLines={1}>
                  {[roleLabel, company].filter(Boolean).join(" · ")}
                </AppText>
              ) : null}
            </View>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={[styles.navScroll, { paddingBottom: spacing.lg }]} showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {FIELD_AGENT_SIDEBAR_ITEMS.map((section) => (
            <View key={section.group} style={styles.section}>
              <AppText variant="label" muted style={styles.sectionLabel}>{section.group}</AppText>
              {section.items.map((item) => (
                <Pressable key={item.key} onPress={() => go(item.key)} style={styles.navItem} android_ripple={{ color: colors.tealTint }}>
                  <Ionicons name={item.icon} size={19} color={item.danger ? colors.error : colors.textMuted} />
                  <AppText variant="bodyStrong" weight="semibold" color={item.danger ? colors.error : colors.text} style={{ flex: 1 }}>
                    {item.label}
                  </AppText>
                  <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>

        <View style={[styles.logoutFooter, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Pressable onPress={confirmLogout} style={styles.logoutBtn} android_ripple={{ color: colors.expiredBg }}>
            <Ionicons name="log-out-outline" size={19} color={colors.error} />
            <AppText variant="bodyStrong" weight="semibold" color={colors.error}>Log out</AppText>
          </Pressable>
        </View>
      </Animated.View>

      <Animated.View style={[styles.scrim, { opacity: scrimOpacity }]} pointerEvents={isOpen ? "auto" : "none"}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} accessibilityLabel="Close menu" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, flexDirection: "row", zIndex: 200 },
  panel: { width: DRAWER_WIDTH_EXPORT, maxWidth: "84%", backgroundColor: colors.surface, flexDirection: "column", zIndex: 201, shadowColor: "#000", shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 16 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(18,18,20,0.52)", zIndex: 200 },
  brand: { padding: spacing.lg, paddingBottom: spacing.lg },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandAvatar: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  brandAvatarText: { fontSize: 18 },
  navScroll: { padding: spacing.md, flexGrow: 1 },
  section: { marginBottom: spacing.md },
  sectionLabel: { marginLeft: 8, marginBottom: 4 },
  navItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 13, borderRadius: radius.md },
  logoutFooter: { borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  logoutBtn: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 13, borderRadius: radius.md },
});
