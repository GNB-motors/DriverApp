/**
 * MyAdvancesScreen.js — what the driver has been advanced, and for which trip.
 *
 * GET /api/erp/advances/my — self-scoped. The backend deliberately returns only
 * the payout view (netPayable, deductions total, mode, paid date); the budget
 * breakdown that produced the figure is not exposed to drivers, so this screen
 * does not try to show it.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import useList from '../../hooks/useList';
import { fetchMyAdvances } from '../../services/erpApi';
import ListScreen from '../../components/ListScreen';
import {
  AppText, Card, Badge, MoneyText, colors,
} from '../../components/ui';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'PAID', label: 'Paid' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PENDING_APPROVAL', label: 'Awaiting approval' },
];

const STATUS_TONE = {
  PAID: 'valid',
  APPROVED: 'info',
  PENDING_APPROVAL: 'pending',
  CANCELLED: 'expired',
};

const STATUS_LABEL = {
  PAID: 'Paid',
  APPROVED: 'Approved',
  PENDING_APPROVAL: 'Awaiting approval',
  CANCELLED: 'Cancelled',
};

export default function MyAdvancesScreen({ navigation }) {
  const list = useList(fetchMyAdvances, { initial: { status: '' } });

  const paidTotal = list.items
    .filter((a) => a.status === 'PAID')
    .reduce((sum, a) => sum + Number(a.netPayable || 0), 0);

  return (
    <ListScreen
      title="My Advances"
      onBack={() => navigation.goBack()}
      list={list}
      filters={STATUS_FILTERS}
      filterKey="status"
      header={
        list.items.length > 0 ? (
          <Card variant="tinted" padding={16} style={styles.totalCard}>
            <AppText variant="caption" muted weight="medium">TOTAL RECEIVED (shown below)</AppText>
            <MoneyText amount={paidTotal} variant="h1" weight="extrabold" />
          </Card>
        ) : null
      }
      renderItem={({ item }) => {
        const trip = item.tripId;
        return (
          <Card padding={16} elevated="sm" style={styles.card}>
            <View style={styles.head}>
              <View style={styles.headText}>
                <AppText variant="bodyStrong" weight="extrabold" numberOfLines={1}>
                  {item.advanceNumber || '—'}
                </AppText>
                {trip ? (
                  <AppText variant="caption" muted weight="medium" numberOfLines={1}>
                    {trip.tripNumber} · {trip.fromLocation} → {trip.toLocation}
                  </AppText>
                ) : null}
              </View>
              <Badge
                tone={STATUS_TONE[item.status] || 'neutral'}
                label={STATUS_LABEL[item.status] || item.status}
              />
            </View>

            <View style={styles.amountRow}>
              <View>
                <AppText variant="caption" muted weight="medium">NET PAID</AppText>
                <MoneyText amount={item.netPayable} variant="h2" weight="extrabold" />
              </View>
              {Number(item.totalDeductions) > 0 ? (
                <View style={styles.deduction}>
                  <AppText variant="caption" muted weight="medium">DEDUCTIONS</AppText>
                  <MoneyText
                    amount={item.totalDeductions}
                    variant="bodyStrong"
                    weight="bold"
                    color={colors.warning}
                  />
                </View>
              ) : null}
            </View>

            <AppText variant="caption" muted style={styles.meta}>
              {item.paidAt
                ? `${item.paymentMode || 'Paid'} · ${dayjs(item.paidAt).format('DD MMM YYYY')}`
                : `Raised ${dayjs(item.createdAt).format('DD MMM YYYY')} · not yet paid`}
            </AppText>
          </Card>
        );
      }}
      empty={{
        icon: 'wallet-outline',
        title: 'No advances yet',
        message: 'Trip advances raised for you will appear here.',
      }}
    />
  );
}

const styles = StyleSheet.create({
  totalCard: { marginBottom: 16 },
  card: { marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  headText: { flex: 1 },
  amountRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  deduction: { alignItems: 'flex-end' },
  meta: { marginTop: 12, paddingTop: 11, borderTopWidth: 1, borderTopColor: colors.border },
});
