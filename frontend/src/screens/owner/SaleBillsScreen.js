/**
 * SaleBillsScreen.js — Stage 9 invoices.
 *
 * GET /api/erp/sale-bills
 *
 * Amounts come from `netAmount` and `outstandingAmount`. There is no `grandTotal`
 * on the SaleBill schema — selecting it is what made every consumer render ₹0
 * before the backend fix, so it is deliberately not referenced here.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import useList from '../../hooks/useList';
import { fetchSaleBills } from '../../services/erpApi';
import ListScreen from '../../components/ListScreen';
import {
  AppText, Card, Badge, MoneyText, colors,
} from '../../components/ui';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ISSUED', label: 'Issued' },
  { value: 'PARTIALLY_PAID', label: 'Part-paid' },
  { value: 'PAID', label: 'Paid' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const TONE = {
  DRAFT: 'neutral',
  ISSUED: 'info',
  PARTIALLY_PAID: 'pending',
  PAID: 'valid',
  CANCELLED: 'expired',
};

const LABEL = {
  DRAFT: 'Draft',
  ISSUED: 'Issued',
  PARTIALLY_PAID: 'Part-paid',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
};

export default function SaleBillsScreen({ navigation }) {
  const list = useList(fetchSaleBills, { initial: { status: '' } });

  const outstanding = list.items.reduce(
    (sum, b) => sum + Number(b.outstandingAmount || 0), 0,
  );

  return (
    <ListScreen
      title="Sale Bills"
      subtitle={list.meta?.total ? `${list.meta.total} bills` : undefined}
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      list={list}
      filters={STATUS_FILTERS}
      filterKey="status"
      header={
        list.items.length > 0 && outstanding > 0 ? (
          <Card variant="tinted" padding={16} style={styles.totalCard}>
            <AppText variant="caption" muted weight="medium">OUTSTANDING (shown below)</AppText>
            <MoneyText amount={outstanding} variant="h1" weight="extrabold" />
          </Card>
        ) : null
      }
      renderItem={({ item }) => {
        const due = Number(item.outstandingAmount || 0);
        return (
          <Card padding={16} elevated="sm" style={styles.card}>
            <View style={styles.head}>
              <View style={styles.headText}>
                <AppText variant="bodyStrong" weight="extrabold" numberOfLines={1}>
                  {item.billNumber || '—'}
                </AppText>
                <AppText variant="caption" muted weight="medium" numberOfLines={1}>
                  {item.partyId?.name || '—'}
                  {item.billDate ? ` · ${dayjs(item.billDate).format('DD MMM YYYY')}` : ''}
                </AppText>
              </View>
              <Badge tone={TONE[item.status] || 'neutral'} label={LABEL[item.status] || item.status} />
            </View>

            <View style={styles.amounts}>
              <View>
                <AppText variant="caption" muted weight="medium">INVOICE TOTAL</AppText>
                <MoneyText amount={item.netAmount} variant="h3" weight="extrabold" />
              </View>
              <View style={styles.amountRight}>
                <AppText variant="caption" muted weight="medium">OUTSTANDING</AppText>
                <MoneyText
                  amount={due}
                  variant="bodyStrong"
                  weight="extrabold"
                  color={due > 0 ? colors.warning : colors.success}
                />
              </View>
            </View>
          </Card>
        );
      }}
      empty={{
        icon: 'receipt-outline',
        title: 'No sale bills',
        message: 'Nothing matches this filter.',
      }}
    />
  );
}

const styles = StyleSheet.create({
  totalCard: { marginBottom: 16 },
  card: { marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  headText: { flex: 1 },
  amounts: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  amountRight: { alignItems: 'flex-end' },
});
