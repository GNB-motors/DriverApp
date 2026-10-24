import React from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { AppText, Card, Loading, EmptyState, colors, SectionHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import ownerService from '../../services/ownerService';

export default function OwnerDriversDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  
  const { data, loading, error, refetch } = useApi(
    () => ownerService.getDriversDashboard(),
    [],
    { enabled: !!token, fallback: null }
  );

  const stats = data?.stats || { activeOnDuty: 0, totalDrivers: 0 };
  const alerts = data?.alerts || [];
  const directory = data?.directory || [];

  const handleDriverPress = (driver) => {
    navigation.navigate('OwnerDriver', {
      id: driver._id,
      name: `${driver.firstName} ${driver.lastName}`.trim(),
      mobile: driver.mobileNumber,
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <AppText variant="h2" weight="bold">Drivers</AppText>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} />
        ) : (
          <>
            {/* STATS ROW */}
            <View style={styles.statsRow}>
              <Card elevated="sm" padding={16} style={{ flex: 1 }}>
                <AppText variant="label" muted>Active on Duty</AppText>
                <AppText variant="h2" weight="bold" style={{ color: colors.primary }}>
                  {stats.activeOnDuty}
                </AppText>
              </Card>
              <Card elevated="sm" padding={16} style={{ flex: 1 }}>
                <AppText variant="label" muted>Total Drivers</AppText>
                <AppText variant="h2" weight="bold">
                  {stats.totalDrivers}
                </AppText>
              </Card>
            </View>

            {/* ALERTS SECTION */}
            {alerts.length > 0 && (
              <>
                <SectionHeader label="Attention Needed" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                  {alerts.map(alert => (
                    <Card key={alert._id} elevated="sm" padding={12} style={styles.alertCard}>
                      <View style={styles.alertHeader}>
                        <Ionicons name="warning" size={16} color={colors.warning} />
                        <AppText variant="small" weight="semibold" style={{ color: colors.warning, marginLeft: 4 }}>
                          Expiring DL
                        </AppText>
                      </View>
                      <AppText variant="bodyStrong" weight="bold">{alert.driverName}</AppText>
                      <AppText variant="caption" muted>
                        Expires {dayjs(alert.expiryDate).format('DD MMM YYYY')}
                      </AppText>
                    </Card>
                  ))}
                </ScrollView>
              </>
            )}

            {/* MASTER DIRECTORY */}
            <SectionHeader label="Master Directory" />
            <Card padding={0} elevated="sm">
              {directory.length === 0 ? (
                <EmptyState icon="people-outline" title="No drivers" />
              ) : directory.map((driver, index) => {
                const isActive = driver.activeTrip;
                const statusColor = isActive ? colors.success : colors.textMuted;
                
                return (
                  <TouchableOpacity
                    key={driver._id}
                    style={[styles.driverRow, index > 0 && styles.rowBorder]}
                    onPress={() => handleDriverPress(driver)}
                  >
                    <View style={styles.driverAvatar}>
                      <AppText weight="bold" style={{ color: colors.white }}>
                        {driver.firstName?.[0] || 'D'}
                      </AppText>
                    </View>
                    
                    <View style={styles.driverInfo}>
                      <AppText variant="bodyStrong" weight="semibold">
                        {driver.firstName} {driver.lastName}
                      </AppText>
                      <AppText variant="small" muted>{driver.mobileNumber}</AppText>
                    </View>

                    <View style={styles.driverStatus}>
                      {isActive ? (
                        <>
                          <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                          <AppText variant="caption" weight="semibold" style={{ color: colors.success }}>
                            {driver.activeTrip.vehicle}
                          </AppText>
                        </>
                      ) : (
                        <AppText variant="caption" muted>Idle</AppText>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.border} />
                  </TouchableOpacity>
                );
              })}
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scroll: { padding: 20, gap: 16 },
  statsRow: { flexDirection: 'row', gap: 12 },
  horizontalScroll: { marginHorizontal: -20, paddingHorizontal: 20, flexDirection: 'row', gap: 12 },
  alertCard: { width: 200, marginRight: 12, backgroundColor: colors.surface },
  alertHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  driverInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  driverStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
});
