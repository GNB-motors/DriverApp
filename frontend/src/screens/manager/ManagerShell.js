import React, { useState } from 'react';
import { View, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppText, colors, spacing, radius } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import billService from '../../services/billService';
import { MANAGER_NAV } from './managerNav';

// Count pending driver bills across the common response shapes.
function pendingCountOf(data) {
  if (!data) return 0;
  if (Array.isArray(data)) return data.length;
  if (typeof data.total === 'number') return data.total;
  return (data.results || data.items || data.rows || data.data || []).length;
}

/**
 * ManagerShell — shared frame for every Ops screen: a light header with a
 * hamburger that opens the sidebar (drawer). Each screen renders its content
 * as children. `active` highlights the current item in the sidebar.
 */
export default function ManagerShell({ title, subtitle, navigation, active, right, children }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => setOpen(true)} hitSlop={10} style={styles.menuBtn} accessibilityLabel="Open menu">
          <Ionicons name="menu" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="h3" weight="extrabold" numberOfLines={1}>{title}</AppText>
          {subtitle ? <AppText variant="caption" mono muted numberOfLines={1}>{subtitle}</AppText> : null}
        </View>
        {right || null}
      </View>

      <View style={styles.body}>{children}</View>

      {open ? <ManagerSidebar navigation={navigation} active={active} onClose={() => setOpen(false)} /> : null}
    </View>
  );
}

function ManagerSidebar({ navigation, active, onClose }) {
  const insets = useSafeAreaInsets();
  const { user, organization, token, logout } = useAuth();
  const name = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || '—';
  const role = user?.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase().replace(/_/g, ' ') : '';
  const company = organization?.name || name;
  const subline = [name !== company ? name : null, role].filter(Boolean).join(' · ');

  // Live "bills to approve" count for the Approvals sidebar badge.
  const { data: pendingData } = useApi(
    () => billService.listBills({ status: 'PENDING' }),
    [],
    { enabled: apiConfigured() && !!token, fallback: null },
  );
  const pendingBills = pendingCountOf(pendingData);
  const confirmLogout = () => Alert.alert('Log out?', 'You will need to sign in again.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: logout }]);
  const go = (key) => {
    onClose();
    if (key !== active) navigation.navigate(key);
  };
  return (
    <View style={styles.overlay}>
      <View style={[styles.panel, { paddingTop: insets.top }]}>
        <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.brand}>
          <View style={styles.brandRow}>
            <View style={styles.brandLogo}><Ionicons name="clipboard" size={20} color={colors.white} /></View>
            <View>
              <AppText variant="bodyStrong" weight="extrabold" color={colors.white}>{company}</AppText>
              {subline ? <AppText variant="caption" color={colors.onPrimaryMuted}>{subline}</AppText> : null}
            </View>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.navScroll} showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {MANAGER_NAV.map((section) => (
            <View key={section.group} style={styles.section}>
              <AppText variant="label" muted style={styles.sectionLabel}>{section.group}</AppText>
              {section.items.map((item) => {
                const on = item.key === active;
                const badge = item.key === 'OpsApprovals' ? (pendingBills || undefined) : item.badge;
                return (
                  <Pressable key={item.key} onPress={() => go(item.key)} style={[styles.navItem, on && styles.navItemActive]}>
                    <Ionicons name={item.icon} size={19} color={on ? colors.primary : colors.textMuted} />
                    <AppText variant="bodyStrong" weight={on ? 'bold' : 'semibold'} color={on ? colors.primary : colors.text} style={{ flex: 1 }}>
                      {item.label}
                    </AppText>
                    {badge ? (
                      <View style={styles.navBadge}><AppText mono weight="bold" color={colors.white} style={styles.navBadgeText}>{badge}</AppText></View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>

        {/* Fixed logout footer — pinned below scroll area */}
        <View style={[styles.navFooter, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Pressable onPress={() => { onClose(); confirmLogout(); }} style={styles.backItem}>
            <Ionicons name="log-out-outline" size={19} color={colors.error} />
            <AppText variant="bodyStrong" weight="semibold" color={colors.error}>Log out</AppText>
          </Pressable>
        </View>
      </View>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close menu" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 12,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  menuBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },

  overlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', zIndex: 100 },
  panel: { width: 300, maxWidth: '84%', backgroundColor: colors.surface, flexDirection: 'column' },
  scrim: { flex: 1, backgroundColor: 'rgba(18,18,20,0.5)' },
  brand: { padding: spacing.lg, paddingBottom: spacing.lg },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandLogo: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.onPrimaryFaint, alignItems: 'center', justifyContent: 'center' },
  navScroll: { padding: spacing.md, paddingBottom: spacing.xl },
  section: { marginBottom: spacing.md },
  sectionLabel: { marginLeft: 8, marginBottom: 6 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12, borderRadius: radius.md },
  navItemActive: { backgroundColor: colors.tealTint },
  navBadge: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  navBadgeText: { fontSize: 10, lineHeight: 13 },
  navFooter: { borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  backItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12, borderRadius: radius.md },
});
