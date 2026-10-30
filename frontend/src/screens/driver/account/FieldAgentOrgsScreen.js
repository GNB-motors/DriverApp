import React from "react";
import { View, ScrollView, StyleSheet, Pressable, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { AppText, Card, Loading, EmptyState, colors, radius, spacing } from "../../../components/ui";
import { useAuth } from "../../../context/AuthContext";
import { useApi } from "../../../hooks/useApi";
import client from "../../../services/client";

/**
 * Screen for Field Agents to see and switch their active organization context.
 */
export default function FieldAgentOrgsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { activeOrgId, setActiveOrg, organization } = useAuth();
  
  // Custom API hook to fetch organizations for this field agent
  const { data: orgs, loading, error, refetch } = useApi(
    async () => {
      const res = await client.get("/me/orgs");
      return res.data?.data ?? res.data ?? [];
    },
    [],
    { fallback: [] }
  );

  const [selectionError, setSelectionError] = React.useState('');
  const [switching, setSwitching] = React.useState(false);
  const switchingRef = React.useRef(false);
  const handleSelectOrg = async (org) => {
    if (switchingRef.current) return;
    switchingRef.current = true;
    setSwitching(true); setSelectionError('');
    try { await setActiveOrg(org); navigation.navigate("Home"); }
    catch (failure) { setSelectionError(failure.message); }
    finally { switchingRef.current = false; setSwitching(false); }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + spacing.sm }]}
      >
        <AppText variant="h3" weight="extrabold" color={colors.white}>My Organisations</AppText>
        <AppText variant="small" color={colors.onPrimaryMuted}>Select an organisation to log fuel for</AppText>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {selectionError ? <AppText color={colors.error}>{selectionError}</AppText> : null}
        {loading && orgs.length === 0 ? (
          <Loading />
        ) : error ? (
          <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} />
        ) : orgs.length === 0 ? (
          <EmptyState icon="business-outline" title="No organisations" message="You haven't been added to any organisations yet." />
        ) : (
          <View style={styles.list}>
            {orgs.map((org) => {
              const isActive = organization?._id === org.orgId || organization?.orgId === org.orgId;
              
              return (
                <Pressable accessibilityRole="button" accessibilityLabel={org.companyName} disabled={switching} key={org.orgId} onPress={() => handleSelectOrg(org)}>
                  <Card elevated="sm" padding={16} style={[styles.orgCard, isActive && styles.activeCard]}>
                    <View style={styles.orgRow}>
                      <View style={[styles.iconBox, isActive && styles.activeIconBox]}>
                        <Ionicons name="business" size={20} color={isActive ? colors.primary : colors.textMuted} />
                      </View>
                      
                      <View style={styles.orgInfo}>
                        <AppText variant="bodyStrong" weight="bold" color={isActive ? colors.primary : colors.text}>
                          {org.companyName}
                        </AppText>
                        <AppText variant="caption" muted>
                          {isActive ? "Currently active" : "Tap to switch"}
                        </AppText>
                      </View>
                      
                      {isActive && (
                        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
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
    paddingHorizontal: 22,
    paddingBottom: 18,
  },
  scroll: { padding: 18 },
  list: { gap: 12 },
  
  orgCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
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
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
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
    gap: 2,
  },
});
