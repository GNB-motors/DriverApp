/**
 * DeliveryOrdersScreen.js — Stage 2, customer commitments.
 *
 * GET /api/erp/delivery-orders
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import useList from '../../hooks/useList';
import { fetchDeliveryOrders } from '../../services/erpApi';
import ListScreen from '../../components/ListScreen';
import { AppText, Card, Badge, colors } from '../../components/ui';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Open' },
  { value: 'PARTIAL', label: 'Part-served' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const TONE = {
  PENDING: 'pending',
  PARTIAL: 'info',
  CLOSED: 'valid',
  CANCELLED: 'expired',
};

const LABEL = {
  PENDING: 'Open',
  PARTIAL: 'Part-served',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

export default function DeliveryOrdersScreen({ navigation }) {
  const list = useList(fetchDeliveryOrders, { initial: { status: '' } });

  return (
    <ListScreen
      title="Delivery Orders"
      subtitle={list.meta?.total ? `${list.meta.total} orders` : undefined}
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      list={list}
      filters={STATUS_FILTERS}
      filterKey="status"
      renderItem={({ item }) => (
        <Card padding={16} elevated="sm" style={styles.card}>
          <View style={styles.head}>
            <View style={styles.headText}>
              <AppText variant="bodyStrong" weight="extrabold" numberOfLines={1}>
                {item.doNumber || '—'}
              </AppText>
              <AppText variant="caption" muted weight="medium" numberOfLines={1}>
                {item.partyId?.name || '—'}
                {item.doDate ? ` · ${dayjs(item.doDate).format('DD MMM')}` : ''}
              </AppText>
            </View>
            <Badge tone={TONE[item.status] || 'neutral'} label={LABEL[item.status] || item.status} />
          </View>

          <View style={styles.grid}>
            <Cell label="MATERIAL" value={item.material || '—'} />
            <Cell
              label="QUANTITY"
              value={item.quantity != null ? `${item.quantity} ${item.qtyUnit || 'KL'}` : '—'}
            />
            <Cell
              label="FREIGHT"
              value={item.freightRate != null ? `₹${item.freightRate}/${item.rateUnit || 'KL'}` : '—'}
            />
          </View>

          {item.expiryDate ? (
            <AppText
              variant="caption"
              weight="semibold"
              color={dayjs(item.expiryDate).isBefore(dayjs()) ? colors.error : colors.textMuted}
              style={styles.expiry}
            >
              {dayjs(item.expiryDate).isBefore(dayjs()) ? 'Expired ' : 'Expires '}
              {dayjs(item.expiryDate).format('DD MMM YYYY')}
            </AppText>
          ) : null}
        </Card>
      )}
      empty={{
        icon: 'clipboard-outline',
        title: 'No delivery orders',
        message: 'Nothing matches this filter.',
      }}
    />
  );
}

function Cell({ label, value }) {
  return (
    <View style={styles.cell}>
      <AppText variant="caption" muted weight="medium">{label}</AppText>
      <AppText variant="small" weight="bold" numberOfLines={1}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  headText: { flex: 1 },
  grid: { flexDirection: 'row', gap: 12 },
  cell: { flex: 1 },
  expiry: { marginTop: 12, paddingTop: 11, borderTopWidth: 1, borderTopColor: colors.border },
});
