import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  AppText,
  Card,
  Badge,
  Button,
  BackHeader,
  colors,
  spacing,
  radius,
  elevation,
} from '../../components/ui';
import { useManagerData } from '../context/ManagerDataContext';

export default function FleetHomeSummaryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const { data, loading, refresh, branchId, branches, selectBranch } = useManagerData();

  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | MOVING | STOPPED | IDLING | OFFLINE
  const [search, setSearch] = useState('');

  const vehicles = useMemo(() => (Array.isArray(data?.vehicles) ? data.vehicles : []), [data?.vehicles]);
  const drivers = useMemo(() => (Array.isArray(data?.drivers) ? data.drivers : []), [data?.drivers]);
  const trips = useMemo(() => (Array.isArray(data?.trips) ? data.trips : []), [data?.trips]);
  const alerts = useMemo(() => (Array.isArray(data?.alertFeed?.alerts) ? data.alertFeed.alerts : []), [data?.alertFeed]);

  // Telematics status counts
  const counts = useMemo(() => {
    let moving = 0;
    let stopped = 0;
    let idling = 0;
    let offline = 0;

    vehicles.forEach((v) => {
      const s = String(v.status || '').toLowerCase();
      if (s === 'moving') moving++;
      else if (s === 'stopped') stopped++;
      else if (s === 'idling') idling++;
      else offline++;
    });

    let paired = 0;
    vehicles.forEach((v) => {
      if (v.driverId || v.driverName) paired++;
    });

    return {
      total: vehicles.length,
      moving,
      stopped,
      idling,
      offline,
      paired,
      unpaired: Math.max(0, vehicles.length - paired),
      driversCount: drivers.length,
      tripsCount: trips.length,
      alertsCount: alerts.length,
    };
  }, [vehicles, drivers, trips, alerts]);

  // Filtering vehicles
  const q = search.trim().toLowerCase();
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const status = String(v.status || '').toLowerCase();
      if (statusFilter === 'MOVING' && status !== 'moving') return false;
      if (statusFilter === 'STOPPED' && status !== 'stopped') return false;
      if (statusFilter === 'IDLING' && status !== 'idling') return false;
      if (statusFilter === 'OFFLINE' && status !== 'offline' && status !== 'unknown') return false;

      if (!q) return true;
      const plate = String(v.plate || '').toLowerCase();
      const model = String(v.model || '').toLowerCase();
      const driver = String(v.driverName || v.driver?.name || '').toLowerCase();
      return plate.includes(q) || model.includes(q) || driver.includes(q);
    });
  }, [vehicles, statusFilter, q]);

  const branchesList = Array.isArray(branches) ? branches : [];
  const activeBranchLabel = branchId === 'all'
    ? 'All branches'
    : branchesList.find((b) => String(b.id) === String(branchId))?.name || 'Selected branch';

  return (
    <View style={s.screen}>
      {focused && <StatusBar style="dark" />}
      <BackHeader
        title="Fleet home summary"
        subtitle={`${counts.total} vehicles · ${activeBranchLabel}`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={Boolean(loading)} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        {/* Executive Fleet Vital Scorecard */}
        <Card elevated="sm" padding={18} style={s.heroCard}>
          <View style={s.heroTop}>
            <View style={{ gap: 2 }}>
              <AppText variant="caption" weight="semibold" color="#64748B" style={s.eyebrow}>
                CONSOLIDATED FLEET STATUS
              </AppText>
              <AppText variant="h1" weight="extrabold" color={colors.text} style={s.heroTotal}>
                {counts.total} <AppText variant="body" weight="normal" color="#64748B">Vehicles</AppText>
              </AppText>
            </View>

            <View style={s.driverBadgeBox}>
              <Ionicons name="people" size={14} color="#7C3AED" />
              <AppText variant="caption" weight="bold" color="#6D28D9">
                {counts.driversCount} Drivers
              </AppText>
            </View>
          </View>

          {/* 4 Status Pills Grid */}
          <View style={s.statusGrid}>
            <Pressable
              onPress={() => setStatusFilter(statusFilter === 'MOVING' ? 'ALL' : 'MOVING')}
              style={[s.statusTile, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }, statusFilter === 'MOVING' && s.statusTileActive]}
            >
              <View style={[s.dot, { backgroundColor: '#10B981' }]} />
              <AppText variant="small" weight="bold" color="#047857">{counts.moving} Moving</AppText>
              <AppText variant="caption" color="#059669" style={{ fontSize: 10 }}>On the road</AppText>
            </Pressable>

            <Pressable
              onPress={() => setStatusFilter(statusFilter === 'STOPPED' ? 'ALL' : 'STOPPED')}
              style={[s.statusTile, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }, statusFilter === 'STOPPED' && s.statusTileActive]}
            >
              <View style={[s.dot, { backgroundColor: '#EF4444' }]} />
              <AppText variant="small" weight="bold" color="#B91C1C">{counts.stopped} Stopped</AppText>
              <AppText variant="caption" color="#DC2626" style={{ fontSize: 10 }}>Stationary</AppText>
            </Pressable>

            <Pressable
              onPress={() => setStatusFilter(statusFilter === 'IDLING' ? 'ALL' : 'IDLING')}
              style={[s.statusTile, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }, statusFilter === 'IDLING' && s.statusTileActive]}
            >
              <View style={[s.dot, { backgroundColor: '#F59E0B' }]} />
              <AppText variant="small" weight="bold" color="#B45309">{counts.idling} Idling</AppText>
              <AppText variant="caption" color="#D97706" style={{ fontSize: 10 }}>Engine running</AppText>
            </Pressable>

            <Pressable
              onPress={() => setStatusFilter(statusFilter === 'OFFLINE' ? 'ALL' : 'OFFLINE')}
              style={[s.statusTile, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }, statusFilter === 'OFFLINE' && s.statusTileActive]}
            >
              <View style={[s.dot, { backgroundColor: '#94A3B8' }]} />
              <AppText variant="small" weight="bold" color="#475569">{counts.offline} Offline</AppText>
              <AppText variant="caption" color="#64748B" style={{ fontSize: 10 }}>No telemetry</AppText>
            </Pressable>
          </View>

          <View style={s.heroDivider} />

          {/* Sub Stats Row */}
          <View style={s.microRow}>
            <View style={s.microItem}>
              <AppText variant="caption" color="#64748B">Pairing Ratio</AppText>
              <AppText variant="small" weight="bold">
                {counts.paired} / {counts.total} <AppText variant="caption" muted>({counts.total ? Math.round((counts.paired / counts.total) * 100) : 0}%)</AppText>
              </AppText>
            </View>

            <View style={s.microDivider} />

            <View style={s.microItem}>
              <AppText variant="caption" color="#64748B">Active Trips</AppText>
              <AppText variant="small" weight="bold" color={colors.primary}>
                {counts.tripsCount} active
              </AppText>
            </View>

            <View style={s.microDivider} />

            <View style={s.microItem}>
              <AppText variant="caption" color="#64748B">Open Alerts</AppText>
              <AppText variant="small" weight="bold" color={counts.alertsCount ? '#EF4444' : '#10B981'}>
                {counts.alertsCount} alerts
              </AppText>
            </View>
          </View>
        </Card>

        {/* Quick Action Pills */}
        <View style={s.actionRow}>
          <Pressable
            style={s.actionCard}
            onPress={() => navigation.navigate('Fleet map')}
          >
            <View style={[s.actionIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="map" size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="small" weight="bold">Live Map</AppText>
              <AppText variant="caption" muted numberOfLines={1}>All trucks live</AppText>
            </View>
          </Pressable>

          <Pressable
            style={s.actionCard}
            onPress={() => navigation.navigate('Duty board')}
          >
            <View style={[s.actionIcon, { backgroundColor: '#FAF5FF' }]}>
              <Ionicons name="people" size={16} color="#8B5CF6" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="small" weight="bold">Duty Board</AppText>
              <AppText variant="caption" muted numberOfLines={1}>Driver roster</AppText>
            </View>
          </Pressable>

          <Pressable
            style={s.actionCard}
            onPress={() => navigation.navigate('Fleet trips')}
          >
            <View style={[s.actionIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="navigate" size={16} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="small" weight="bold">Trips</AppText>
              <AppText variant="caption" muted numberOfLines={1}>Trip history</AppText>
            </View>
          </Pressable>
        </View>

        {/* Branch Allocation Card */}
        {branches && branches.length > 1 && (
          <Card elevated="sm" padding={14} style={s.branchCard}>
            <View style={s.sectionHeaderRow}>
              <Ionicons name="business-outline" size={16} color="#475569" />
              <AppText variant="small" weight="bold" color="#1E293B">
                Branch Allocation
              </AppText>
            </View>
            <View style={s.branchPillsRow}>
              {branches.map((b) => {
                const bCount = b.id === 'all'
                  ? vehicles.length
                  : vehicles.filter((v) => v.branchId === b.id).length;
                const isSelected = branchId === b.id;
                return (
                  <Pressable
                    key={b.id}
                    onPress={() => selectBranch(b.id)}
                    style={[s.branchPill, isSelected && s.branchPillActive]}
                  >
                    <AppText
                      variant="caption"
                      weight={isSelected ? 'bold' : 'medium'}
                      color={isSelected ? colors.white : '#475569'}
                    >
                      {b.name} ({bCount})
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        )}

        {/* Vehicle Fleet Roster Section Header */}
        <View style={s.rosterHeader}>
          <View style={{ flex: 1 }}>
            <AppText variant="label" weight="bold" color="#1E293B">
              Live Vehicle Roster
            </AppText>
            <AppText variant="caption" color="#64748B">
              {filteredVehicles.length} of {counts.total} trucks matching filter
            </AppText>
          </View>
        </View>

        {/* Search Bar */}
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput
            style={s.searchInput}
            placeholder="Search plate, model, or driver..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="characters"
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </Pressable>
          ) : null}
        </View>

        {/* Vehicle Cards List */}
        {filteredVehicles.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="bus-outline" size={32} color="#CBD5E1" />
            <AppText variant="caption" muted style={{ marginTop: 6 }}>
              {search ? 'No vehicles match your search.' : 'No vehicles in this status.'}
            </AppText>
          </View>
        ) : (
          <View style={s.vehicleList}>
            {filteredVehicles.map((vehicle) => {
              const status = String(vehicle.status || '').toLowerCase();
              const isMoving = status === 'moving';
              const isStopped = status === 'stopped';
              const isIdling = status === 'idling';

              const statusColor = isMoving ? '#10B981' : isStopped ? '#EF4444' : isIdling ? '#F59E0B' : '#94A3B8';
              const statusBg = isMoving ? '#F0FDF4' : isStopped ? '#FEF2F2' : isIdling ? '#FFFBEB' : '#F8FAFC';
              const statusLabel = isMoving
                ? `Moving${vehicle.speed ? ` · ${vehicle.speed} km/h` : ''}`
                : isStopped
                ? 'Stopped'
                : isIdling
                ? 'Idling'
                : 'Offline';

              return (
                <Card
                  key={vehicle.id || vehicle.plate}
                  elevated="sm"
                  padding={14}
                  style={s.vehicleCard}
                  onPress={() => navigation.navigate('Vehicle detail', { id: vehicle.id })}
                >
                  <View style={s.vehicleRow}>
                    <View style={s.truckIconCircle}>
                      <Ionicons name="bus" size={18} color={colors.primary} />
                    </View>

                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <AppText variant="bodyStrong" weight="extrabold" mono>
                          {vehicle.plate}
                        </AppText>
                        <View style={[s.vehicleStatusBadge, { backgroundColor: statusBg }]}>
                          <View style={[s.miniDot, { backgroundColor: statusColor }]} />
                          <AppText variant="caption" weight="bold" color={statusColor} style={{ fontSize: 10 }}>
                            {statusLabel}
                          </AppText>
                        </View>
                      </View>

                      <AppText variant="caption" color="#64748B" numberOfLines={1}>
                        {vehicle.model || 'Heavy Commercial Vehicle'}
                      </AppText>

                      <View style={s.driverLine}>
                        <Ionicons name="person-outline" size={11} color="#64748B" />
                        <AppText variant="caption" weight="medium" color={vehicle.driverName ? '#1E293B' : '#94A3B8'}>
                          {vehicle.driverName || 'No driver assigned'}
                        </AppText>
                      </View>
                    </View>

                    <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 14,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
    ...elevation.sm,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eyebrow: {
    letterSpacing: 0.8,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  heroTotal: {
    fontSize: 28,
    lineHeight: 34,
  },
  driverBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statusTile: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  statusTileActive: {
    borderWidth: 2,
    transform: [{ scale: 1.02 }],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  heroDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  microRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  microItem: {
    alignItems: 'center',
    gap: 2,
  },
  microDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    ...elevation.sm,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    ...elevation.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  branchPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  branchPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  branchPillActive: {
    backgroundColor: colors.primary,
  },
  rosterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    paddingVertical: 0,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  vehicleList: {
    gap: 8,
  },
  vehicleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...elevation.sm,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  truckIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  vehicleStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  driverLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
