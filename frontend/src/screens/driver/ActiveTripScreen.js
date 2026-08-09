/**
 * ActiveTripScreen.js
 *
 * Driver interface for managing their currently active ERP trip.
 * Stages 4, 5, 6, 7 are accessible here.
 *
 * Visual:
 * - 8-step pipeline progress indicator
 * - Advance card (if advance issued)
 * - Main action button (Upload Bilty, Submit POD, Close Trip) depending on state
 */

import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useErp } from '../../context/ErpContext';
import { useAuth } from '../../context/AuthContext';
import { fetchDriverAdvance } from '../../services/erpApi';
import { AppText, Card, Button, Badge, colors, spacing, fontFamily } from '../../components/ui';

// ── Pipeline Progress Component ─────────────────────────────────────────────
const STAGES = [
  'Request', 'DO', 'Placement', 'Bilty', 'Advance', 'Closed', 'POD', 'Unloaded'
];

function PipelineProgress({ currentStage = 1 }) {
  return (
    <View style={pipeStyles.container}>
      {STAGES.map((label, index) => {
        const stageNum = index + 1;
        const isActive = currentStage === stageNum;
        const isDone = currentStage > stageNum;
        return (
          <View key={stageNum} style={pipeStyles.nodeWrap}>
            <View style={[
              pipeStyles.node,
              isDone && pipeStyles.nodeDone,
              isActive && pipeStyles.nodeActive,
            ]}>
              {isDone ? (
                <Ionicons name="checkmark" size={12} color={colors.white} />
              ) : (
                <AppText variant="caption" weight="bold" color={isActive ? colors.white : colors.textMuted}>
                  {stageNum}
                </AppText>
              )}
            </View>
            <AppText variant="caption" weight={isActive ? 'bold' : 'medium'} muted={!isActive && !isDone} color={isActive ? colors.primary : undefined} style={pipeStyles.label}>
              {label}
            </AppText>
          </View>
        );
      })}
      {/* Progress Line */}
      <View style={pipeStyles.lineBg} />
      <View style={[pipeStyles.lineFill, { width: `${Math.min(100, Math.max(0, (currentStage - 1) * (100 / 7)))}%` }]} />
    </View>
  );
}

const pipeStyles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, position: 'relative' },
  lineBg: { position: 'absolute', top: 12, left: 10, right: 10, height: 2, backgroundColor: colors.border, zIndex: 0 },
  lineFill: { position: 'absolute', top: 12, left: 10, height: 2, backgroundColor: colors.primary, zIndex: 1 },
  nodeWrap: { alignItems: 'center', width: 44, zIndex: 2 },
  node: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  nodeActive: { backgroundColor: colors.primary, borderColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  nodeDone: { backgroundColor: colors.success, borderColor: colors.success },
  label: { marginTop: 6, fontSize: 9, textAlign: 'center' },
});

// ── Screen ──────────────────────────────────────────────────────────────────
export default function ActiveTripScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { activeTrip, isLoading, refetch } = useErp();
  const [advance, setAdvance] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (activeTrip?.pipelineStage >= 5) {
      fetchDriverAdvance(token).then(setAdvance).catch(() => {});
    }
  }, [activeTrip, token]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    if (activeTrip?.pipelineStage >= 5) {
      await fetchDriverAdvance(token).catch(() => {});
    }
    setRefreshing(false);
  };

  if (!activeTrip) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
          <AppText variant="h2" weight="extrabold">Active Trip</AppText>
        </View>
        <View style={styles.empty}>
          <Ionicons name="map-outline" size={64} color={colors.border} />
          <AppText variant="body" weight="bold" color={colors.textMuted} style={{ marginTop: 16 }}>No active trip found</AppText>
        </View>
      </View>
    );
  }

  const { pipelineStage, lrNumber, source, destination, placement } = activeTrip;
  const cns = activeTrip.consignments || [];
  const pods = activeTrip.pods || [];
  
  // Determine actionable state
  const canUploadBilty = pipelineStage === 3;
  const canCloseTrip = pipelineStage >= 4 && pipelineStage < 6;
  const canSubmitPod = pipelineStage === 6;

  return (
    <View style={styles.flex}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="h2" weight="extrabold">Trip Tracker</AppText>
          <AppText variant="small" muted>LR: {lrNumber || 'Pending'}</AppText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} />}
      >
        <Card elevated="sm" padding={20} style={{ marginBottom: 16 }}>
          <AppText variant="h3" weight="bold" color={colors.primaryDeep} style={{ marginBottom: 18 }}>
            {source}  <Ionicons name="arrow-forward" size={16} />  {destination}
          </AppText>
          
          <PipelineProgress currentStage={pipelineStage} />

          {canUploadBilty && (
            <Button
              label="Upload Bilty (CN)"
              iconRight="document-attach"
              onPress={() => navigation.navigate('CnUpload')}
              style={{ marginTop: 12 }}
            />
          )}

          {canCloseTrip && (
            <Button
              label="End Trip (Unload)"
              iconRight="flag"
              onPress={() => navigation.navigate('TripClose', { tripId: activeTrip._id })}
              style={{ marginTop: 12 }}
              variant="outline"
            />
          )}

          {canSubmitPod && (
            <Button
              label="Submit POD"
              iconRight="mail-open"
              onPress={() => navigation.navigate('PodSubmit')}
              style={{ marginTop: 12 }}
            />
          )}
        </Card>

        {/* Advance Card */}
        {advance && (
          <Card elevated="sm" padding={16} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <AppText variant="label" muted>TRIP ADVANCE</AppText>
              <Badge tone="success" label="Issued" />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <AppText variant="h1" weight="extrabold" mono>₹{advance.amount.toLocaleString('en-IN')}</AppText>
            </View>
            <AppText variant="small" muted style={{ marginTop: 4 }}>
              Via {advance.paymentMode} on {dayjs(advance.date).format('DD MMM YYYY')}
            </AppText>
          </Card>
        )}

        {/* Info Rows */}
        <Card padding={16} style={{ marginBottom: 16 }}>
          <InfoRow label="Placement Date" value={placement?.placementDate ? dayjs(placement.placementDate).format('DD MMM, hh:mm A') : '—'} />
          <InfoRow label="Supplier" value={placement?.supplier?.name || '—'} />
          <InfoRow label="Fixed Freight" value={placement?.fixedFreight ? `₹${placement.fixedFreight.toLocaleString()}` : '—'} />
          <InfoRow label="Consignments" value={cns.length > 0 ? `${cns.length} uploaded` : 'None yet'} />
          <InfoRow label="PODs" value={pods.length > 0 ? `${pods.length} submitted` : 'None yet'} border={false} />
        </Card>

      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, border = true }) {
  return (
    <View style={[styles.infoRow, border && styles.infoRowBorder]}>
      <AppText variant="small" muted weight="medium">{label}</AppText>
      <AppText variant="bodyStrong" weight="bold">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 22, paddingBottom: 16, backgroundColor: colors.surface },
  backBtn: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 22, paddingBottom: 40 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
});
