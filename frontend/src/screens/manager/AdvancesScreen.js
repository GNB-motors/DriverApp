/**
 * AdvancesScreen.js — the org's advance payments.
 *
 * GET /api/erp/advances. The previous version imported `fetchDriverAdvance` — a
 * driver-scoped call — for a manager-wide list, and its own comment admitted the
 * mismatch. This uses the org list endpoint with a status filter.
 *
 * Paying an advance is Owner/Manager/Accounts only (Ops Executive is excluded on
 * the backend), so the pay action is gated on `advances.pay`.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import { useAccess } from '../../context/AccessContext';
import useList from '../../hooks/useList';
import { fetchAdvances } from '../../services/erpApi';
import ListScreen from '../../components/ListScreen';
import {
  AppText, Card, Badge, MoneyText, colors,
} from '../../components/ui';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'PENDING_APPROVAL', label: 'Awaiting approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PAID', label: 'Paid' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const TONE = {
  PAID: 'valid',
  APPROVED: 'info',
  PENDING_APPROVAL: 'pending',
  CANCELLED: 'expired',
};

const LABEL = {
  PAID: 'Paid',
  APPROVED: 'Approved',
  PENDING_APPROVAL: 'Awaiting approval',
  CANCELLED: 'Cancelled',
};

export default function AdvancesScreen({ navigation }) {
  const { can } = useAccess();
  const list = useList(fetchAdvances, { initial: { status: '' } });

  return (
    <ListScreen
      title="Advances"
      subtitle={list.meta?.total ? `${list.meta.total} advances` : undefined}
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      list={list}
      filters={STATUS_FILTERS}
      filterKey="status"
      renderItem={({ item }) => {
        const trip = item.tripId;
        const payee = item.driverId
          ? [item.driverId.firstName, item.driverId.lastName].filter(Boolean).join(' ')
          : item.vendorId?.name;

        return (
          <Card
            padding={16}
            elevated="sm"
            style={styles.card}
            onPress={trip?._id ? () => navigation.navigate('TripDetail', { tripId: trip._id }) : undefined}
          >
            <View style={styles.head}>
              <View style={styles.headText}>
                <AppText variant="bodyStrong" weight="extrabold" numberOfLines={1}>
                  {item.advanceNumber || '—'}
                </AppText>
                <AppText variant="caption" muted weight="medium" numberOfLines={1}>
                  {payee || 'Unassigned'}
                  {trip?.tripNumber ? ` · ${trip.tripNumber}` : ''}
                </AppText>
              </View>
              <Badge tone={TONE[item.status] || 'neutral'} label={LABEL[item.status] || item.status} />
            </View>

            {trip ? (
              <AppText variant="small" weight="semibold" muted numberOfLines={1} style={styles.route}>
                {trip.fromLocation} → {trip.toLocation}
              </AppText>
            ) : null}

            <View style={styles.amounts}>
              <View>
                <AppText variant="caption" muted weight="medium">NET PAYABLE</AppText>
                <MoneyText amount={item.netPayable} variant="h3" weight="extrabold" />
              </View>
              {Number(item.grossBudget) > 0 ? (
                <View style={styles.amountRight}>
                  <AppText variant="caption" muted weight="medium">BUDGET</AppText>
                  <MoneyText amount={item.grossBudget} variant="small" weight="bold" muted />
                </View>
              ) : null}
              {Number(item.totalDeductions) > 0 ? (
                <View style={styles.amountRight}>
                  <AppText variant="caption" muted weight="medium">DEDUCTED</AppText>
                  <MoneyText
                    amount={item.totalDeductions}
                    variant="small"
                    weight="bold"
                    color={colors.warning}
                  />
                </View>
              ) : null}
            </View>

            <AppText variant="caption" muted style={styles.meta}>
              {item.paidAt
                ? `${item.paymentMode || 'Paid'} · ${dayjs(item.paidAt).format('DD MMM YYYY')}`
                : `Raised ${item.createdAt ? dayjs(item.createdAt).format('DD MMM YYYY') : '—'}`}
              {item.status === 'APPROVED' && can('advances.pay') ? ' · ready to pay' : ''}
            </AppText>
          </Card>
        );
      }}
      empty={{
        icon: 'wallet-outline',
        title: 'No advances',
        message: 'Nothing matches this filter.',
      }}
    />
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  headText: { flex: 1 },
  route: { marginBottom: 12 },
  amounts: { flexDirection: 'row', alignItems: 'flex-end', gap: 20 },
  amountRight: { alignItems: 'flex-start' },
  meta: { marginTop: 12, paddingTop: 11, borderTopWidth: 1, borderTopColor: colors.border },
});
