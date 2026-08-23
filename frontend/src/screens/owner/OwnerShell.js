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
import approvalService from '../../services/approvalService';
import branchService from '../../services/branchService';
import { OWNER_NAV } from './ownerNav';

// Normalise a branches response + each row → { id, name }.
function normaliseBranches(data) {
  const rows = Array.isArray(data) ? data : (data?.results || data?.items || data?.rows || data?.data || []);
  return rows.map((b) => ({
    id: b?._id || b?.id,
    name: b?.name || b?.branchName || b?.label || b?.code || 'Branch',
  })).filter((b) => b.id);
}

// Count pending driver bills across the common response shapes.
function pendingCountOf(data) {
  if (!data) return 0;
  if (Array.isArray(data)) return data.length;
  if (typeof data.total === 'number') return data.total;
  return (data.results || data.items || data.rows || data.data || []).length;
}

/**
 * OwnerShell — shared frame for every Owner/Ops screen: a light header with a
 * hamburger that opens the sidebar (drawer). Each screen renders its content as
 * children. `active` highlights the current item in the sidebar.
 */
export default function OwnerShell({ title, subtitle, navigation, active, right, children }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);

  const { token, activeBranchId, setActiveBranch } = useAuth();
  // Branches for the owner's location filter. null selection = All branches.
  const { data: branchesData } = useApi(
    () => branchService.listBranches(),
    [],
    { enabled: apiConfigured() && !!token, fallback: [] },
  );
  const branches = normaliseBranches(branchesData);
  const currentBranchLabel = activeBranchId
    ? (branches.find((b) => b.id === activeBranchId)?.name || 'Selected branch')
    : 'All branches';

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

      {/* Location filter — scopes all owner data to a branch (or All branches). */}
      <Pressable onPress={() => setBranchOpen(true)} style={styles.locBar} accessibilityLabel="Change location">
        <Ionicons name="location-outline" size={16} color={colors.primary} />
        <AppText variant="small" weight="semibold" style={{ flex: 1 }} numberOfLines={1}>{currentBranchLabel}</AppText>
        <AppText variant="caption" muted>Change</AppText>
        <Ionicons name="chevron-down" size={15} color={colors.textMuted} />
      </Pressable>

      <View style={styles.body}>{children}</View>

      {branchOpen ? (
        <BranchPicker
          branches={branches}
          activeBranchId={activeBranchId}
          onSelect={(id) => { setActiveBranch(id); setBranchOpen(false); }}
          onClose={() => setBranchOpen(false)}
        />
      ) : null}

      {open ? <OwnerSidebar navigation={navigation} active={active} onClose={() => setOpen(false)} /> : null}
    </View>
  );
}

/** Location picker sheet — "All branches" plus one row per branch. */
function BranchPicker({ branches, activeBranchId, onSelect, onClose }) {
  const insets = useSafeAreaInsets();
  const rows = [{ id: null, name: 'All branches' }, ...branches];
  return (
    <View style={styles.pickerOverlay}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.sheetHandle} />
        <AppText variant="label" muted style={styles.sheetTitle}>View data for</AppText>
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
          {rows.map((b, i) => {
            const on = (b.id || null) === (activeBranchId || null);
            return (
              <Pressable
                key={b.id || 'all'}
                onPress={() => onSelect(b.id)}
                style={[styles.branchRow, i > 0 && styles.branchDivider]}
              >
                <Ionicons
                  name={b.id ? 'business-outline' : 'globe-outline'}
                  size={18}
                  color={on ? colors.primary : colors.textMuted}
                />
                <AppText variant="body" weight={on ? 'bold' : 'semibold'} color={on ? colors.primary : colors.text} style={{ flex: 1 }}>
                  {b.name}
                </AppText>
                {on ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

function OwnerSidebar({ navigation, active, onClose }) {
  const insets = useSafeAreaInsets();
  const { user, organization, token, logout } = useAuth();
  const name = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || '—';
  const role = user?.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase().replace(/_/g, ' ') : '';
  const company = organization?.companyName || organization?.name || name;
  const subline = [name !== company ? name : null, role].filter(Boolean).join(' · ');

  // Live count for the Approvals sidebar badge (fetched when the drawer opens,
  // since this component only mounts then). The Approvals screen is one inbox over
  // two queues, so the badge sums both — ERP exceptions and driver bills.
  const enabled = apiConfigured() && !!token;
  const { data: pendingData } = useApi(
    () => billService.listBills({ status: 'PENDING' }),
    [],
    { enabled, fallback: null },
  );
  const { data: pendingErpData } = useApi(
    () => approvalService.getApprovalsSummary(),
    [],
    { enabled, fallback: null },
  );
  const pendingBills = pendingCountOf(pendingData) + (Number(pendingErpData?.total) || 0);
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
            <View style={styles.brandLogo}><Ionicons name="cube" size={20} color={colors.white} /></View>
            <View>
              <AppText variant="bodyStrong" weight="extrabold" color={colors.white}>{company}</AppText>
              {subline ? <AppText variant="caption" color={colors.onPrimaryMuted}>{subline}</AppText> : null}
            </View>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.navScroll} showsVerticalScrollIndicator={false}>
          {OWNER_NAV.map((section) => (
            <View key={section.group} style={styles.section}>
              <AppText variant="label" muted style={styles.sectionLabel}>{section.group}</AppText>
              {section.items.map((item) => {
                const on = item.key === active;
                const badge = item.key === 'OwnerApprovals' ? (pendingBills || undefined) : item.badge;
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

          <Pressable onPress={() => { onClose(); confirmLogout(); }} style={styles.backItem}>
            <Ionicons name="log-out-outline" size={19} color={colors.textMuted} />
            <AppText variant="bodyStrong" weight="semibold" muted>Log out</AppText>
          </Pressable>
        </ScrollView>
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

  locBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 10,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },

  pickerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 120 },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 16, paddingTop: 8,
  },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 8 },
  sheetTitle: { marginLeft: 8, marginBottom: 6 },
  branchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, paddingVertical: 14 },
  branchDivider: { borderTopWidth: 1, borderTopColor: colors.border },

  overlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', zIndex: 100 },
  panel: { width: 300, maxWidth: '84%', backgroundColor: colors.surface },
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
  backItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12, marginTop: 4, borderTopWidth: 1, borderTopColor: colors.border },
});
