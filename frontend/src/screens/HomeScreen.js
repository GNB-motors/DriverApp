import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { fetchMileageIntervals } from '../services/mileageService';
import styles, { COLORS } from '../styles/HomeScreen.styles';

export default function HomeScreen({ navigation }) {
  const { t } = useLanguage();
  const { user, token } = useAuth();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const driverName = user?.name || 'Driver';

  const loadRecords = useCallback(async (pageNum = 1, append = false) => {
    try {
      setLoading(true);
      const res = await fetchMileageIntervals(token, pageNum, 10);
      const list = res?.data || [];
      setRecords(prev => append ? [...prev, ...list] : list);
      setHasMore(list.length >= 10);
    } catch {
      // silent — cards just won't show
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) loadRecords(1);
  }, [token, loadRecords]);

  // Refresh when returning from refuel flow
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (token) loadRecords(1);
    });
    return unsubscribe;
  }, [navigation, token, loadRecords]);

  const loadMore = () => {
    if (!loading && hasMore) {
      const next = page + 1;
      setPage(next);
      loadRecords(next, true);
    }
  };

  const startRefuel = () => {
    navigation.navigate('RefuelDetails', {});
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const renderMileageCard = ({ item }) => (
    <View style={styles.mileageCard}>
      <View style={styles.mileageCardHeader}>
        <View style={styles.mileageIconBox}>
          <Ionicons name="speedometer-outline" size={18} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.mileageVehicle}>{item.vehicleRegNo || item.vehicleId?.registrationNumber || '—'}</Text>
          <Text style={styles.mileageDate}>{formatDate(item.refuelTime || item.createdAt)}</Text>
        </View>
        <View style={styles.mileageBadge}>
          <Text style={styles.mileageBadgeText}>
            {item.fillingType === 'FULL_TANK' ? 'Full' : 'Partial'}
          </Text>
        </View>
      </View>

      <View style={styles.mileageStats}>
        {item.distanceKm != null && (
          <View style={styles.statItem}>
            <Ionicons name="navigate-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.statValue}>{item.distanceKm} km</Text>
          </View>
        )}
        <View style={styles.statItem}>
          <Ionicons name="water-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.statValue}>{item.litres || item.fuelConsumedLiters || '—'} L</Text>
        </View>
        {item.mileageKmPerL != null && (
          <View style={styles.statItem}>
            <Ionicons name="analytics-outline" size={14} color={COLORS.primary} />
            <Text style={[styles.statValue, { color: COLORS.primary, fontWeight: '700' }]}>
              {item.mileageKmPerL.toFixed(1)} km/L
            </Text>
          </View>
        )}
        <View style={styles.statItem}>
          <Ionicons name="cash-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.statValue}>₹{((item.litres || 0) * (item.rate || 0)).toFixed(0)}</Text>
        </View>
      </View>
    </View>
  );

  const ListHeader = () => (
    <>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.greetingText}>Welcome!</Text>
            <Text style={styles.nameText}>{driverName}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.notificationBtn}>
          <Ionicons name="notifications-outline" size={22} color={COLORS.primary} />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      {/* Start Refuel Card */}
      <View style={styles.content}>
        <View style={styles.refuelCard}>
          <View>
            <View style={styles.refuelCardHeader}>
              <Text style={styles.refuelTitle}>{t('home', 'startRefuel')}</Text>
              <Ionicons name="water" size={32} color={COLORS.white} />
            </View>
            <Text style={styles.refuelSubtitle}>Record your latest diesel fill-up</Text>
          </View>
          <TouchableOpacity style={styles.refuelAction} onPress={startRefuel}>
            <Ionicons name="add-circle" size={24} color={COLORS.primaryDark} />
            <Text style={styles.refuelActionText}>Tap to Start</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Mileage Records</Text>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      {/* Decorative Background Circles */}
      <View style={styles.circleOne} />
      <View style={styles.circleTwo} />
      <View style={styles.circleThree} />

      <FlatList
        data={records}
        keyExtractor={(item, i) => item._id || String(i)}
        renderItem={renderMileageCard}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingBottom: 100 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loading ? <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 20 }} /> : null
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>No mileage records yet. Start your first refuel!</Text>
          ) : null
        }
      />
    </View>
  );
}
