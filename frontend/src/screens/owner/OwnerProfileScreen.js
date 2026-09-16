import React from "react";
import { View, ScrollView, StyleSheet, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { AppText, Card, ListRow, colors, spacing, radius } from "../../components/ui";

export default function OwnerProfileScreen({ navigation }) {
  const { user, organization, logout } = useAuth();
  
  const company = organization?.companyName || organization?.name || "Company";
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.name || "User";
  const initials = (fullName.trim()[0] || "?").toUpperCase();
  const roleLabel = user?.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase().replace(/_/g, " ") : "—";

  const renderGroup = (rows, label) => (
    <View style={styles.group}>
      <AppText variant="label" muted style={styles.groupLabel}>{label}</AppText>
      <Card padding={0} elevated="sm" style={styles.card}>
        {rows.map((r, i) => (
          <React.Fragment key={r.title}>
            <ListRow
              icon={r.icon}
              title={r.title}
              right={r.right || undefined}
              onPress={r.onPress}
              showChevron={!r.right && !!r.onPress}
              style={styles.rowFlat}
            />
            {i < rows.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </Card>
    </View>
  );

  const RightText = ({ children }) => (
    <View style={{ flexShrink: 1, alignItems: 'flex-end', paddingLeft: 16 }}>
      <AppText variant="body" muted style={{ textAlign: 'right' }}>{children}</AppText>
    </View>
  );

  const orgRows = [
    { icon: "business-outline", title: "Company", right: <RightText>{company}</RightText> },
    { icon: "location-outline", title: "Branch", right: <RightText>{organization?.branchName || "All branches"}</RightText> },
    { icon: "shield-outline", title: "Your role", right: <RightText>{roleLabel}</RightText> },
  ];

  const contactRows = [
    { icon: "call-outline", title: "Mobile", right: <RightText>{user?.mobileNumber || "—"}</RightText> },
    { icon: "mail-outline", title: "Email", right: <RightText>{user?.email || "—"}</RightText> },
  ];

  const prefRows = [
    { icon: "language-outline", title: "Language", right: <AppText variant="body" muted>English</AppText>, onPress: () => navigation.navigate("LanguageScreen") },
    { icon: "notifications-outline", title: "Notifications", right: null, onPress: () => navigation.navigate(user?.role === "MANAGER" ? "OpsApprovals" : "OwnerApprovals") },
    { icon: "help-circle-outline", title: "Help & support", right: null, onPress: () => alert("Support center coming soon") },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <AppText variant="h3" weight="extrabold">Profile</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <AppText variant="h1" color={colors.white} weight="bold">{initials}</AppText>
          </View>
          <View style={styles.heroText}>
            <AppText variant="h3" weight="bold">{fullName}</AppText>
            <AppText variant="body" muted>{user?.mobileNumber || company}</AppText>
          </View>
        </View>

        {renderGroup(orgRows, "Organization details")}
        {renderGroup(contactRows, "Contact information")}
        {renderGroup(prefRows, "Preferences")}

        <View style={styles.logoutContainer}>
          <AppText variant="label" muted style={styles.groupLabel}>Account</AppText>
          <Card padding={0} elevated="sm" style={styles.card}>
            <ListRow
              icon="log-out-outline"
              iconColor={colors.error}
              title="Log out"
              onPress={() => {
                Alert.alert("Log out?", "You will need to sign in again.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Log out", style: "destructive", onPress: logout }
                ]);
              }}
            />
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 18, paddingTop: 60, paddingBottom: 12,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  scroll: { padding: spacing.md, paddingBottom: 80 },
  hero: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: spacing.lg, paddingHorizontal: 4 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  heroText: { flex: 1 },
  group: { marginBottom: spacing.lg },
  groupLabel: { marginLeft: 12, marginBottom: 8 },
  card: { overflow: "hidden" },
  rowFlat: { borderRadius: 0 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 48 },
});
