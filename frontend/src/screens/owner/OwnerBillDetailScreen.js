import React from 'react';
import { View, ScrollView, Image, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { AppText, Button, KeyValueTable, KeyValueRow, WarningBanner, colors, spacing, radius } from '../../components/ui';
import { BackHeader, Pill, Loading, EmptyState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import { useSubmit } from '../../hooks/useSubmit';
import billService from '../../services/billService';

const STATUS_TONE = { PENDING: 'pending', CONFIRMED: 'confirmed', REJECTED: 'rejected' };

/** O2 · Bill detail — confirm or reject a real pending bill. */
export default function OwnerBillDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const id = route?.params?.id;

  const { token } = useAuth();
  const enabled = apiConfigured() && !!token && !!id;
  const { data: bill, loading, error, refetch } = useApi(() => billService.getBill(id), [id], { enabled, fallback: null });
  const { submit, busy } = useSubmit();

  const amount = bill ? `₹${Number(bill.amount || 0).toLocaleString('en-IN')}` : '';
  const isPending = bill?.status === 'PENDING';

  // Return to whichever approvals list pushed this screen (owner or manager).
  const confirm = () => submit(
    () => billService.confirmBill(id),
    { onSuccess: () => navigation.goBack() },
  );

  return (
    <View style={styles.container}>
      <BackHeader
        title={bill?.driver?.name || 'Bill'}
        subtitle={[bill?.vehicle?.registrationNumber, bill?.title].filter(Boolean).join(' · ')}
        onBack={() => navigation.goBack()}
        right={bill ? <Pill tone={STATUS_TONE[bill.status] || 'neutral'} label={bill.status} /> : null}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />}>
        {loading ? (
          <Loading />
        ) : error ? (
          <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} />
        ) : !bill ? (
          <EmptyState icon="receipt-outline" title="Bill not found" message="This bill may have been reviewed or removed." />
        ) : (
          <>
            <View style={styles.photo}>
              {bill.receiptUrl ? (
                <Image source={{ uri: bill.receiptUrl }} style={styles.photoImg} resizeMode="cover" />
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={44} color={colors.textMuted} />
                  <AppText variant="small" muted>No photo attached</AppText>
                </>
              )}
            </View>

            <KeyValueTable>
              <KeyValueRow label="Category" value={bill.title || bill.category} />
              <KeyValueRow label="Bill date" value={bill.expenseDate ? dayjs(bill.expenseDate).format('DD MMM YYYY') : '—'} mono />
              {bill.description ? <KeyValueRow label="Note" value={bill.description} /> : null}
              <KeyValueRow label="Amount claimed" value={amount} mono highlight />
            </KeyValueTable>

            {!isPending ? (
              <WarningBanner
                tone={bill.status === 'CONFIRMED' ? 'success' : 'error'}
                message={bill.status === 'CONFIRMED'
                  ? 'This bill is confirmed and counts toward the driver’s wallet.'
                  : `Rejected${bill.rejectionReason ? `: ${bill.rejectionReason}` : ''}`}
              />
            ) : null}
          </>
        )}
      </ScrollView>

      {isPending ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button variant="secondary" size="lg" icon="close" label="Reject" style={styles.reject} disabled={busy} onPress={() => navigation.navigate('OwnerReject', { id })} />
          <Button size="lg" icon="checkmark" label={busy ? 'Confirming…' : `Confirm ${amount}`} style={styles.confirm} disabled={busy} onPress={confirm} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, gap: 16 },
  photo: { height: 250, borderRadius: radius.lg, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden' },
  photoImg: { width: '100%', height: '100%' },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  reject: { flex: 1, borderColor: '#F0CFCB' },
  confirm: { flex: 1.4 },
});
