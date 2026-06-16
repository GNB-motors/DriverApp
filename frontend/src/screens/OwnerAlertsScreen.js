import React, { useState, useCallback } from 'react';
import { View, FlatList, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { fetchMaintenanceAlerts } from '../services/api';
import logger from '../utils/logger';
import { AppText, Badge, ListRow, ScreenHeader, colors, spacing } from '../components/ui';

const SEVERITY_TONE = { CRITICAL: 'expired', WARNING: 'pending' };
const SEVERITY_ORDER = { CRITICAL: 0, WARNING: 1 };
const TYPE_ICON = { DOCUMENT_EXPIRY: 'document-text', SERVICE_DUE: 'build', HIGH_REPAIR_SPEND: 'cash' };

export default function OwnerAlertsScreen() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAlerts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await fetchMaintenanceAlerts(token);
      const sorted = [...(Array.isArray(data) ? data : [])].sort(
        (a, b) => (SEVERITY_ORDER[a.severity] ?? 2) - (SEVERITY_ORDER[b.severity] ?? 2),
      );
      setAlerts(sorted);
    } catch (err) {
      logger.error('OwnerAlerts', `Error loading alerts: ${err?.message}`);
      setAlerts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { loadAlerts(); }, [loadAlerts]));

  const renderAlert = ({ item }) => (
    <ListRow
      icon={TYPE_ICON[item.type] || 'alert-circle'}
      iconColor={item.severity === 'CRITICAL' ? colors.expiredText : colors.pendingText}
      title={item.vehicleReg || item.model || 'Vehicle'}
      subtitle={item.description}
      right={<Badge tone={SEVERITY_TONE[item.severity] || 'neutral'} label={item.severity === 'CRITICAL' ? (t('owner', 'critical') || 'Critical') : (t('owner', 'warning') || 'Warning')} />}
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScreenHeader title={t('owner', 'alertsTitle') || 'Alerts'} subtitle={t('owner', 'alertsSubtitle') || 'Maintenance & document alerts'} rounded />

      <View style={styles.sheet}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={alerts}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderAlert}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAlerts(true)} tintColor={colors.primary} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="checkmark-circle" size={40} color={colors.primary} />
                <AppText muted center style={{ marginTop: 10 }}>{t('owner', 'noAlerts') || 'No active alerts. All clear!'}</AppText>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  sheet: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 22,
    paddingTop: 20,
  },
  empty: { alignItems: 'center', marginTop: 60 },
});
