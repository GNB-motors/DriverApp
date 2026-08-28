import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { fetchRepairLogs } from '../services/api';
import logger from '../utils/logger';

const { height } = Dimensions.get('window');

const COLORS = {
  primary: '#4469F0',
  primaryDark: '#213EA7',
  white: '#FFFFFF',
  background: '#F3F3F6',
  textDark: '#222222',
  textMuted: '#888888',
  border: '#E6E6EB',
  surface: '#F0EEF6',
  cardBg: 'rgba(66, 150, 144, 0.08)',
};

export default function RepairLogsScreen({ navigation }) {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLogs = async () => {
    try {
      const data = await fetchRepairLogs(token);
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      logger.error('RepairLogs', `Failed to fetch repair logs: ${err?.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [token]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadLogs();
  };

  const renderLogItem = ({ item }) => {
    const d = new Date(item.date);
    const dateStr = Number.isNaN(d.getTime()) ? 'Unknown Date' : d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });

    const vehicleText = typeof item.vehicleId === 'object' && item.vehicleId?.registrationNumber
      ? item.vehicleId.registrationNumber
      : 'Vehicle';

    return (
      <View style={styles.logCard}>
        <View style={styles.logHeader}>
          <Text style={styles.vehicleText}>{vehicleText}</Text>
          <Text style={styles.dateText}>{dateStr}</Text>
        </View>

        <View style={styles.logRow}>
          <View style={styles.iconCol}>
            <Ionicons name="build" size={16} color={COLORS.primary} />
            <Text style={styles.logLabel}>{t('repairs', 'type')}</Text>
          </View>
          <Text style={styles.logValue} numberOfLines={1}>{item.type}</Text>
        </View>

        <View style={styles.logRow}>
          <View style={styles.iconCol}>
            <Ionicons name="business" size={16} color={COLORS.primary} />
            <Text style={styles.logLabel}>{t('repairs', 'workshop')}</Text>
          </View>
          <Text style={styles.logValue} numberOfLines={1}>{item.workshop}</Text>
        </View>

        <View style={styles.logRow}>
          <View style={styles.iconCol}>
            <Ionicons name="cash" size={16} color={COLORS.primary} />
            <Text style={styles.logLabel}>{t('repairs', 'amount')}</Text>
          </View>
          <Text style={styles.amountValue}>₹{Number(item.amount).toLocaleString('en-IN')}</Text>
        </View>

        {!!item.notes && (
          <View style={[styles.logRow, { marginTop: 8 }]}>
            <Text style={styles.notesText} numberOfLines={2}>{t('repairs', 'note')} {item.notes}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.topSection} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>{t('repairs', 'logsTitle')}</Text>
            <Text style={styles.headerStep}>{t('repairs', 'logsStep')}</Text>
          </View>
        </View>

        {/* List Card */}
        <View style={styles.formCard}>
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : logs.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="documents-outline" size={64} color={COLORS.border} />
              <Text style={styles.emptyText}>{t('repairs', 'noLogs')}</Text>
            </View>
          ) : (
            <FlatList
              data={logs}
              keyExtractor={(item, index) => item._id || index.toString()}
              renderItem={renderLogItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              onRefresh={handleRefresh}
              refreshing={refreshing}
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  topSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.28,
    backgroundColor: COLORS.primary,
    overflow: 'hidden',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleBlock: {
    flex: 1,
    marginLeft: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerStep: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  formCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: 8,
    paddingHorizontal: 20,
    paddingTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginTop: 12,
  },
  logCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 12,
    marginBottom: 12,
  },
  vehicleText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  dateText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconCol: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 90,
  },
  logLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginLeft: 6,
  },
  logValue: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  amountValue: {
    flex: 1,
    fontSize: 15,
    color: COLORS.primaryDark,
    fontWeight: '700',
  },
  notesText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
});
