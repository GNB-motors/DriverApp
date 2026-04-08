import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { fetchMileageIntervals } from '../services/api';
import styles, { COLORS } from '../styles/FuelHistoryScreen.styles';

export default function FuelHistoryScreen({ navigation }) {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const limit = 50;
      const res = await fetchMileageIntervals(token, 1, limit);
      // Assuming response structure matches { data: [...] } typical for intervals
      setLogs(res.data || []);
    } catch (err) {
      console.log('Error fetching fuel logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const renderLogCard = ({ item }) => {
    const isFull = item.fillingType === 'FULL_TANK';
    return (
      <View style={styles.logCard}>
        <View style={styles.logHeader}>
          <Text style={styles.dateText}>
            {formatDate(item.createdAt)}
          </Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {item.fillingType ? item.fillingType.replace('_', ' ') : 'LOG'}
            </Text>
          </View>
        </View>

        {item.vehicleId?.registrationNumber && (
          <View style={styles.logRow}>
            <Ionicons name="car-sport-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.logRowLabel}>Vehicle</Text>
            <Text style={styles.logRowValue}>{item.vehicleId?.registrationNumber}</Text>
          </View>
        )}

        {item.litres && (
          <View style={styles.logRow}>
            <Ionicons name="water-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.logRowLabel}>Fuel Volume</Text>
            <Text style={styles.logRowValue}>{item.litres} L</Text>
          </View>
        )}

        {isFull && item.odometerReading && (
          <View style={styles.logRow}>
            <Ionicons name="speedometer-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.logRowLabel}>Odometer</Text>
            <Text style={styles.logRowValue}>{item.odometerReading} km</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle}>Fuel History</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          renderItem={renderLogCard}
          refreshing={loading}
          onRefresh={loadData}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="list-circle-outline" size={60} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No fuel logs found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
