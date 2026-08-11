/**
 * MyKhataScreen.js — the driver's own cash book: what they were advanced, what
 * they spent, and where that leaves them.
 *
 * Reads GET /api/expenses (+ /summary), which the backend now forces to the
 * calling driver's own id. Before that scoping fix these endpoints returned the
 * whole organisation's expense ledger to any authenticated caller, so this screen
 * could not have shipped safely.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { fetchExpenses, fetchExpenseSummary } from '../../services/erpApi';
import {
  AppText, Card, Button, SubHeader, EmptyState, MoneyText, Badge,
  colors, radius,
} from '../../components/ui';
import { categoryIcon, categoryLabel } from '../../domain/expenseCategories';
import logger from '../../utils/logger';

export default function MyKhataScreen({ navigation }) {
  const { token } = useAuth();
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [sum, list] = await Promise.all([
        fetchExpenseSummary(token).catch(() => null),
        fetchExpenses(token, { limit: 30 }),
      ]);
      setSummary(sum);
      setExpenses(list.results);
      setError(null);
    } catch (err) {
      logger.warn('Khata', `Load failed: ${err?.message}`);
      setError(err?.message || 'Could not load your khata.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const breakdown = Object.entries(summary?.categoryBreakdown || {})
    .filter(([, amount]) => Number(amount) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]));

  return (
    <View style={styles.flex}>
      <StatusBar style="dark" />
      <SubHeader
        title="My Khata"
        subtitle="Expenses you have logged"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {error ? (
          <Card variant="outline" padding={13} style={styles.errorCard}>
            <AppText variant="small" weight="semibold" color={colors.error}>{error}</AppText>
            <AppText variant="caption" muted style={styles.errorHint}>Pull down to retry.</AppText>
          </Card>
        ) : null}

        <Card variant="tinted" padding={20} style={styles.card}>
          <AppText variant="caption" muted weight="medium">TOTAL SPENT</AppText>
          <MoneyText
            amount={summary?.totalAmount ?? 0}
            variant="display"
            weight="extrabold"
            color={colors.primaryDeep}
          />
          <AppText variant="small" muted style={styles.entryCount}>
            {summary?.count ?? expenses.length} {(summary?.count ?? expenses.length) === 1 ? 'entry' : 'entries'}
          </AppText>
        </Card>

        {breakdown.length > 0 && (
          <Card padding={18} elevated="sm" style={styles.card}>
            <AppText variant="label" muted style={styles.cardTitle}>BY CATEGORY</AppText>
            {breakdown.map(([category, amount], i) => (
              <View
                key={category}
                style={[styles.catRow, i < breakdown.length - 1 && styles.catRowBorder]}
              >
                <View style={styles.catIcon}>
                  <Ionicons
                    name={categoryIcon(category)}
                    size={16}
                    color={colors.primary}
                  />
                </View>
                <AppText variant="bodyStrong" weight="semibold" style={styles.catName}>
                  {categoryLabel(category)}
                </AppText>
                <MoneyText amount={amount} variant="bodyStrong" weight="bold" />
              </View>
            ))}
          </Card>
        )}

        <Button
          icon="add"
          label="Log an expense"
          onPress={() => navigation.navigate('AddExpense', { onSaved: load })}
          style={styles.addBtn}
        />

        <AppText variant="label" muted style={styles.sectionTitle}>RECENT ENTRIES</AppText>

        {loading && expenses.length === 0 ? (
          <Card padding={18}><AppText variant="small" muted>Loading…</AppText></Card>
        ) : expenses.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title="Nothing logged yet"
            message="Add fuel, toll and repair bills as you go — they show up here and in the office khata."
          />
        ) : (
          expenses.map((e) => (
            <Card key={e._id} padding={15} elevated="sm" style={styles.entry}>
              <View style={styles.entryIcon}>
                <Ionicons
                  name={categoryIcon(e.category)}
                  size={17}
                  color={colors.primary}
                />
              </View>
              <View style={styles.entryBody}>
                <AppText variant="bodyStrong" weight="bold" numberOfLines={1}>
                  {e.title || categoryLabel(e.category)}
                </AppText>
                <AppText variant="caption" muted weight="medium">
                  {e.expenseDate ? dayjs(e.expenseDate).format('DD MMM YYYY') : '—'}
                </AppText>
              </View>
              <View style={styles.entryRight}>
                <MoneyText amount={e.amount} variant="bodyStrong" weight="extrabold" />
                <Badge tone="neutral" label={categoryLabel(e.category)} style={styles.entryBadge} />
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 22, paddingBottom: 48 },
  card: { marginBottom: 14 },
  cardTitle: { marginBottom: 4 },
  errorCard: {
    borderColor: colors.error, backgroundColor: colors.expiredBg,
    borderRadius: radius.md, marginBottom: 14,
  },
  errorHint: { marginTop: 3 },
  entryCount: { marginTop: 4 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  catRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  catIcon: {
    width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.tealTint,
    alignItems: 'center', justifyContent: 'center',
  },
  catName: { flex: 1 },
  addBtn: { marginBottom: 24 },
  sectionTitle: { marginBottom: 12, letterSpacing: 0.5 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 10 },
  entryIcon: {
    width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.tealTint,
    alignItems: 'center', justifyContent: 'center',
  },
  entryBody: { flex: 1 },
  entryRight: { alignItems: 'flex-end', gap: 5 },
  entryBadge: {},
});
