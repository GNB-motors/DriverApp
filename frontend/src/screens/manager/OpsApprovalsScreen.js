import React, { useState, useMemo, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { AppText, Card, BottomSheet, SegmentedControl, colors, radius } from '../../components/ui';
import ManagerShell from './ManagerShell';
import { Pill, Loading, EmptyState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import billService from '../../services/billService';
import approvalService from '../../services/approvalService';
import { typeLabel, entityLabel, formatReason, requesterName, STATUS_TONE } from '../../constants/erpApprovals';

const CAT_TONE = { Other: 'purple', Repair: 'info', Toll: 'warning', Food: 'warning', Loading: 'purple', Parking: 'info' };

const rowsOf = (data) =>
  Array.isArray(data) ? data : (data?.results || data?.items || data?.rows || data?.data || []);

/**
 * Roles the backend lets decide an ERP approval
 * (erpApproval.routes.js DECIDERS). MANAGER can read the queue but not act on
 * it, so the sheet stays read-only for them rather than offering a button that
 * would come back 403.
 */
const ERP_DECIDERS = ['OWNER', 'APPROVER', 'SUPER_ADMIN'];

/**
 * M4 · Approvals — the ops decision inbox.
 *
 * Two queues, matching the two the web ERP splits across /erp/approvals and
 * /erp/bill-approvals. This screen previously queried only the driver-bill feed,
 * so the ERP approvals counted on Ops home never appeared here.
 */
export default function OpsApprovalsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('erp');

  const { token, user } = useAuth();
  const useReal = apiConfigured() && !!token;
  const canDecideErp = ERP_DECIDERS.includes(user?.role);

  const { data: erpApi, loading: erpLoading, error: erpError, refetch: refetchErp } = useApi(
    () => approvalService.listApprovals({ status: 'PENDING', page: 1, limit: 50 }),
    [],
    { enabled: useReal, fallback: [] },
  );
  const { data: billApi, loading: billLoading, error: billError, refetch: refetchBills } = useApi(
    () => billService.listBills({ status: 'PENDING' }),
    [],
    { enabled: useReal, fallback: [] },
  );

  const refetchAll = useCallback(() => { refetchErp(); refetchBills(); }, [refetchErp, refetchBills]);
  useFocusEffect(useCallback(() => { if (useReal) refetchAll(); }, [useReal, refetchAll]));

  const erpRows = useMemo(() => rowsOf(erpApi).map((a) => ({
    key: a?._id,
    title: typeLabel(a?.type),
    entity: a?.entityLabel || entityLabel(a?.entityType),
    reason: formatReason(a?.reason),
    requester: requesterName(a),
    status: a?.status || 'PENDING',
    date: a?.createdAt ? dayjs(a.createdAt).format('DD MMM') : '',
  })), [erpApi]);

  const billRows = useMemo(() => rowsOf(billApi).map((r, i) => ({
    key: r?._id || String(i),
    name: r?.driver?.name || 'Driver',
    category: (r?.title || r?.category || '').replace(/ bill$/i, '') || 'Bill',
    plate: r?.vehicle?.registrationNumber || '',
    date: r?.expenseDate ? dayjs(r.expenseDate).format('DD MMM') : '',
    desc: r?.description || '',
    amount: `₹${(Number(r?.amount) || 0).toLocaleString('en-IN')}`,
  })), [billApi]);

  const erpCount = erpRows.length;
  const billCount = billRows.length;
  const total = erpCount + billCount;

  const loading = tab === 'erp' ? erpLoading : billLoading;
  const error = tab === 'erp' ? erpError : billError;

  const [active, setActive] = useState(null);

  return (
    <ManagerShell
      title="Approvals"
      subtitle={total ? `${total} waiting on a decision` : 'Nothing waiting on a decision'}
      navigation={navigation}
      active="OpsApprovals"
      right={total ? <View style={styles.count}><AppText mono weight="bold" color={colors.white}>{total}</AppText></View> : null}
    >
      <View style={{ flex: 1 }}>
        <View style={styles.tabs}>
          <SegmentedControl
            variant="pill"
            options={[
              { label: 'ERP', value: 'erp', badge: erpCount ? String(erpCount) : undefined },
              { label: 'Bills', value: 'bills', badge: billCount ? String(billCount) : undefined },
            ]}
            value={tab}
            onChange={setTab}
          />
        </View>

        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetchAll} tintColor={colors.primary} />}>
          {loading ? (
            <Loading />
          ) : error ? (
            <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetchAll} />
          ) : tab === 'erp' ? (
            erpRows.length === 0 ? (
              <EmptyState icon="checkmark-done-outline" title="No approvals" message="Rate overrides, credit-limit breaches and over-budget advances appear here." />
            ) : (
              <>
                {!canDecideErp ? (
                  <View style={styles.notice}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.infoText} />
                    <AppText variant="caption" color={colors.infoText} style={{ flex: 1 }}>
                      Ops can review these — the owner records the decision.
                    </AppText>
                  </View>
                ) : null}
                {erpRows.map((a) => (
                  <Card key={a.key} elevated="sm" padding={12} onPress={() => setActive(a)} style={styles.erpRow}>
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={styles.metaRow}>
                        <AppText variant="bodyStrong" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>{a.title}</AppText>
                        <Pill tone={STATUS_TONE[a.status] || 'neutral'} label={a.status} />
                      </View>
                      <AppText variant="caption" mono muted numberOfLines={1}>{a.entity}</AppText>
                      {a.reason.length ? (
                        <AppText variant="caption" muted numberOfLines={2}>
                          {a.reason.slice(0, 2).map((r) => `${r.label}: ${r.value}`).join(' · ')}
                        </AppText>
                      ) : null}
                      <View style={styles.metaRow}>
                        <AppText variant="caption" muted numberOfLines={1}>{a.requester}</AppText>
                        {a.date ? <AppText variant="caption" mono muted>{a.date}</AppText> : null}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#B4B4BC" />
                  </Card>
                ))}
              </>
            )
          ) : billRows.length === 0 ? (
            <EmptyState icon="receipt-outline" title="No bills to confirm" message="Bills a driver submits will appear here for you to confirm." />
          ) : (
            billRows.map((b) => (
              <Card key={b.key} elevated="sm" padding={12} onPress={() => navigation.navigate('OwnerBillDetail', { id: b.key })} style={styles.row}>
                <View style={styles.thumb}>
                  <Ionicons name="document-text-outline" size={18} color={colors.textMuted} />
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <AppText variant="bodyStrong" weight="bold">{b.name}</AppText>
                  <View style={styles.metaRow}>
                    <Pill tone={CAT_TONE[b.category] || 'neutral'} label={b.category} />
                    {b.plate ? <AppText variant="caption" mono muted>{b.plate}</AppText> : null}
                    {b.date ? <AppText variant="caption" mono muted>{b.date}</AppText> : null}
                  </View>
                  {b.desc ? <AppText variant="caption" muted numberOfLines={1}>{b.desc}</AppText> : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <AppText mono variant="bodyStrong" weight="semibold">{b.amount}</AppText>
                  <Ionicons name="chevron-forward" size={16} color="#B4B4BC" />
                </View>
              </Card>
            ))
          )}
        </ScrollView>
      </View>

      <BottomSheet visible={!!active} onClose={() => setActive(null)}>
        {active ? (
          <View style={styles.sheet}>
            <AppText variant="h3" weight="bold">{active.title}</AppText>
            <AppText variant="small" mono muted>{active.entity}</AppText>
            {active.reason.length ? (
              <View style={styles.reasonBox}>
                {active.reason.map((r) => (
                  <View key={r.key} style={styles.reasonRow}>
                    <AppText variant="small" muted>{r.label}</AppText>
                    <AppText variant="small" mono weight="semibold">{r.value}</AppText>
                  </View>
                ))}
              </View>
            ) : null}
            <AppText variant="caption" muted>
              Raised by {active.requester}{active.date ? ` · ${active.date}` : ''}
            </AppText>
            <View style={styles.notice}>
              <Ionicons name="information-circle-outline" size={16} color={colors.infoText} />
              <AppText variant="caption" color={colors.infoText} style={{ flex: 1 }}>
                This decision is recorded by the owner.
              </AppText>
            </View>
          </View>
        ) : null}
      </BottomSheet>
    </ManagerShell>
  );
}

const styles = StyleSheet.create({
  count: { minWidth: 30, height: 30, paddingHorizontal: 9, borderRadius: 15, backgroundColor: colors.errorStrong, alignItems: 'center', justifyContent: 'center' },
  tabs: { paddingHorizontal: 18, paddingTop: 12 },
  scroll: { padding: 18, paddingTop: 12, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  erpRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: { width: 52, height: 62, borderRadius: 10, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.infoBg, borderRadius: radius.md, padding: 10 },
  sheet: { gap: 10, paddingTop: 4 },
  reasonBox: { backgroundColor: colors.background, borderRadius: radius.md, padding: 12, gap: 8 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
});
