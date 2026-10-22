/**
 * ManagerHomeScreen.js
 *
 * Dashboard for MANAGER and OPS_EXECUTIVE roles.
 * Displays quick operational metrics, pending approvals queue hook, and quick links
 * to Trips, Placements, DOs, Consignments, PODs, Unloading, etc.
 */

import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useErp } from '../../context/ErpContext';
import { useAuth } from '../../context/AuthContext';
import { AppText, Card, Badge, colors, spacing, radius } from '../../components/ui';

export default function ManagerHomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { pendingApprovalsCount, refetch, isLoading } = useErp();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Manager' : 'Manager';
  const initials = (`${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`).toUpperCase() || 'M';

  const MAIN_MODULES = [
    { label: 'Active Trips', icon: 'map', route: 'Trips', color: '#1AA28E' },
    { label: 'Placements', icon: 'car-sport', route: 'PlacementsAll', color: '#0F6E60' },
    { label: 'Delivery Orders', icon: 'document-text', route: 'DeliveryOrders', color: '#E8A317' },
    { label: 'Unloading', icon: 'flag', route: 'UnloadingList', color: '#C62828' },
  ];

  const SECONDARY_MODULES = [
    { label: 'Bilty (CNs)', icon: 'receipt-outline', route: 'Consignments' },
    { label: 'PODs', icon: 'mail-open-outline', route: 'Pods' },
    { label: 'Advances', icon: 'wallet-outline', route: 'Advances' },
  ];

  return (
    <View style={styles.flex}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.avatar}>
          <AppText weight="extrabold" color={colors.primary} style={styles.avatarText}>{initials}</AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="small" weight="medium" muted>Operations Desk</AppText>
          <AppText variant="h3" weight="extrabold" numberOfLines={1}>{userName}</AppText>
        </View>
        <Pressable style={styles.bell} hitSlop={8} onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={21} color="#3C4C47" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Approvals Queue Hook */}
        <Pressable onPress={() => navigation.navigate('Approvals')}>
          <Card elevated="md" padding={18} style={styles.approvalsCard}>
            <View style={styles.approvalsHeader}>
              <View style={styles.approvalsIcon}>
                <Ionicons name="checkmark-circle" size={24} color={colors.white} />
              </View>
              {pendingApprovalsCount > 0 ? (
                <Badge tone="destructive" label={`${pendingApprovalsCount} Pending`} />
              ) : (
                <Badge tone="valid" label="All Caught Up" />
              )}
            </View>
            <AppText variant="h3" weight="extrabold" style={{ marginTop: 14 }}>Approval Queue</AppText>
            <AppText variant="small" muted style={{ marginTop: 4 }}>
              {pendingApprovalsCount > 0
                ? 'You have operational requests waiting for your review.'
                : 'No pending requests requiring your attention.'}
            </AppText>
          </Card>
        </Pressable>

        <AppText variant="label" muted style={styles.sectionTitle}>CORE OPERATIONS</AppText>
        
        <View style={styles.grid}>
          {MAIN_MODULES.map(mod => (
            <Pressable key={mod.label} style={styles.gridItem} onPress={() => navigation.navigate(mod.route)}>
              <View style={[styles.gridIcon, { backgroundColor: mod.color + '15' }]}>
                <Ionicons name={mod.icon} size={24} color={mod.color} />
              </View>
              <AppText variant="bodyStrong" weight="bold" style={{ marginTop: 12 }}>{mod.label}</AppText>
            </Pressable>
          ))}
        </View>

        <AppText variant="label" muted style={styles.sectionTitle}>DOCUMENTATION & FINANCE</AppText>

        {SECONDARY_MODULES.map(mod => (
          <Pressable key={mod.label} style={styles.listRow} onPress={() => navigation.navigate(mod.route)}>
            <View style={styles.listIcon}>
              <Ionicons name={mod.icon} size={20} color={colors.primary} />
            </View>
            <AppText variant="bodyStrong" weight="semibold" style={{ flex: 1 }}>{mod.label}</AppText>
            <Ionicons name="chevron-forward" size={18} color={colors.border} />
          </Pressable>
        ))}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 22, paddingBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: radius.full, backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17 },
  bell: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', shadowColor: '#102824', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  scroll: { padding: 22, paddingBottom: 40 },
  
  approvalsCard: { backgroundColor: colors.surface, marginBottom: 26 },
  approvalsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  approvalsIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primaryDeep, alignItems: 'center', justifyContent: 'center' },
  
  sectionTitle: { marginBottom: 14, letterSpacing: 1 },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 28 },
  gridItem: { width: '47%', backgroundColor: colors.surface, padding: 16, borderRadius: radius.lg, shadowColor: '#102824', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  gridIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  listRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, padding: 16, borderRadius: radius.lg, marginBottom: 10, shadowColor: '#102824', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 },
  listIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' },
});
