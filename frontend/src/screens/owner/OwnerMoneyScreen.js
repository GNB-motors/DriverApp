import React, { useState, useMemo } from 'react';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card, SegmentedControl, colors, spacing, radius } from '../../components/ui';
import OwnerShell from './OwnerShell';
import { Monogram, Pill, SectionHeader, Loading, EmptyState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import ownerService from '../../services/ownerService';
import advanceService from '../../services/advanceService';

const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
const rowsOf = (data) =>
  Array.isArray(data) ? data : (data?.results || data?.items || data?.rows || data?.data || []);

const initialsOf = (name) =>
  name ? name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() : '—';

const AGEING_TONE = { CURRENT: 'success', DUE_SOON: 'warning', OVERDUE: 'rejected' };

/** O5 · Money — what you owe drivers (To pay) and what customers owe you (To collect). */
export default function OwnerMoneyScreen({ navigation }) {
  usePreventScreenCapture(); // block screenshots/recording of payables/receivables
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('pay');

  const { token } = useAuth();
  const useReal = apiConfigured() && !!token;

  // To pay — driver khata balances.
  const { data: khataApi, loading: khataLoading, error: khataError, refetch: refetchKhata } = useApi(
    () => ownerService.listKhataDrivers(),
    [],
    { enabled: useReal, fallback: [] },
  );
  // To collect — outstanding sale bills.
  const { data: outApi, loading: outLoading, error: outError, refetch: refetchOut } = useApi(
    () => ownerService.listOutstanding({ view: 'ALL', limit: 50 }),
    [],
    { enabled: useReal, fallback: [] },
  );
  // Advances awaiting a decision — the card is hidden when there are none.
  const { data: advApi, refetch: refetchAdv } = useApi(
    () => advanceService.listAdvances({ status: 'PENDING_APPROVAL' }),
    [],
    { enabled: useReal, fallback: [] },
  );

  const refetch = () => { refetchKhata(); refetchOut(); refetchAdv(); };

  // /khata/drivers → { results: [{ _id, firstName, lastName, mobileNumber, totalAmount, entryCount }] }
  const pay = useMemo(() => {
    let total = 0;
    const list = rowsOf(khataApi).map((r) => {
      const name = [r?.firstName, r?.lastName].filter(Boolean).join(' ') || r?.name || 'Driver';
      const bal = Number(r?.totalAmount) || 0;
      total += bal;
      const entries = Number(r?.entryCount) || 0;
      return {
        _id: r?._id,
        initials: initialsOf(name),
        name,
        meta: [r?.mobileNumber, entries ? `${entries} ${entries === 1 ? 'entry' : 'entries'}` : null]
          .filter(Boolean).join(' · '),
        amount: money(bal),
      };
    });
    return { total, list };
  }, [khataApi]);

  // /erp/sale-bills/outstanding → [{ billNumber, partyName, outstandingAmount, overdueDays, ageingBucket }]
  const collect = useMemo(() => {
    let total = 0;
    const list = rowsOf(outApi).map((r) => {
      const amt = Number(r?.outstandingAmount) || 0;
      total += amt;
      const overdue = Number(r?.overdueDays) || 0;
      const party = r?.partyName || '—';
      return {
        _id: r?.billId || r?.billNumber,
        initials: initialsOf(party),
        name: party,
        meta: [r?.billNumber, overdue > 0 ? `${overdue}d overdue` : null].filter(Boolean).join(' · '),
        amount: money(amt),
        bucket: r?.ageingBucket,
      };
    });
    return { total, list };
  }, [outApi]);

  const advanceCount = rowsOf(advApi).length;
  const advanceTotal = rowsOf(advApi).reduce((s, a) => s + (Number(a?.amount) || 0), 0);

  const active = tab === 'pay' ? pay : collect;
  const loading = tab === 'pay' ? khataLoading : outLoading;
  const error = tab === 'pay' ? khataError : outError;
  const isEmpty = active.list.length === 0;

  const heroLabel = tab === 'pay' ? 'Owed to drivers' : 'Owed by customers';
  const heroSub = active.list.length
    ? (tab === 'pay'
        ? `across ${active.list.length} ${active.list.length === 1 ? 'driver' : 'drivers'}`
        : `across ${active.list.length} ${active.list.length === 1 ? 'bill' : 'bills'}`)
    : '';

  return (
    <OwnerShell title="Money" navigation={navigation} active="OwnerMoney">
      <View style={{ flex: 1 }}>
        <View style={styles.top}>
          <SegmentedControl
            variant="pill"
            options={[{ label: 'To pay', value: 'pay' }, { label: 'To collect', value: 'collect' }]}
            value={tab}
            onChange={setTab}
          />
        </View>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />}>
          {loading ? (
            <Loading />
          ) : error ? (
            <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} />
          ) : isEmpty ? (
            <EmptyState
              icon="cash-outline"
              title={tab === 'pay' ? 'No drivers yet' : 'Nothing to collect'}
              message={tab === 'pay'
                ? 'Drivers you settle with will appear here with what you owe them.'
                : 'Unpaid customer invoices will appear here as they age.'}
            />
          ) : (
            <>
              <Card elevated="sm" padding={16}>
                <AppText variant="label" muted>{heroLabel}</AppText>
                <AppText mono weight="semibold" style={styles.big}>{money(active.total)}</AppText>
                {heroSub ? <AppText variant="small" muted>{heroSub}</AppText> : null}
              </Card>

              <SectionHeader label={tab === 'pay' ? 'By driver' : 'By bill'} />
              <Card padding={0} elevated="sm">
                {active.list.map((d, i) => (
                  <Pressable
                    key={d._id || i}
                    onPress={tab === 'pay'
                      ? () => navigation.navigate('OwnerDriver', { driverId: d._id, name: d.name, mobile: d.meta })
                      : () => navigation.navigate('OwnerSaleBills')}
                    style={[styles.driver, i > 0 && styles.divider]}
                  >
                    <Monogram initials={d.initials} size={40} />
                    <View style={{ flex: 1, gap: 3 }}>
                      <AppText variant="bodyStrong" weight="bold" numberOfLines={1}>{d.name}</AppText>
                      {d.meta ? <AppText variant="caption" mono muted numberOfLines={1}>{d.meta}</AppText> : null}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <AppText mono variant="bodyStrong" weight="semibold">{d.amount}</AppText>
                      {d.bucket ? <Pill tone={AGEING_TONE[d.bucket] || 'neutral'} label={d.bucket.replace(/_/g, ' ')} /> : null}
                    </View>
                  </Pressable>
                ))}
              </Card>

              {advanceCount > 0 ? (
                <Pressable onPress={() => navigation.navigate('OwnerApprovals')}>
                  <Card elevated="sm" padding={14} style={styles.advRow}>
                    <View style={styles.advIcon}><Ionicons name="add" size={20} color={colors.warning} /></View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyStrong" weight="bold">
                        {advanceCount} advance {advanceCount === 1 ? 'request' : 'requests'}
                      </AppText>
                      <AppText variant="caption" muted>{money(advanceTotal)} awaiting approval</AppText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#B4B4BC" />
                  </Card>
                </Pressable>
              ) : null}
            </>
          )}
        </ScrollView>

        {tab === 'pay' ? (
          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
            <Button size="lg" label="Settle a driver" onPress={() => navigation.navigate('OwnerDriver')} />
          </View>
        ) : null}
      </View>
    </OwnerShell>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 18, paddingTop: 12 },
  scroll: { padding: 18, paddingTop: 12, gap: 12, paddingBottom: 90 },
  big: { fontSize: 30, lineHeight: 34, marginVertical: 4 },
  driver: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  advRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  advIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.pendingBg, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 10, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});
