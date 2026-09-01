import React from "react";
import { View, ScrollView, StyleSheet, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../context/AuthContext";
import { AppText, Card, ListRow, colors, spacing, radius } from "../../../components/ui";

/**
 * OwnerProfileScreen — profile page for Owner and Manager roles.
 * Shows organisation details, account settings and app info.
 * Does NOT show driver-specific content (wallet, trips, advances).
 */
export default function OwnerProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { logout, user, organization } = useAuth();
  const confirmLogout = () =>
    Alert.alert("Log out?", "You will need to sign in again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: logout },
    ]);

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.name ||
    "";
  const roleLabel = user?.role
    ? user.role.charAt(0) + user.role.slice(1).toLowerCase().replace(/_/g, " ")
    : "—";
  const company =
    organization?.companyName || organization?.name || "—";
  const email = user?.email || "—";
  const phone = user?.mobileNumber || "—";
  const initials = (fullName.trim()[0] || "?").toUpperCase();

  // Organisation section
  const orgRows = [
    { icon: "business-outline",   title: "Company",   right: <AppText variant="body" muted numberOfLines={1}>{company}</AppText> },
    { icon: "location-outline",   title: "Branch",    right: <AppText variant="body" muted numberOfLines={1}>{organization?.branchName || "All branches"}</AppText> },
    { icon: "shield-outline",     title: "Role",      right: <AppText variant="body" muted numberOfLines={1}>{roleLabel}</AppText> },
  ];
  // Account section
  const accountRows = [
    { icon: "call-outline",       title: "Phone",     right: <AppText variant="body" muted>{phone}</AppText> },
    { icon: "mail-outline",       title: "Email",     right: <AppText variant="body" muted numberOfLines={1}>{email}</AppText> },
    { icon: "language-outline",   title: "Language",  right: <AppText variant="body" muted>English</AppText>, onPress: () => navigation.navigate("LanguageScreen") },
    { icon: "notifications-outline", title: "Notifications", right: null, onPress: () => {} },
  ];
  // App section
  const appRows = [
    { icon: "help-circle-outline", title: "Help & support",  onPress: () => {} },
    { icon: "document-text-outline", title: "Terms of service", onPress: () => {} },
    { icon: "lock-closed-outline", title: "Privacy policy",  onPress: () => {} },
  ];

  const renderGroup = (rows, label) => (
    <View style={styles.group}>
      <AppText variant="label" muted style={styles.groupLabel}>{label}</AppText>
      <Card padding={0} elevated="sm" style={styles.card}>
        {rows.map((r, i) => (
          <View key={r.title}>
            {i > 0 ? <View style={styles.divider} /> : null}
            <ListRow
              icon={r.icon}
              title={r.title}
              right={r.right}
              onPress={r.onPress}
              showChevron={!r.right && !!r.onPress}
              style={styles.rowFlat}
            />
          </View>
        ))}
      </Card>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <LinearGradient
          colors={colors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatar}
        >
          <AppText weight="extrabold" color={colors.white} style={styles.avatarText}>
            {initials}
          </AppText>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <AppText variant="h3" weight="extrabold" numberOfLines={1}>
            {fullName || "—"}
          </AppText>
          <AppText variant="caption" mono muted numberOfLines={1}>
            {roleLabel} · {company}
          </AppText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {renderGroup(orgRows, "Organisation")}
        {renderGroup(accountRows, "Account")}
        {renderGroup(appRows, "App")}

        {/* Version */}
        <AppText variant="caption" mono muted center style={styles.version}>
          Sahayak v4.2.0 · build 812
        </AppText>

        {/* Logout */}
        <View
          style={styles.logoutBtn}
          onStartShouldSetResponder={() => true}
          onResponderRelease={confirmLogout}
        >
          <Ionicons name="log-out-outline" size={19} color={colors.error} />
          <AppText variant="bodyStrong" weight="bold" color={colors.error}>
            Log out
          </AppText>
        </View>
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
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 20 },
  scroll: { paddingHorizontal: 18, paddingTop: 16, gap: 0 },
  group: { marginBottom: 18 },
  groupLabel: { marginLeft: 4, marginBottom: 8 },
  card: { overflow: "hidden" },
  rowFlat: { borderWidth: 0, borderRadius: 0, backgroundColor: "transparent" },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 68 },
  version: { marginTop: 4, marginBottom: 12 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 54,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: "#F0CFCB",
    backgroundColor: colors.surface,
    marginTop: 4,
  },
});
