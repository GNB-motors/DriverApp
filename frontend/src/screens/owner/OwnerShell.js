import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, colors, spacing, radius } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useDrawer } from '../../context/DrawerContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import branchService from '../../services/branchService';
import { useNavigation } from '@react-navigation/native';

// Normalise a branches response + each row → { id, name }.
function normaliseBranches(data) {
  const rows = Array.isArray(data) ? data : (data?.results || data?.items || data?.rows || data?.data || []);
  return rows.map((b) => ({
    id: b?._id || b?.id,
    name: b?.name || b?.branchName || b?.label || b?.code || 'Branch',
  })).filter((b) => b.id);
}


export default function OwnerShell({ title, subtitle, navigation: navProp, right, active, children }) {
  const insets = useSafeAreaInsets();
  const { openDrawer, isOpen } = useDrawer();
  const [branchOpen, setBranchOpen] = useState(false);
  const navigation = useNavigation();

  const { token, activeBranchId, setActiveBranch } = useAuth();
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
        <Pressable onPress={openDrawer} hitSlop={10} style={styles.menuBtn} accessibilityLabel="Open menu">
          <Ionicons name="menu" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="h3" weight="extrabold" numberOfLines={1}>{title}</AppText>
          {subtitle ? <AppText variant="caption" mono muted numberOfLines={1}>{subtitle}</AppText> : null}
        </View>
        {right}
      </View>

      <Pressable style={styles.locBar} onPress={() => setBranchOpen(true)}>
        <Ionicons name="business" size={15} color={colors.primary} />
        <AppText variant="small" weight="bold" color={colors.primary} style={{ flex: 1 }}>
          {currentBranchLabel}
        </AppText>
        <Ionicons name="chevron-down" size={16} color={colors.primary} />
      </Pressable>

      <View style={styles.body}>
        {children}
        {branchOpen ? (
          <View style={styles.pickerOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setBranchOpen(false)} />
            <View style={[styles.sheet, { paddingBottom: 16 }]}>
              <AppText variant="label" muted style={styles.sheetTitle}>Active location</AppText>
              
              <Pressable onPress={() => { setActiveBranch(null); setBranchOpen(false); }} style={styles.branchRow}>
                <Ionicons name="business" size={20} color={!activeBranchId ? colors.primary : colors.textMuted} />
                <AppText variant="bodyStrong" weight={!activeBranchId ? 'bold' : 'semibold'} color={!activeBranchId ? colors.primary : colors.text} style={{ flex: 1 }}>
                  All branches
                </AppText>
                {!activeBranchId && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </Pressable>

              {branches.map((b) => {
                const on = activeBranchId === b.id;
                return (
                  <Pressable key={b.id} onPress={() => { setActiveBranch(b.id); setBranchOpen(false); }} style={[styles.branchRow, styles.branchDivider]}>
                    <Ionicons name="location-outline" size={20} color={on ? colors.primary : colors.textMuted} />
                    <AppText variant="bodyStrong" weight={on ? 'bold' : 'semibold'} color={on ? colors.primary : colors.text} style={{ flex: 1 }}>
                      {b.name}
                    </AppText>
                    {on && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>

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
  pickerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-start', zIndex: 120 },
  sheet: {
    backgroundColor: colors.surface, 
    borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
    paddingHorizontal: 16, paddingTop: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
  sheetTitle: { marginLeft: 8, marginBottom: 12 },
  branchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, paddingVertical: 14 },
  branchDivider: { borderTopWidth: 1, borderTopColor: colors.border },


});
