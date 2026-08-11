/**
 * LedgerScreen.js — the general ledger.
 *
 * GET /api/erp/ledger/entries
 *
 * Entries are posted by the `ledgerWorker`, not inline with the transaction that
 * caused them, so a receipt recorded seconds ago may not appear yet. The note at
 * the foot says so rather than leaving the user to wonder.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import useList from '../../hooks/useList';
import { fetchLedgerEntries } from '../../services/erpApi';
import ListScreen from '../../components/ListScreen';
import {
  AppText, Card, MoneyText, colors,
} from '../../components/ui';

export default function LedgerScreen({ navigation }) {
  const list = useList(fetchLedgerEntries, { initial: {} });

  return (
    <ListScreen
      title="Ledger"
      subtitle={list.meta?.total ? `${list.meta.total} entries` : undefined}
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      list={list}
      renderItem={({ item }) => {
        const debit = Number(item.debit || 0);
        const credit = Number(item.credit || 0);
        const isDebit = debit > 0;

        return (
          <Card padding={15} elevated="sm" style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.dirIcon, isDebit ? styles.dirDebit : styles.dirCredit]}>
                <Ionicons
                  name={isDebit ? 'arrow-up' : 'arrow-down'}
                  size={14}
                  color={isDebit ? colors.warning : colors.success}
                />
              </View>

              <View style={styles.body}>
                <AppText variant="bodyStrong" weight="bold" numberOfLines={2}>
                  {item.narration || item.voucherNumber || 'Entry'}
                </AppText>
                <AppText variant="caption" muted weight="medium" numberOfLines={1}>
                  {item.voucherNumber ? `${item.voucherNumber} · ` : ''}
                  {item.entryDate ? dayjs(item.entryDate).format('DD MMM YYYY') : '—'}
                </AppText>
              </View>

              <View style={styles.right}>
                <MoneyText
                  amount={isDebit ? debit : credit}
                  variant="bodyStrong"
                  weight="extrabold"
                  color={isDebit ? colors.warning : colors.success}
                />
                {item.balance != null ? (
                  <View style={styles.balanceRow}>
                    <AppText variant="caption" muted>bal</AppText>
                    <MoneyText amount={item.balance} compact variant="caption" weight="bold" muted />
                  </View>
                ) : null}
              </View>
            </View>
          </Card>
        );
      }}
      empty={{
        icon: 'book-outline',
        title: 'No ledger entries',
        message: 'Vouchers post here as bills, receipts and payments are recorded.',
      }}
      footer={
        list.items.length > 0 ? (
          <View style={styles.footNote}>
            <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
            <AppText variant="caption" muted style={styles.footNoteText}>
              Posting runs in the background — very recent entries may take a moment
              to appear.
            </AppText>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dirIcon: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  dirDebit: { backgroundColor: colors.pendingBg },
  dirCredit: { backgroundColor: colors.validBg },
  body: { flex: 1 },
  right: { alignItems: 'flex-end', gap: 2 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footNote: { flexDirection: 'row', gap: 7, marginTop: 8 },
  footNoteText: { flex: 1 },
});
