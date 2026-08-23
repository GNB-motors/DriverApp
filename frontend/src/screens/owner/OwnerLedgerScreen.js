import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { AppText, Card, colors } from '../../components/ui';
import OwnerShell from './OwnerShell';
import { LedgerRow, FilterChips, SectionHeader, Loading, EmptyState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import ownerService from '../../services/ownerService';

const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

/**
 * O10 · Company ledger — every movement, in order.
 *
 * Uses the ERP's own vocabulary (debit / credit) rather than "money in / out":
 * the feed mixes PARTY, VENDOR and SUPPLIER accounts, where the same credit means
 * opposite things, so a directional label would be wrong half the time. This
 * matches the web ErpLedger statement columns.
 */
export default function OwnerLedgerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('All');

  const { token, organization } = useAuth();
  const useReal = apiConfigured() && !!token;
  const { data: ledgerApi, loading: ledgerLoading, error, refetch } = useApi(
    () => ownerService.getLedgerEntries({ limit: 100 }),
    [],
    { enabled: useReal, fallback: null },
  );

  // /erp/ledger/entries → { entries: [{ entryDate, sourceLabel, narration, debit,
  // credit, balanceAfter, accountName, accountCode }], totals: { debit, credit } }
  const l = useMemo(() => {
    const entries = Array.isArray(ledgerApi?.entries) ? ledgerApi.entries : [];
    const totals = ledgerApi?.totals || {};

    const mapRow = (e) => {
      const debit = Number(e?.debit) || 0;
      const credit = Number(e?.credit) || 0;
      const isCredit = credit > 0;
      const amt = isCredit ? credit : debit;
      const bal = e?.balanceAfter;
      return {
        dir: isCredit ? 'credit' : 'debit',
        title: e?.narration || e?.sourceLabel || e?.sourceType || 'Entry',
        meta: [e?.accountName, e?.sourceLabel, e?.entryDate ? dayjs(e.entryDate).format('DD MMM') : null]
          .filter(Boolean).join(' · '),
        delta: `${isCredit ? '+' : '−'}${money(amt)}`,
        balance: bal != null ? money(bal) : '',
        _date: e?.entryDate,
        _isCredit: isCredit,
      };
    };

    const rows = entries.map(mapRow).filter((r) => {
      if (filter === 'Credit') return r._isCredit;
      if (filter === 'Debit') return !r._isCredit;
      return true;
    });

    // Split on actual dates rather than assuming the feed is one week long.
    const weekAgo = dayjs().subtract(7, 'day');
    const week = rows.filter((r) => r._date && dayjs(r._date).isAfter(weekAgo));
    const earlier = rows.filter((r) => !r._date || !dayjs(r._date).isAfter(weekAgo));

    const debit = Number(totals.debit) || 0;
    const credit = Number(totals.credit) || 0;

    return {
      net: money(credit - debit),
      netPositive: credit - debit >= 0,
      debit: money(debit),
      credit: money(credit),
      week,
      earlier,
      count: rows.length,
    };
  }, [ledgerApi, filter]);

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

  const subtitle = [organization?.companyName, dayjs().format('MMM YYYY')].filter(Boolean).join(' · ');

  return (
    <OwnerShell title="Company ledger" subtitle={subtitle} navigation={navigation} active="OwnerLedger">
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={ledgerLoading} onRefresh={refetch} tintColor={colors.primary} />}>
        <Card elevated="sm" padding={16}>
          <AppText variant="label" muted>Net movement</AppText>
          <AppText weight="bold" color={l.netPositive ? colors.success : colors.error} style={styles.big}>{l.net}</AppText>
          <View style={styles.divider2} />
          <View style={styles.inout}>
            <View style={{ gap: 2 }}>
              <AppText variant="caption" muted>Credit</AppText>
              <AppText variant="small" weight="bold" color={colors.success}>{l.credit}</AppText>
            </View>
            <View style={{ gap: 2, alignItems: 'flex-end' }}>
              <AppText variant="caption" muted>Debit</AppText>
              <AppText variant="small" weight="bold" color={colors.error}>{l.debit}</AppText>
            </View>
          </View>
        </Card>

        <FilterChips options={['All', 'Credit', 'Debit']} value={filter} onChange={setFilter} />

        {ledgerLoading ? (
          <Loading />
        ) : error ? (
          <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} />
        ) : l.count === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title={filter === 'All' ? 'No ledger entries' : `No ${filter.toLowerCase()} entries`}
            message={filter === 'All'
              ? 'Money moving in and out will show here as it happens.'
              : 'Try a different filter.'}
          />
        ) : (
          <>
            {l.week.length ? (
              <>
                <SectionHeader label="This week" />
                {group(l.week)}
              </>
            ) : null}
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
  scroll: { padding: 18, gap: 12 },
  big: { fontSize: 30, lineHeight: 36, marginVertical: 4 },
  divider2: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  inout: { flexDirection: 'row', justifyContent: 'space-between' },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 13 },
});
