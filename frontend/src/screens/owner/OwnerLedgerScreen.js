import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Card, colors } from '../../components/ui';
import OwnerShell from './OwnerShell';
import { LedgerRow, FilterChips, SectionHeader, Loading, EmptyState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import ownerService from '../../services/ownerService';

/** O10 · Company ledger — every movement, in order. */
export default function OwnerLedgerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('All');

  // Company ledger — real API only.
  const { token } = useAuth();
  const useReal = apiConfigured() && !!token;
  const { data: ledgerApi, loading: ledgerLoading } = useApi(
    () => ownerService.getLedgerEntries(),
    [],
    { enabled: useReal, fallback: [] },
  );

  // Normalise defensively — a flat feed maps into "This week"; if the API
  // groups rows under week/earlier we use that. Unknown fields fall back.
  const l = useMemo(() => {
    const fmt = (v) => `₹${Number(v).toLocaleString('en-IN')}`;
    const mapRow = (e) => {
      const amt = e?.amount ?? e?.delta;
      const credit = /cred/i.test(String(e?.direction || e?.dir || e?.type || ''))
        || (amt != null && Number(amt) >= 0);
      const bal = e?.runningBalance ?? e?.balance;
      return {
        title: e?.title || e?.description || e?.narration || 'Entry', // mapping to confirm
        meta: e?.meta || e?.remarks || e?.date || '', // mapping to confirm
        delta: amt != null
          ? `${credit ? '+' : '−'}₹${Math.abs(Number(amt)).toLocaleString('en-IN')}`
          : '—',
        dir: e?.dir || (credit ? 'credit' : 'debit'),
        balance: bal != null ? fmt(bal) : '', // mapping to confirm
      };
    };
    const rows = Array.isArray(ledgerApi)
      ? ledgerApi
      : (ledgerApi?.entries || ledgerApi?.results || ledgerApi?.rows || ledgerApi?.items || ledgerApi?.data || []);
    return {
      closing: ledgerApi?.closing != null ? fmt(ledgerApi.closing)
        : (ledgerApi?.closingBalance != null ? fmt(ledgerApi.closingBalance) : '—'), // mapping to confirm
      moneyIn: ledgerApi?.moneyIn != null ? `In ${fmt(ledgerApi.moneyIn)}`
        : (ledgerApi?.totalIn != null ? `In ${fmt(ledgerApi.totalIn)}` : '—'), // mapping to confirm
      moneyOut: ledgerApi?.moneyOut != null ? `Out ${fmt(ledgerApi.moneyOut)}`
        : (ledgerApi?.totalOut != null ? `Out ${fmt(ledgerApi.totalOut)}` : '—'), // mapping to confirm
      week: Array.isArray(ledgerApi?.week) ? ledgerApi.week.map(mapRow) : rows.map(mapRow),
      earlier: Array.isArray(ledgerApi?.earlier) ? ledgerApi.earlier.map(mapRow) : [], // mapping to confirm
    };
  }, [ledgerApi]);

  const group = (rows) => (
    <Card padding={0} elevated="sm">
      {rows.map((e, i) => (
        <View key={`${e.title}-${i}`}>
          {i > 0 ? <View style={styles.divider} /> : null}
          <LedgerRow item={e} />
        </View>
      ))}
    </Card>
  );

  return (
    <OwnerShell title="Company ledger" subtitle="Sahayak Roadlines · Aug 2026" navigation={navigation} active="OwnerLedger"
      right={<View style={styles.exportPill}><AppText variant="caption" weight="bold" muted>Export</AppText></View>}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        <Card elevated="sm" padding={16}>
          <AppText variant="label" muted>Closing balance</AppText>
          <AppText mono weight="semibold" style={styles.big}>{l.closing}</AppText>
          <View style={styles.divider2} />
          <View style={styles.inout}>
            <AppText variant="small" mono weight="semibold" color={colors.success}>{l.moneyIn}</AppText>
            <AppText variant="small" mono weight="semibold" color={colors.error}>{l.moneyOut}</AppText>
          </View>
        </Card>

        <FilterChips options={['All', 'Money in', 'Money out']} value={filter} onChange={setFilter} />

        {ledgerLoading ? (
          <Loading />
        ) : (l.week.length === 0 && l.earlier.length === 0) ? (
          <EmptyState icon="receipt-outline" title="No ledger entries" message="Money moving in and out will show here as it happens." />
        ) : (
          <>
            <SectionHeader label="This week" />
            {group(l.week)}
            {l.earlier.length ? (
              <>
                <SectionHeader label="Earlier" />
                {group(l.earlier)}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </OwnerShell>
  );
}

const styles = StyleSheet.create({
  exportPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.background },
  scroll: { padding: 18, gap: 12 },
  big: { fontSize: 30, lineHeight: 34, marginVertical: 4 },
  divider2: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  inout: { flexDirection: 'row', justifyContent: 'space-between' },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 13 },
});
