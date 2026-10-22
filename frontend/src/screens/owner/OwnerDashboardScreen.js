/**
 * OwnerDashboardScreen.js
 *
 * Dashboard for OWNER role. High-level financial and operational overviews.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { AppText, Card, colors, spacing, radius } from '../../components/ui';

export default function OwnerDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // await fetchOwnerStats();
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Owner' : 'Owner';
  const initials = (`${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`).toUpperCase() || 'O';

  const QUICK_LINKS = [
    { label: 'Erp Overview', icon: 'analytics-outline', route: 'ErpOverview' },
    { label: 'Finance & Accounts', icon: 'cash-outline', route: 'Finance' },
    { label: 'Sale Bills', icon: 'document-text-outline', route: 'SaleBills' },
    { label: 'Ledgers', icon: 'book-outline', route: 'Ledger' },
    { label: 'Trips & Operations', icon: 'map-outline', route: 'ManagerTabs' },
  ];

  return (
    <View style={styles.flex}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.avatar}>
          <AppText weight="extrabold" color={colors.primary} style={styles.avatarText}>{initials}</AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="small" weight="medium" muted>Fleet Owner</AppText>
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
        <AppText variant="label" muted style={styles.sectionTitle}>FLEET METRICS</AppText>
        
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <AppText variant="h2" weight="extrabold" color={colors.primaryDeep}>42</AppText>
            <AppText variant="small" muted style={{ marginTop: 4 }}>Active Trips</AppText>
          </View>
          <View style={styles.metricCard}>
            <AppText variant="h2" weight="extrabold" color={colors.primaryDeep}>15</AppText>
            <AppText variant="small" muted style={{ marginTop: 4 }}>Pending DOs</AppText>
          </View>
        </View>

        <AppText variant="label" muted style={styles.sectionTitle}>OWNER ACTIONS</AppText>
        
        {QUICK_LINKS.map(link => (
          <Pressable key={link.label} style={styles.listRow} onPress={() => navigation.navigate(link.route)}>
            <View style={styles.listIcon}>
              <Ionicons name={link.icon} size={20} color={colors.primary} />
            </View>
            <AppText variant="bodyStrong" weight="semibold" style={{ flex: 1 }}>{link.label}</AppText>
            <Ionicons name="chevron-forward" size={18} color={colors.border} />
          </Pressable>
        ))}

        {/* Shortcuts for creation */}
        <AppText variant="label" muted style={styles.sectionTitle}>QUICK CREATE</AppText>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable style={styles.createBtn} onPress={() => navigation.navigate('DeliveryOrderForm')}>
            <Ionicons name="add-circle-outline" size={20} color={colors.white} />
            <AppText variant="bodyStrong" weight="bold" color={colors.white}>New DO</AppText>
          </Pressable>
          <Pressable style={styles.createBtn} onPress={() => navigation.navigate('PlacementForm')}>
            <Ionicons name="add-circle-outline" size={20} color={colors.white} />
            <AppText variant="bodyStrong" weight="bold" color={colors.white}>New Placement</AppText>
          </Pressable>
        </View>

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
  scroll: { padding: 22, paddingBottom: 60 },
  
  sectionTitle: { marginBottom: 14, marginTop: 10, letterSpacing: 1 },
  
  metricsGrid: { flexDirection: 'row', gap: 14, marginBottom: 20 },
  metricCard: { flex: 1, backgroundColor: colors.surface, padding: 18, borderRadius: radius.lg, shadowColor: '#102824', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },

  listRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, padding: 16, borderRadius: radius.lg, marginBottom: 10, shadowColor: '#102824', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 },
  listIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' },

  createBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.lg },
});
