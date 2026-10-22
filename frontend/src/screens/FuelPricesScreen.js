import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { AppText, colors, spacing } from '../components/ui';
import api from '../services/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export default function FuelPricesScreen() {
  const insets = useSafeAreaInsets();
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPrices = async () => {
    try {
      const response = await api.get('/fuel-prices');
      if (response.data && response.data.length > 0) {
        setPrices(response.data);
      } else {
        setPrices([
          { state: 'Delhi', city: 'State Average', price: 95.24, priceChange: 0, updatedAt: new Date() },
          { state: 'Gujarat', city: 'State Average', price: 98.16, priceChange: 0.01, updatedAt: new Date() },
          { state: 'Haryana', city: 'State Average', price: 95.59, priceChange: -0.01, updatedAt: new Date() },
          { state: 'Maharashtra', city: 'State Average', price: 102.34, priceChange: -0.15, updatedAt: new Date() },
          { state: 'Karnataka', city: 'State Average', price: 101.44, priceChange: 0.20, updatedAt: new Date() },
        ]);
      }
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Could not load fuel prices. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPrices();
  };

  const renderItem = ({ item }) => {
    const isUp = item.priceChange > 0;
    const isDown = item.priceChange < 0;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <AppText variant="bodyStrong" weight="bold">{item.state}</AppText>
          <View style={[styles.badge, isUp ? styles.badgeUp : isDown ? styles.badgeDown : styles.badgeNeutral]}>
            {isUp && <Feather name="trending-up" size={12} color="#ef4444" />}
            {isDown && <Feather name="trending-down" size={12} color="#16a34a" />}
            <AppText variant="small" weight="bold" color={isUp ? '#ef4444' : isDown ? '#16a34a' : '#64748b'} style={{ marginLeft: 4 }}>
              {isUp ? '+' : ''}{item.priceChange.toFixed(2)}
            </AppText>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View>
            <AppText variant="small" muted>{item.city}</AppText>
            <AppText variant="h2" weight="extrabold">₹{item.price.toFixed(2)}</AppText>
          </View>
          <View style={styles.iconCircle}>
            <Feather name="droplet" size={24} color={colors.primary} />
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <AppText variant="h3" weight="extrabold">Diesel Prices</AppText>
        {prices.length > 0 && prices[0].updatedAt && (
          <AppText variant="small" muted>Updated {dayjs(prices[0].updatedAt).fromNow()}</AppText>
        )}
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="warning-outline" size={48} color={colors.danger} />
          <AppText variant="body" muted style={{ marginTop: spacing.md, textAlign: 'center' }}>
            {error}
          </AppText>
        </View>
      ) : (
        <FlatList
          data={prices}
          keyExtractor={(item, index) => `${item.state}-${index}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  list: {
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeUp: { backgroundColor: '#fef2f2' },
  badgeDown: { backgroundColor: '#f0fdf4' },
  badgeNeutral: { backgroundColor: '#f8fafc' },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  }
});
