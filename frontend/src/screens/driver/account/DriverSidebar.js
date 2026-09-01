import React from "react";
import {
  View, Pressable, ScrollView, StyleSheet, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { AppText, colors, spacing, radius } from "../../../components/ui";
import { useAuth } from "../../../context/AuthContext";

/**
 * Primary navigation links inside the Driver/Field-Agent sidebar.
 * All items that were previously in the old "More" tab screen live here.
 */
const DRIVER_SIDEBAR_ITEMS = [
  {
    group: "My Work",
    items: [
      { key: "Wallet",        label: "Khata & bills",   icon: "wallet-outline" },
      { key: "Advances",      label: "My advances",     icon: "cash-outline" },
      { key: "FuelLog",       label: "Fuel log",        icon: "water-outline" },
      { key: "Repairs",       label: "Repairs",         icon: "build-outline" },
      { key: "MyDocuments",   label: "My documents",    icon: "document-text-outline" },
    ],
  },
  {
    group: "Settings",
    items: [
      { key: "LanguageScreen", label: "Language",        icon: "language-outline" },
      { key: "SOSOptions",     label: "Emergency SOS",   icon: "alert-circle-outline", danger: true },
      { key: "Profile",        label: "Profile",         icon: "person-outline" },
    ],
  },
];

/**
 * DriverSidebar — hamburger side-drawer for Driver & Field Agent roles.
 *
 * Props:
 *   navigation — React-Navigation navigation prop from the host screen.
 *   onClose    — called when the user taps the scrim or a nav item.
 */
export default function DriverSidebar({ navigation, onClose }) {
  const insets = useSafeAreaInsets();
  const { user, organization, logout } = useAuth();

  const fullName =
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "—";
  const roleLabel = user?.role
    ? user.role.charAt(0) + user.role.slice(1).toLowerCase().replace(/_/g, " ")
    : "";
  const company = organization?.companyName || organization?.name || "";

  const confirmLogout = () => {
    Alert.alert(
      "Log out?",
      "You will need to sign in again.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Log out", style: "destructive", onPress: logout },
      ],
    );
  };

  const go = (key) => {
    onClose();
    navigation.navigate(key);
  };

  return (
    <View style={styles.overlay}>
      {/* Drawer panel */}
      <View style={[styles.panel, { paddingTop: insets.top }]}>
        {/* Brand / identity header */}
        <LinearGradient
          colors={colors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.brand}
        >
          <View style={styles.brandRow}>
            <LinearGradient
              colors={colors.avatarGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.brandAvatar}
            >
              <AppText weight="extrabold" color={colors.white} style={styles.brandAvatarText}>
                {(fullName[0] || "D").toUpperCase()}
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

        {/* Scrollable nav list */}
        <ScrollView
          contentContainerStyle={[styles.navScroll, { paddingBottom: spacing.lg }]}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
        >
          {DRIVER_SIDEBAR_ITEMS.map((section) => (
            <View key={section.group} style={styles.section}>
              <AppText variant="label" muted style={styles.sectionLabel}>
                {section.group}
              </AppText>
              {section.items.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => go(item.key)}
                  style={styles.navItem}
                  android_ripple={{ color: colors.tealTint }}
                >
                  <Ionicons
                    name={item.icon}
                    size={19}
                    color={item.danger ? colors.error : colors.textMuted}
                  />
                  <AppText
                    variant="bodyStrong"
                    weight="semibold"
                    color={item.danger ? colors.error : colors.text}
                    style={{ flex: 1 }}
                  >
                    {item.label}
                  </AppText>
                  <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>

        {/* Fixed logout footer — outside ScrollView so it never scrolls away */}
        <View style={[styles.logoutFooter, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Pressable
            onPress={confirmLogout}
            style={styles.logoutBtn}
            android_ripple={{ color: colors.expiredBg }}
          >
            <Ionicons name="log-out-outline" size={19} color={colors.error} />
            <AppText variant="bodyStrong" weight="semibold" color={colors.error}>
              Log out
            </AppText>
          </Pressable>
        </View>
      </View>

      {/* Scrim — tap outside to close */}
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close menu" />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    zIndex: 100,
  },
  panel: {
    width: 300,
    maxWidth: "84%",
    backgroundColor: colors.surface,
    flexDirection: "column",
  },
  scrim: {
    flex: 1,
    backgroundColor: "rgba(18,18,20,0.5)",
  },
  brand: {
    padding: spacing.lg,
    paddingBottom: spacing.lg,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  brandAvatarText: {
    fontSize: 18,
  },
  navScroll: {
    padding: spacing.md,
    flexGrow: 1,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    marginLeft: 8,
    marginBottom: 4,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: radius.md,
  },
  logoutFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: radius.md,
  },
});
