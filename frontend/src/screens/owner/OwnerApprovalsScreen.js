import React, { useState, useMemo, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { AppText, Card, Button, TextField, BottomSheet, SegmentedControl, colors, spacing, radius } from '../../components/ui';
import OwnerShell from './OwnerShell';
import { Pill, FilterChips, Loading, EmptyState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import { useSubmit } from '../../hooks/useSubmit';
import billService from '../../services/billService';
import approvalService from '../../services/approvalService';
import { typeLabel, entityLabel, formatReason, requesterName, STATUS_TONE } from '../../constants/erpApprovals';

const CAT_TONE = { Other: 'purple', Repair: 'info', Toll: 'warning', Food: 'warning', Loading: 'purple', Parking: 'info' };

const rowsOf = (data) =>
  Array.isArray(data) ? data : (data?.results || data?.items || data?.rows || data?.data || []);

/**
 * O1 · Approvals — the owner's single decision inbox.
 *
 * Two queues live behind one screen, matching the two the web ERP splits across
 * /erp/approvals and /erp/bill-approvals:
 *   ERP   — exception approvals (manual rate, credit limit, advance over budget…)
 *   Bills — driver expense bills awaiting confirmation
 * The owner thinks "what needs my decision", not "which subsystem raised it", so
 * the tab is a filter rather than a separate nav entry.
 */
export default function OwnerApprovalsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('erp');
  const [filter, setFilter] = useState('All');

  const { token } = useAuth();
  const useReal = apiConfigured() && !!token;

  // ERP exception approvals.
  const { data: erpApi, loading: erpLoading, error: erpError, refetch: refetchErp } = useApi(
    () => approvalService.listApprovals({ status: 'PENDING', page: 1, limit: 50 }),
    [],
    { enabled: useReal, fallback: [] },
  );
  // Driver expense bills.
  const { data: billApi, loading: billLoading, error: billError, refetch: refetchBills } = useApi(
    () => billService.listBills({ status: 'PENDING' }),
    [],
    { enabled: useReal, fallback: [] },
  );

  const refetchAll = useCallback(() => { refetchErp(); refetchBills(); }, [refetchErp, refetchBills]);
  useFocusEffect(useCallback(() => { if (useReal) refetchAll(); }, [useReal, refetchAll]));

  // /erp/approvals → { _id, type, entityType, entityLabel, reason, requestedBy, status, createdAt }
  const erpRows = useMemo(() => rowsOf(erpApi).map((a) => ({
    id: a?._id,
    raw: a,
    title: typeLabel(a?.type),
    entity: a?.entityLabel || entityLabel(a?.entityType),
    reason: formatReason(a?.reason),
    requester: requesterName(a),
    status: a?.status || 'PENDING',
    date: a?.createdAt ? dayjs(a.createdAt).format('DD MMM') : '',
  })), [erpApi]);

  // /app/v1/bills → { _id, driver, title/category, amount, expenseDate, description }
  const billRows = useMemo(() => rowsOf(billApi).map((r, i) => ({
    id: r?._id || r?.id || String(i),
    name: r?.driver?.name
      || [r?.driver?.firstName, r?.driver?.lastName].filter(Boolean).join(' ')
      || r?.driverName
      || 'Driver',
    category: (r?.title || r?.category || '').replace(/ bill$/i, '') || 'Bill',
    plate: r?.vehicle?.registrationNumber || '',
    date: r?.expenseDate ? dayjs(r.expenseDate).format('DD MMM') : '',
    desc: r?.description || '',
    amountNum: Number(r?.amount) || 0,
    amount: `₹${(Number(r?.amount) || 0).toLocaleString('en-IN')}`,
  })), [billApi]);

  // Chip filters apply to the bills queue only (ERP rows have no single amount).
  const shownBills = useMemo(() => {
    if (filter === 'Today') return billRows.filter((b) => b.date === dayjs().format('DD MMM'));
    if (filter === 'Above ₹2,000') return billRows.filter((b) => b.amountNum > 2000);
    return billRows;
  }, [billRows, filter]);

  const erpCount = erpRows.length;
  const billCount = billRows.length;
  const total = erpCount + billCount;

  const loading = tab === 'erp' ? erpLoading : billLoading;
  const error = tab === 'erp' ? erpError : billError;

  // ── Decision sheet (ERP approvals) ────────────────────────────────────────
  const [active, setActive] = useState(null);
  const [mode, setMode] = useState(null); // 'APPROVED' | 'REJECTED'
  const [remarks, setRemarks] = useState('');
  const { submit, busy, error: submitError, setError: setSubmitError } = useSubmit();

  const openSheet = (row) => { setActive(row); setMode(null); setRemarks(''); setSubmitError(null); };
  const closeSheet = () => { setActive(null); setMode(null); setRemarks(''); setSubmitError(null); };

  // Rejection remarks are required, min 3 chars — same rule the backend
  // validator enforces (erpApproval.validation.js). Blocking here saves a round trip.
  const rejectNeedsRemarks = mode === 'REJECTED' && remarks.trim().length < 3;

  const decide = () => {
    if (!active || !mode || rejectNeedsRemarks) return;
    submit(
      () => approvalService.decideApproval(active.id, mode, remarks.trim() || undefined),
      { onSuccess: () => { closeSheet(); refetchAll(); } },
    );
  };

  return (
    <OwnerShell
      title="Approvals"
      subtitle={total ? `${total} waiting on a decision` : 'Nothing waiting on a decision'}
      navigation={navigation}
      active="OwnerApprovals"
      right={<View style={styles.countPill}><AppText mono weight="bold" color={colors.white}>{total}</AppText></View>}
    >
      <View style={styles.wrap}>
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

        {tab === 'bills' ? (
          <FilterChips options={['All', 'Today', 'Above ₹2,000']} value={filter} onChange={setFilter} style={styles.chips} />
        ) : null}

        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetchAll} tintColor={colors.primary} />}>
          {loading ? (
            <Loading />
          ) : error ? (
            <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetchAll} />
          ) : tab === 'erp' ? (
            erpRows.length === 0 ? (
              <EmptyState icon="checkmark-done-outline" title="No approvals" message="Rate overrides, credit-limit breaches and over-budget advances land here for your decision." />
            ) : (
              erpRows.map((a) => (
                <Card key={a.id} elevated="sm" padding={12} onPress={() => openSheet(a)} style={styles.erpRow}>
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
              ))
            )
          ) : shownBills.length === 0 ? (
            <EmptyState icon="receipt-outline" title="No bills to confirm" message="Bills waiting for your confirmation will show up here." />
          ) : (
            shownBills.map((b) => (
              <Card key={b.id} elevated="sm" padding={12} onPress={() => navigation.navigate('OwnerBillDetail', { id: b.id })} style={styles.row}>
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

      <BottomSheet visible={!!active} onClose={closeSheet}>
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

            <AppText variant="caption" muted>Raised by {active.requester}{active.date ? ` · ${active.date}` : ''}</AppText>

            {mode === 'REJECTED' ? (
              <TextField
                label="Reason for rejection"
                value={remarks}
                onChangeText={setRemarks}
                placeholder="Tell the requester what to fix"
                multiline
              />
            ) : null}

            {submitError ? <AppText variant="small" color={colors.error}>{submitError}</AppText> : null}

            <View style={styles.sheetActions}>
              {mode === null ? (
                <>
                  <Button variant="secondary" label="Reject" onPress={() => setMode('REJECTED')} style={{ flex: 1 }} fullWidth={false} />
                  <Button label="Approve" onPress={() => { setMode('APPROVED'); }} style={{ flex: 1 }} fullWidth={false} />
                </>
              ) : (
                <>
                  <Button variant="secondary" label="Back" onPress={() => { setMode(null); setRemarks(''); setSubmitError(null); }} style={{ flex: 1 }} fullWidth={false} disabled={busy} />
                  <Button
                    label={mode === 'APPROVED' ? 'Confirm approve' : 'Confirm reject'}
                    onPress={decide}
                    loading={busy}
                    disabled={busy || rejectNeedsRemarks}
                    style={{ flex: 1 }}
                    fullWidth={false}
                  />
                </>
              )}
            </View>
          </View>
        ) : null}
      </BottomSheet>
    </OwnerShell>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  countPill: { minWidth: 30, height: 30, paddingHorizontal: 9, borderRadius: 15, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  tabs: { paddingHorizontal: 18, paddingTop: 12 },
  chips: { paddingHorizontal: 18, paddingTop: 12 },
  scroll: { padding: 18, paddingTop: 12, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  erpRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: { width: 52, height: 62, borderRadius: 10, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  sheet: { gap: 10, paddingTop: 4 },
  reasonBox: { backgroundColor: colors.background, borderRadius: radius.md, padding: 12, gap: 8 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
});
