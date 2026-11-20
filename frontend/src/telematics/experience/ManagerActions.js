import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Linking,
  RefreshControl,
  Platform,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Card, Skeleton, SkeletonCard, BottomSheet, colors, spacing, radius, elevation } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useManagerData } from '../context/ManagerDataContext';
import useOwnerRequest from '../hooks/useOwnerRequest';
import { RequestState } from '../components/FormControls';
import { managerCardsFromResponse } from '../services/liveData';
import { DriverDetail, ManagerLive } from '../screens/ManagerScreens';
import FleetMap from '../components/FleetMap';
import { ActionButton, ExperiencePage, UnavailableScreen, useExperienceCopy } from './ExperienceUI';
import { GNB_LOGO_URI } from './gnbLogoUri';

function useCards() {
  const { service, branchId, lastPush } = useManagerData();
  const focused = useIsFocused();
  const branch = branchId === 'all' ? undefined : branchId;
  const request = useOwnerRequest(
    `manager-cards:${branchId}`,
    async () => managerCardsFromResponse(await service.managerCards(branch)),
    30000
  );
  const reload = request.reload;
  useEffect(() => {
    if (focused && lastPush?.event === 'card') reload();
  }, [focused, lastPush, reload]);
  return request;
}

function useActRate() {
  const { service, branchId } = useManagerData();
  const branch = branchId === 'all' ? undefined : branchId;
  return useOwnerRequest(
    `manager-act-rate:${branchId}`,
    async () => {
      try {
        const res = await service.managerCardsActRate(branch);
        return res?.data || res || null;
      } catch {
        return null;
      }
    },
    120000
  );
}

function formatRelativeTime(isoString) {
  if (!isoString) return '';
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  } catch {
    return '';
  }
}

export function ManagerActionHome({ navigation }) {
  const c = useExperienceCopy();
  const { user } = useAuth();
  const userName = user?.name || user?.firstName || (user?.phone ? `+${user.phone}` : 'Manager');
  const rawRole = (user?.role || '').toLowerCase();
  const userRole = rawRole === 'owner' ? 'Owner' : rawRole === 'manager' ? 'Branch Manager' : rawRole ? (rawRole.charAt(0).toUpperCase() + rawRole.slice(1)) : 'Branch Manager';
  const insets = useSafeAreaInsets();
  const { service, branchId, setBranchId, branches, data, refresh, loading: fleetLoading } = useManagerData();
  const request = useCards();
  const actRateReq = useActRate();

  const [filter, setFilter] = useState('all');
  const [showAllCards, setShowAllCards] = useState(false);
  const [branchSheetOpen, setBranchSheetOpen] = useState(false);
  const [snoozeModalCard, setSnoozeModalCard] = useState(null);
  const [safetyCallCard, setSafetyCallCard] = useState(null);
  const [actionInProgress, setActionInProgress] = useState({});

  const branch = branchId === 'all' ? undefined : branchId;
  const currentBranchName = branches.find((b) => b.id === branchId)?.name || c('allBranches');

  // Pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([request.reload(), refresh(), actRateReq.reload()]);
    setRefreshing(false);
  }, [request, refresh, actRateReq]);

  // Fleet Pulse metrics
  const vehicles = data?.vehicles || [];
  const movingVehicles = vehicles.filter((v) => v.status === 'moving').length;
  const idlingVehicles = vehicles.filter((v) => v.status === 'idling').length;
  const stoppedVehicles = vehicles.filter((v) => v.status === 'stopped').length;
  const offlineVehicles = vehicles.filter((v) => v.status === 'offline').length;
  const driversOnDuty = (data?.drivers || []).length;

  // Real operational telemetry metrics for home dashboard
  const totalDistanceToday = useMemo(() => {
    let km = 0;
    for (const v of vehicles) {
      if (Number.isFinite(v.todayKm) && v.todayKm > 0) km += v.todayKm;
    }
    if (km === 0 && Array.isArray(data?.trips)) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayTime = todayStart.getTime();
      for (const t of data.trips) {
        if (t.startedAt && new Date(t.startedAt).getTime() >= todayTime) {
          km += (Number(t.distanceKm) || 0);
        }
      }
    }
    return Math.round(km);
  }, [vehicles, data?.trips]);

  const lowFuelVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (Number.isFinite(v.primaryFuelLevel) && v.primaryFuelLevel > 0 && v.primaryFuelLevel < 20) return true;
      if (Number.isFinite(v.fuelLitres) && v.fuelLitres > 0 && v.fuelLitres < 35) return true;
      return false;
    });
  }, [vehicles]);

  const complianceIssuesCount = useMemo(() => {
    return vehicles.filter((v) => Array.isArray(v.missingDocTypes) && v.missingDocTypes.length > 0).length;
  }, [vehicles]);

  const recentAlerts = useMemo(() => {
    const list = data?.alertFeed?.items || data?.alerts || [];
    return list.slice(0, 3);
  }, [data?.alertFeed?.items, data?.alerts]);

  // Act rate metrics
  const actRateData = actRateReq.data;
  const totalActed = (actRateData?.types || []).reduce((acc, t) => acc + (t.acted || 0), 0);
  const totalDecided = (actRateData?.types || []).reduce((acc, t) => acc + ((t.acted || 0) + (t.dismissed || 0)), 0);
  const overallRate = totalDecided > 0 ? Math.round((totalActed / totalDecided) * 100) : null;

  // Cards data
  const rawCards = request.data || [];
  const filteredCards = useMemo(() => {
    return rawCards.filter((card) => {
      if (filter === 'urgent') return (card.score?.severity || 0) >= 2 || (card.priority || 0) > 50;
      if (filter === 'moving') return card.driverSide?.moving === true;
      if (filter === 'stopped') return card.driverSide?.moving === false;
      return true;
    });
  }, [rawCards, filter]);

  // M01 rule: top 3 cards expanded, rest collapsed
  const topCards = filteredCards.slice(0, 3);
  const remainingCards = filteredCards.slice(3);

  // M03: Card actions
  const handleMarkHandled = async (card) => {
    setActionInProgress((prev) => ({ ...prev, [card.id]: 'handling' }));
    try {
      await service.managerCardOutcome(card.id, { outcome: 'HANDLED', note: 'Marked resolved by manager' }, branch);
      await request.reload();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not mark card handled.');
    } finally {
      setActionInProgress((prev) => ({ ...prev, [card.id]: null }));
    }
  };

  const handleSnooze = async (card, minutes) => {
    setSnoozeModalCard(null);
    setActionInProgress((prev) => ({ ...prev, [card.id]: 'snoozing' }));
    try {
      const until = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      await service.snoozeManagerCard(card.id, { until }, branch);
      await request.reload();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not snooze card.');
    } finally {
      setActionInProgress((prev) => ({ ...prev, [card.id]: null }));
    }
  };

  const handleEscalate = async (card) => {
    setActionInProgress((prev) => ({ ...prev, [card.id]: 'escalating' }));
    try {
      await service.managerCardOutcome(card.id, { outcome: 'ESCALATED', note: 'Escalated to owner by manager' }, branch);
      await request.reload();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not escalate card.');
    } finally {
      setActionInProgress((prev) => ({ ...prev, [card.id]: null }));
    }
  };

  const handleCall = (card) => {
    const isMoving = card.driverSide?.moving;
    const speed = card.driverSide?.speedKmph;
    if (isMoving && speed && speed > 10) {
      setSafetyCallCard(card);
    } else {
      executeCall(card);
    }
  };

  const executeCall = (card) => {
    setSafetyCallCard(null);
    const phone =
      card.driverSide?.crew?.[0]?.phone ||
      card.subject?.phone ||
      card.driverSide?.phone ||
      '';
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {
        Alert.alert('Error', c('dialerFailed'));
      });
    } else {
      Alert.alert('Driver Call', 'No verified phone number linked to this driver.');
    }
  };

  const handleMessage = (card) => {
    if (card.actions?.messageConversationId) {
      navigation.navigate('Conversation', { id: card.actions.messageConversationId });
    } else {
      navigation.navigate('Messages');
    }
  };

  return (
    <View style={s.container}>
      {/* Top Header */}
      <View style={[s.topBar, { paddingTop: insets.top + 6 }]}>
        <View style={s.headerLeftLogo}>
          <Image
            source={{ uri: GNB_LOGO_URI }}
            style={s.headerLogo}
            resizeMode="contain"
            accessibilityLabel="GNB Motors"
          />
        </View>

        <View style={s.headerRightUser}>
          <AppText weight="extrabold" color={colors.text} numberOfLines={1} style={s.userNameText}>
            {userName}
          </AppText>
          <AppText weight="semibold" color={colors.textMuted} numberOfLines={1} style={s.userRoleText}>
            {userRole}
          </AppText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Fleet Pulse KPI Bar */}
        <View style={s.pulseSection}>
          <View style={s.pulseHeader}>
            <View style={s.pulseTitleRow}>
              <View style={s.liveDot} />
              <AppText variant="label" weight="extrabold" color={colors.text}>
                {c('fleetPulse')}
              </AppText>
            </View>

            {/* Authorised Branches Dropdown Pill right in Fleet Pulse */}
            <Pressable
              style={s.branchPillPulse}
              onPress={() => setBranchSheetOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={c('branchFilter')}
            >
              <Ionicons name="business" size={13} color={colors.primary} />
              <AppText variant="caption" weight="bold" color={colors.primaryDeep} numberOfLines={1} style={s.branchPillPulseText}>
                {currentBranchName}
              </AppText>
              <Ionicons name="chevron-down" size={11} color={colors.primary} />
            </Pressable>
          </View>

          <Card style={s.pulseCardRow} padding={0}>
            <Pressable
              style={s.pulseCol}
              onPress={() => navigation.navigate('Fleet map', { filter: 'moving' })}
              accessibilityRole="button"
              accessibilityLabel={`${c('moving')}: ${movingVehicles}`}
            >
              <View style={s.pulseColTop}>
                <View style={[s.statusDot, { backgroundColor: '#0C9F41' }]} />
                <AppText variant="caption" weight="bold" color={colors.textMuted} numberOfLines={1} style={s.pulseColLabel}>
                  {c('moving')}
                </AppText>
              </View>
              <AppText variant="h3" weight="extrabold" color={colors.text} style={s.pulseColNumber}>
                {movingVehicles}
              </AppText>
            </Pressable>

            <View style={s.pulseDivider} />

            <Pressable
              style={s.pulseCol}
              onPress={() => navigation.navigate('Fleet map', { filter: 'idling' })}
              accessibilityRole="button"
              accessibilityLabel={`${c('idling')}: ${idlingVehicles}`}
            >
              <View style={s.pulseColTop}>
                <View style={[s.statusDot, { backgroundColor: '#F97316' }]} />
                <AppText variant="caption" weight="bold" color={colors.textMuted} numberOfLines={1} style={s.pulseColLabel}>
                  {c('idling')}
                </AppText>
              </View>
              <AppText variant="h3" weight="extrabold" color={colors.text} style={s.pulseColNumber}>
                {idlingVehicles}
              </AppText>
            </Pressable>

            <View style={s.pulseDivider} />

            <Pressable
              style={s.pulseCol}
              onPress={() => navigation.navigate('Fleet map', { filter: 'stopped' })}
              accessibilityRole="button"
              accessibilityLabel={`${c('stopped')}: ${stoppedVehicles}`}
            >
              <View style={s.pulseColTop}>
                <View style={[s.statusDot, { backgroundColor: '#9333EA' }]} />
                <AppText variant="caption" weight="bold" color={colors.textMuted} numberOfLines={1} style={s.pulseColLabel}>
                  {c('stopped')}
                </AppText>
              </View>
              <AppText variant="h3" weight="extrabold" color={colors.text} style={s.pulseColNumber}>
                {stoppedVehicles}
              </AppText>
            </Pressable>

            <View style={s.pulseDivider} />

            <Pressable
              style={s.pulseCol}
              onPress={() => navigation.navigate('Fleet map', { filter: 'offline' })}
              accessibilityRole="button"
              accessibilityLabel={`${c('offline')}: ${offlineVehicles}`}
            >
              <View style={s.pulseColTop}>
                <View style={[s.statusDot, { backgroundColor: '#9CA3AF' }]} />
                <AppText variant="caption" weight="bold" color={colors.textMuted} numberOfLines={1} style={s.pulseColLabel}>
                  {c('offline')}
                </AppText>
              </View>
              <AppText variant="h3" weight="extrabold" color={colors.text} style={s.pulseColNumber}>
                {offlineVehicles}
              </AppText>
            </Pressable>

            <View style={s.pulseDivider} />

            <Pressable
              style={s.pulseCol}
              onPress={() => navigation.navigate('Duty board')}
              accessibilityRole="button"
              accessibilityLabel={`${c('onDuty')}: ${driversOnDuty}`}
            >
              <View style={s.pulseColTop}>
                <Ionicons name="people-outline" size={11} color={colors.primary} />
                <AppText variant="caption" weight="bold" color={colors.primary} numberOfLines={1} style={s.pulseColLabel}>
                  {c('onDuty')}
                </AppText>
              </View>
              <AppText variant="h3" weight="extrabold" color={colors.primaryDeep} style={s.pulseColNumber}>
                {driversOnDuty}
              </AppText>
            </Pressable>
          </Card>
        </View>

        {/* Fleet Today Highlights Bar */}
        <View style={s.highlightsCard}>
          <View style={s.highlightItem}>
            <View style={[s.highlightIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="speedometer-outline" size={17} color={colors.primary} />
            </View>
            <View style={s.highlightCol}>
              <AppText variant="caption" color={colors.textMuted} weight="bold" style={s.highlightLabel}>
                TODAY'S RUN
              </AppText>
              <AppText variant="h3" weight="extrabold" color={colors.text}>
                {totalDistanceToday.toLocaleString('en-IN')}{' '}
                <AppText variant="caption" weight="bold" color={colors.textMuted}>
                  km
                </AppText>
              </AppText>
            </View>
          </View>

          <View style={s.highlightDivider} />

          <View style={s.highlightItem}>
            <View style={[s.highlightIconCircle, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="git-network-outline" size={17} color={colors.success} />
            </View>
            <View style={s.highlightCol}>
              <AppText variant="caption" color={colors.textMuted} weight="bold" style={s.highlightLabel}>
                ON ROAD
              </AppText>
              <AppText variant="h3" weight="extrabold" color={colors.text}>
                {movingVehicles + idlingVehicles}{' '}
                <AppText variant="caption" weight="bold" color={colors.textMuted}>
                  / {vehicles.length}
                </AppText>
              </AppText>
            </View>
          </View>

          <View style={s.highlightDivider} />

          <View style={s.highlightItem}>
            <View
              style={[
                s.highlightIconCircle,
                { backgroundColor: lowFuelVehicles.length > 0 || (data?.alertFeed?.unacknowledgedCount || 0) > 0 ? '#FEF2F2' : '#F8FAFC' },
              ]}
            >
              <Ionicons
                name="warning-outline"
                size={17}
                color={lowFuelVehicles.length > 0 || (data?.alertFeed?.unacknowledgedCount || 0) > 0 ? colors.warning : colors.textMuted}
              />
            </View>
            <View style={s.highlightCol}>
              <AppText variant="caption" color={colors.textMuted} weight="bold" style={s.highlightLabel}>
                EXCEPTIONS
              </AppText>
              <AppText
                variant="h3"
                weight="extrabold"
                color={lowFuelVehicles.length > 0 || (data?.alertFeed?.unacknowledgedCount || 0) > 0 ? colors.warning : colors.text}
              >
                {(data?.alertFeed?.unacknowledgedCount || 0) + lowFuelVehicles.length}{' '}
                <AppText variant="caption" weight="bold" color={colors.textMuted}>
                  events
                </AppText>
              </AppText>
            </View>
          </View>
        </View>

        {/* Act-Rate Performance Tile (M17) */}
        {overallRate !== null && (
          <View style={s.actRateCard}>
            <View style={s.actRateLeft}>
              <View style={s.actRateIconWrap}>
                <Ionicons name="flash" size={16} color={colors.white} />
              </View>
              <View>
                <AppText variant="small" weight="bold" color={colors.white}>
                  {overallRate}% {c('actRateLabel')}
                </AppText>
                <AppText variant="caption" color="rgba(255,255,255,0.75)">
                  {totalActed} of {totalDecided} action cards resolved
                </AppText>
              </View>
            </View>
            <View style={s.actRateBadge}>
              <AppText variant="caption" weight="extrabold" color={colors.white}>
                30D METRIC
              </AppText>
            </View>
          </View>
        )}

        {/* Action Cards Header & Filters */}
        <View style={s.sectionHeaderRow}>
          <View style={s.sectionTitleWrap}>
            <AppText variant="h3" weight="extrabold">
              {c('topActions')}
            </AppText>
            <View style={s.countBadge}>
              <AppText variant="caption" weight="bold" color={colors.white}>
                {filteredCards.length}
              </AppText>
            </View>
          </View>
        </View>

        {/* Filter Chips */}
        <View style={s.filterRow}>
          {[
            { id: 'all', label: c('filterAll') },
            { id: 'urgent', label: c('filterUrgent') },
            { id: 'moving', label: c('filterMoving') },
            { id: 'stopped', label: c('filterStopped') },
          ].map((item) => {
            const active = filter === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setFilter(item.id)}
                style={[s.filterChip, active ? s.filterChipActive : s.filterChipInactive]}
              >
                <AppText
                  variant="caption"
                  weight={active ? 'bold' : 'semibold'}
                  color={active ? colors.white : colors.textMuted}
                >
                  {item.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {/* Skeleton loading state */}
        {request.loading && !request.data ? (
          <SkeletonCard count={3} />
        ) : request.error ? (
          <Card style={s.errorCard}>
            <Ionicons name="alert-circle-outline" size={28} color={colors.error} />
            <AppText weight="bold" color={colors.error}>
              {request.error}
            </AppText>
            <ActionButton label="Retry" tone="secondary" onPress={() => request.reload()} />
          </Card>
        ) : filteredCards.length === 0 ? (
          /* Operational All Clear State */
          <View style={s.allClearContainer}>
            <View style={s.allClearIconCircle}>
              <Ionicons name="shield-checkmark" size={38} color={colors.success} />
            </View>
            <AppText variant="h3" weight="extrabold" center color={colors.text}>
              {c('allClear')}
            </AppText>
            <AppText variant="body" muted center style={s.allClearText}>
              {c('allClearDesc')}
            </AppText>
          </View>
        ) : (
          /* Cards List */
          <View style={s.cardsStack}>
            {/* Top 3 Expanded Cards */}
            {topCards.map((card, idx) => (
              <RenderExpandedCard
                key={card.id || idx}
                card={card}
                c={c}
                navigation={navigation}
                onCall={handleCall}
                onMessage={handleMessage}
                onMarkHandled={handleMarkHandled}
                onSnooze={(c) => setSnoozeModalCard(c)}
                onEscalate={handleEscalate}
                actionLoading={actionInProgress[card.id]}
              />
            ))}

            {/* Cards 4+ Collapsed Accordion */}
            {remainingCards.length > 0 && (
              <View style={s.remainingSection}>
                <Pressable
                  style={s.toggleAccordionBtn}
                  onPress={() => setShowAllCards((prev) => !prev)}
                  accessibilityRole="button"
                >
                  <View style={s.toggleLeft}>
                    <Ionicons
                      name={showAllCards ? 'chevron-up-circle' : 'chevron-down-circle'}
                      size={20}
                      color={colors.primary}
                    />
                    <AppText weight="bold" color={colors.primaryDeep}>
                      {showAllCards
                        ? c('showLess')
                        : c('showMore').replace('{count}', String(remainingCards.length))}
                    </AppText>
                  </View>
                  <View style={s.remainingPill}>
                    <AppText variant="caption" weight="bold" color={colors.primaryDeep}>
                      +{remainingCards.length}
                    </AppText>
                  </View>
                </Pressable>

                {showAllCards ? (
                  remainingCards.map((card, idx) => (
                    <RenderExpandedCard
                      key={card.id || `rem-${idx}`}
                      card={card}
                      c={c}
                      navigation={navigation}
                      onCall={handleCall}
                      onMessage={handleMessage}
                      onMarkHandled={handleMarkHandled}
                      onSnooze={(c) => setSnoozeModalCard(c)}
                      onEscalate={handleEscalate}
                      actionLoading={actionInProgress[card.id]}
                    />
                  ))
                ) : (
                  /* Compact teaser preview for collapsed items */
                  <View style={s.collapsedTeasers}>
                    {remainingCards.map((card) => (
                      <Pressable
                        key={card.id}
                        style={s.teaserRow}
                        onPress={() => navigation.navigate('Manager action detail', { actionId: card.id })}
                      >
                        <View style={s.teaserLeft}>
                          <AppText weight="bold" numberOfLines={1} style={s.teaserFact}>
                            {card.fact || c('unknown')}
                          </AppText>
                          <AppText variant="caption" muted numberOfLines={1}>
                            {card.subject?.plate || card.subject?.label || 'Truck'} ·{' '}
                            {card.subject?.driverName || 'Driver'}
                          </AppText>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Quick Operational Launchpad */}
        <View style={s.launchpadSection}>
          <View style={s.launchpadHeader}>
            <AppText variant="label" weight="extrabold" color={colors.text}>
              OPERATIONAL HUB
            </AppText>
            <AppText variant="caption" color={colors.textMuted}>
              Everyday Tools & Workflows
            </AppText>
          </View>

          <View style={s.launchpadGrid}>
            <Pressable
              style={s.launchpadTile}
              onPress={() => navigation.navigate('Fleet map')}
              accessibilityRole="button"
            >
              <View style={[s.tileIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="map" size={20} color={colors.primary} />
              </View>
              <AppText variant="body" weight="extrabold" color={colors.text}>
                Live Fleet
              </AppText>
              <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                Map & Tracking
              </AppText>
            </Pressable>

            <Pressable
              style={s.launchpadTile}
              onPress={() => navigation.navigate('Duty board')}
              accessibilityRole="button"
            >
              <View style={[s.tileIconCircle, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="people" size={20} color={colors.success} />
              </View>
              <AppText variant="body" weight="extrabold" color={colors.text}>
                Duty Board
              </AppText>
              <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                Drivers & Hours
              </AppText>
            </Pressable>

            <Pressable
              style={s.launchpadTile}
              onPress={() => navigation.navigate('Manager approvals')}
              accessibilityRole="button"
            >
              <View style={[s.tileIconCircle, { backgroundColor: '#FAF5FF' }]}>
                <Ionicons name="checkmark-done-circle" size={20} color="#9333EA" />
              </View>
              <AppText variant="body" weight="extrabold" color={colors.text}>
                Approvals
              </AppText>
              <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                Bills & Advances
              </AppText>
            </Pressable>

            <Pressable
              style={s.launchpadTile}
              onPress={() => navigation.navigate('Fleet documents', { kind: 'documents' })}
              accessibilityRole="button"
            >
              <View style={[s.tileIconCircle, { backgroundColor: '#FFFBEB' }]}>
                <Ionicons name="document-text" size={20} color="#D97706" />
              </View>
              <AppText variant="body" weight="extrabold" color={colors.text}>
                Documents
              </AppText>
              <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                Permit, Tax, PUC
              </AppText>
            </Pressable>

            <Pressable
              style={s.launchpadTile}
              onPress={() => navigation.navigate('Fuel review', { kind: 'fuel' })}
              accessibilityRole="button"
            >
              <View style={[s.tileIconCircle, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="speedometer" size={20} color="#EF4444" />
              </View>
              <AppText variant="body" weight="extrabold" color={colors.text}>
                Fuel Logs
              </AppText>
              <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                Diesel & Mileage
              </AppText>
            </Pressable>

            <Pressable
              style={s.launchpadTile}
              onPress={() => navigation.navigate('Alerts')}
              accessibilityRole="button"
            >
              <View style={[s.tileIconCircle, { backgroundColor: '#FFF1F2' }]}>
                <Ionicons name="notifications" size={20} color="#E11D48" />
              </View>
              <AppText variant="body" weight="extrabold" color={colors.text}>
                Alerts
              </AppText>
              <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                Alarms & Geofence
              </AppText>
            </Pressable>
          </View>
        </View>

        {/* Recent Critical Alerts Ticker */}
        {recentAlerts.length > 0 && (
          <View style={s.recentAlertsSection}>
            <View style={s.recentAlertsHeader}>
              <View style={s.inlineCenter}>
                <Ionicons name="notifications-circle" size={18} color={colors.error} />
                <AppText variant="label" weight="extrabold" color={colors.text}>
                  RECENT EXCEPTIONS
                </AppText>
              </View>
              <Pressable onPress={() => navigation.navigate('Alerts')} hitSlop={8}>
                <AppText variant="small" weight="bold" color={colors.primary}>
                  View All ({data?.alertFeed?.unacknowledgedCount || recentAlerts.length}) →
                </AppText>
              </Pressable>
            </View>

            <Card padding={0} style={s.recentAlertsCard}>
              {recentAlerts.map((alert, idx) => {
                const isUrgent = alert.severity === 'CRITICAL' || alert.severity === 'HIGH' || alert.type?.includes('SPEED') || alert.type?.includes('THEFT');
                return (
                  <Pressable
                    key={alert.id || alert._id || idx}
                    style={[s.recentAlertRow, idx > 0 && s.recentAlertBorder]}
                    onPress={() => navigation.navigate('Alerts')}
                  >
                    <View style={[s.recentAlertDot, { backgroundColor: isUrgent ? colors.error : colors.warning }]} />
                    <View style={s.recentAlertMain}>
                      <View style={s.recentAlertTitleRow}>
                        <AppText variant="body" weight="bold" numberOfLines={1} color={colors.text}>
                          {alert.title || alert.type?.replace(/_/g, ' ') || 'Fleet Exception'}
                        </AppText>
                        <AppText variant="caption" mono color={colors.textMuted}>
                          {alert.plate || alert.vehicle?.registrationNumber || ''}
                        </AppText>
                      </View>
                      <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                        {alert.message || alert.description || 'Action recommended'}
                      </AppText>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                  </Pressable>
                );
              })}
            </Card>
          </View>
        )}

        {/* Compliance Warning Banner */}
        {complianceIssuesCount > 0 && (
          <Pressable
            style={s.complianceBanner}
            onPress={() => navigation.navigate('Fleet documents', { kind: 'documents' })}
            accessibilityRole="button"
          >
            <View style={s.complianceBannerIconWrap}>
              <Ionicons name="alert-circle" size={22} color="#D97706" />
            </View>
            <View style={s.complianceBannerContent}>
              <AppText variant="small" weight="extrabold" color="#92400E">
                {complianceIssuesCount} {complianceIssuesCount === 1 ? 'Truck has' : 'Trucks have'} Expired Documents
              </AppText>
              <AppText variant="caption" color="#B45309">
                National Permit, Fitness or Insurance renewal required
              </AppText>
            </View>
            <View style={s.complianceBannerAction}>
              <AppText variant="caption" weight="bold" color="#92400E">
                Review →
              </AppText>
            </View>
          </Pressable>
        )}
      </ScrollView>

      {/* Branch Selector BottomSheet */}
      <BottomSheet visible={branchSheetOpen} onClose={() => setBranchSheetOpen(false)}>
        <AppText variant="h3" weight="extrabold" style={s.sheetTitle}>
          {c('branchFilter')}
        </AppText>
        <ScrollView style={s.branchList}>
          {branches.map((b) => {
            const isSelected = b.id === branchId;
            return (
              <Pressable
                key={b.id}
                style={[s.branchOption, isSelected && s.branchOptionSelected]}
                onPress={() => {
                  setBranchId(b.id);
                  setBranchSheetOpen(false);
                }}
              >
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'business-outline'}
                  size={20}
                  color={isSelected ? colors.primary : colors.textMuted}
                />
                <AppText weight={isSelected ? 'bold' : 'normal'} color={isSelected ? colors.primary : colors.text}>
                  {b.name || (b.id === 'all' ? c('allBranches') : b.id)}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheet>

      {/* Snooze Options BottomSheet */}
      <BottomSheet visible={!!snoozeModalCard} onClose={() => setSnoozeModalCard(null)}>
        <AppText variant="h3" weight="extrabold" style={s.sheetTitle}>
          {c('snoozeCard')}
        </AppText>
        <AppText variant="caption" muted>
          Temporarily hide this card until the timer elapses.
        </AppText>
        <View style={s.snoozeOptions}>
          <Pressable style={s.snoozeRow} onPress={() => handleSnooze(snoozeModalCard, 30)}>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <AppText weight="bold">{c('snooze30m')}</AppText>
          </Pressable>
          <Pressable style={s.snoozeRow} onPress={() => handleSnooze(snoozeModalCard, 120)}>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <AppText weight="bold">{c('snooze2h')}</AppText>
          </Pressable>
          <Pressable style={s.snoozeRow} onPress={() => handleSnooze(snoozeModalCard, 960)}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <AppText weight="bold">{c('snoozeTomorrow')}</AppText>
          </Pressable>
        </View>
      </BottomSheet>

      {/* Moving Safety Confirmation Modal */}
      <Modal
        visible={!!safetyCallCard}
        transparent
        animationType="fade"
        onRequestClose={() => setSafetyCallCard(null)}
      >
        <View style={s.modalScrim}>
          <View style={s.modalCard}>
            <View style={s.modalWarningIcon}>
              <Ionicons name="warning" size={32} color={colors.warning} />
            </View>
            <AppText variant="h3" weight="extrabold" center>
              Driver is in Motion
            </AppText>
            <AppText variant="body" muted center style={s.modalText}>
              {c('movingSafetyWarning').replace('{speed}', String(safetyCallCard?.driverSide?.speedKmph || 0))}
            </AppText>
            <View style={s.modalBtnRow}>
              <Pressable style={s.modalCancelBtn} onPress={() => setSafetyCallCard(null)}>
                <AppText weight="bold" color={colors.textMuted}>
                  {c('cancel')}
                </AppText>
              </Pressable>
              <Pressable style={s.modalConfirmBtn} onPress={() => executeCall(safetyCallCard)}>
                <Ionicons name="call" size={16} color={colors.white} />
                <AppText weight="bold" color={colors.white}>
                  Call Anyway
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** Render a single expanded action card with live telemetry & action buttons */
function RenderExpandedCard({
  card,
  c,
  navigation,
  onCall,
  onMessage,
  onMarkHandled,
  onSnooze,
  onEscalate,
  actionLoading,
}) {
  const isMoving = card.driverSide?.moving;
  const speed = card.driverSide?.speedKmph;
  const severity = card.score?.severity || 1;
  const isUrgent = severity >= 2 || (card.priority || 0) > 50;

  return (
    <Card
      style={[
        s.cardContainer,
        isUrgent && s.cardUrgentBorder,
      ]}
      onPress={() => navigation.navigate('Manager action detail', { actionId: card.id })}
    >
      {/* Top Meta Line: Severity Pill, Time Ago, Chevron */}
      <View style={s.cardTopRow}>
        <View style={s.pillGroup}>
          <View
            style={[
              s.severityPill,
              isUrgent ? s.severityUrgent : s.severityNotice,
            ]}
          >
            <AppText
              variant="caption"
              weight="extrabold"
              color={isUrgent ? colors.error : colors.primaryDeep}
            >
              {isUrgent ? 'URGENT' : 'ACTION NEEDED'}
            </AppText>
          </View>

          {card.type ? (
            <View style={s.typePill}>
              <AppText variant="caption" weight="semibold" color={colors.textMuted}>
                {card.type.replace(/_/g, ' ')}
              </AppText>
            </View>
          ) : null}
        </View>

        <View style={s.cardTopRight}>
          <AppText variant="caption" mono muted>
            {formatRelativeTime(card.openedAt)}
          </AppText>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </View>

      {/* Main Fact Statement */}
      <AppText variant="bodyStrong" weight="extrabold" style={s.cardFactText}>
        {card.fact || c('unknown')}
      </AppText>

      {/* Subject Line (Vehicle plate, Driver name, Site) */}
      <View style={s.subjectRow}>
        <View style={s.subjectBadge}>
          <Ionicons name="car-outline" size={14} color={colors.text} />
          <AppText variant="caption" weight="bold" color={colors.text}>
            {card.subject?.plate || card.subject?.label || c('unknown')}
          </AppText>
        </View>

        {card.subject?.driverName ? (
          <View style={s.subjectBadge}>
            <Ionicons name="person-outline" size={14} color={colors.text} />
            <AppText variant="caption" weight="bold" color={colors.text}>
              {card.subject.driverName}
            </AppText>
          </View>
        ) : null}

        {card.subject?.siteName ? (
          <View style={s.subjectBadge}>
            <Ionicons name="location-outline" size={14} color={colors.text} />
            <AppText variant="caption" weight="bold" color={colors.text}>
              {card.subject.siteName}
            </AppText>
          </View>
        ) : null}
      </View>

      {/* Live Telemetry Context (Speed, Motion, At-Wheel) */}
      <View style={s.telemetryRow}>
        {isMoving !== null && (
          <View style={s.telemetryItem}>
            <View
              style={[
                s.miniDot,
                { backgroundColor: isMoving ? colors.success : '#9CA3AF' },
              ]}
            />
            <AppText variant="caption" weight="bold" color={isMoving ? colors.success : colors.textMuted}>
              {isMoving ? `Moving · ${speed ? `${speed} km/h` : 'In transit'}` : 'Stationary'}
            </AppText>
          </View>
        )}

        {card.driverSide?.atWheel?.status && (
          <View style={s.telemetryItem}>
            <Ionicons name="disc-outline" size={13} color={colors.primary} />
            <AppText variant="caption" weight="semibold" color={colors.textMuted}>
              {card.driverSide.atWheel.status}
            </AppText>
          </View>
        )}
      </View>

      {/* Safety caution notice if vehicle is moving */}
      {isMoving && (
        <View style={s.safetyNoticeBox}>
          <Ionicons name="information-circle-outline" size={14} color={colors.warning} />
          <AppText variant="caption" weight="semibold" color="#92400E" style={s.safetyNoticeText}>
            Vehicle in motion. Phone call requires safety confirmation.
          </AppText>
        </View>
      )}

      {/* Driver explanation note if available */}
      {card.driverSide?.explanation ? (
        <View style={s.driverExplanationBox}>
          <AppText variant="caption" weight="bold" color={colors.primaryDeep}>
            Driver's Note:
          </AppText>
          <AppText variant="caption" color={colors.text}>
            "{card.driverSide.explanation}"
          </AppText>
        </View>
      ) : null}

      {/* M03: Action Buttons Bar */}
      <View style={s.actionBtnBar}>
        {/* Call Driver */}
        <Pressable
          style={[s.cardActionBtn, s.callBtn]}
          onPress={() => onCall(card)}
          accessibilityRole="button"
          accessibilityLabel={c('callDriver')}
        >
          <Ionicons name="call" size={14} color={colors.white} />
          <AppText variant="caption" weight="bold" color={colors.white}>
            {c('callDriver')}
          </AppText>
        </Pressable>

        {/* Message Driver */}
        <Pressable
          style={[s.cardActionBtn, s.msgBtn]}
          onPress={() => onMessage(card)}
          accessibilityRole="button"
          accessibilityLabel={c('messageDriver')}
        >
          <Ionicons name="chatbubble-ellipses" size={14} color={colors.primaryDeep} />
          <AppText variant="caption" weight="bold" color={colors.primaryDeep}>
            {c('messageDriver')}
          </AppText>
        </Pressable>

        {/* Handled / Resolve */}
        <Pressable
          style={[s.cardActionBtn, s.handledBtn]}
          onPress={() => onMarkHandled(card)}
          disabled={actionLoading === 'handling'}
          accessibilityRole="button"
          accessibilityLabel={c('markHandled')}
        >
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <AppText variant="caption" weight="bold" color={colors.success}>
            {c('markHandled')}
          </AppText>
        </Pressable>

        {/* Snooze */}
        <Pressable
          style={[s.iconActionBtn]}
          onPress={() => onSnooze(card)}
          accessibilityRole="button"
          accessibilityLabel={c('snoozeCard')}
        >
          <Ionicons name="time-outline" size={16} color={colors.textMuted} />
        </Pressable>

        {/* Escalate */}
        <Pressable
          style={[s.iconActionBtn]}
          onPress={() => onEscalate(card)}
          accessibilityRole="button"
          accessibilityLabel={c('escalateCard')}
        >
          <Ionicons name="arrow-up-circle-outline" size={16} color={colors.textMuted} />
        </Pressable>
      </View>
    </Card>
  );
}

/** Upgraded Action Detail (M02) */
export function ActionDetail({ navigation, route }) {
  const c = useExperienceCopy();
  const request = useCards();
  const { service, branchId, data } = useManagerData();
  const branch = branchId === 'all' ? undefined : branchId;

  const card = request.data?.find((item) => item.id === route.params?.actionId);
  const isMoving = card?.driverSide?.moving;
  const speed = card?.driverSide?.speedKmph;

  const [snoozeModalOpen, setSnoozeModalOpen] = useState(false);
  const [safetyCallOpen, setSafetyCallOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  // Vehicle position for Map (M02)
  const vehicle = data?.vehicles?.find(
    (v) => v.id === card?.subject?.vehicleId || v.plate === card?.subject?.plate
  );

  const handleCall = () => {
    if (isMoving && speed && speed > 10) {
      setSafetyCallOpen(true);
    } else {
      executeCall();
    }
  };

  const executeCall = () => {
    setSafetyCallOpen(false);
    const phone =
      card?.driverSide?.crew?.[0]?.phone ||
      card?.subject?.phone ||
      card?.driverSide?.phone ||
      '';
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', c('dialerFailed')));
    } else {
      Alert.alert('Call Driver', 'No verified phone number linked to this driver.');
    }
  };

  const handleMarkHandled = async () => {
    setActionLoading('handled');
    try {
      await service.managerCardOutcome(card.id, { outcome: 'HANDLED', note: 'Resolved on detail screen' }, branch);
      await request.reload();
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not mark handled.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSnooze = async (minutes) => {
    setSnoozeModalOpen(false);
    setActionLoading('snooze');
    try {
      const until = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      await service.snoozeManagerCard(card.id, { until }, branch);
      await request.reload();
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not snooze card.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEscalate = async () => {
    setActionLoading('escalate');
    try {
      await service.managerCardOutcome(card.id, { outcome: 'ESCALATED', note: 'Escalated to owner from detail screen' }, branch);
      await request.reload();
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not escalate card.');
    } finally {
      setActionLoading(null);
    }
  };

  // Build Incident Timeline events (M02)
  const timelineEvents = useMemo(() => {
    if (!card) return [];
    const events = [];

    if (card.openedAt) {
      events.push({
        at: card.openedAt,
        title: 'Action Card Triggered',
        desc: card.threshold
          ? `Threshold ${card.threshold.name || ''} (${card.threshold.value ?? ''} ${card.threshold.unit || ''}) exceeded.`
          : card.fact,
        icon: 'alert-circle',
        color: colors.error,
      });
    }

    if (card.driverSide?.positionAt || card.driverSide?.atWheel?.at) {
      events.push({
        at: card.driverSide?.positionAt || card.driverSide?.atWheel?.at,
        title: 'Driver Telemetry Captured',
        desc: `${card.driverSide?.moving ? `Moving at ${card.driverSide.speedKmph || 0} km/h` : 'Vehicle stationary'} · At-Wheel: ${card.driverSide?.atWheel?.status || 'Active'} (${card.driverSide?.atWheel?.confidence ? Math.round(card.driverSide.atWheel.confidence * 100) : 80}% conf)`,
        icon: 'speedometer',
        color: colors.primary,
      });
    }

    if (card.driverSide?.explanation) {
      events.push({
        at: card.driverSide?.positionAt || card.openedAt,
        title: 'Driver Statement Provided',
        desc: `"${card.driverSide.explanation}" (Source: ${card.driverSide.explanationSource || 'Driver App'})`,
        icon: 'chatbubble-ellipses',
        color: colors.primaryDeep,
      });
    }

    (card.actionHistory || []).forEach((act) => {
      events.push({
        at: act.at,
        title: act.action === 'CALL' ? 'Manager Called Driver' : act.action === 'SNOOZE' ? 'Card Snoozed' : act.action === 'MARK_HANDLED' ? 'Marked Handled' : act.action,
        desc: act.detail ? (typeof act.detail === 'string' ? act.detail : JSON.stringify(act.detail)) : 'Action recorded by manager',
        icon: 'checkmark-circle',
        color: colors.success,
      });
    });

    (card.outcomes || []).forEach((out) => {
      events.push({
        at: out.at,
        title: `Outcome: ${out.outcome}`,
        desc: out.note || 'Outcome logged',
        icon: 'flag',
        color: colors.primaryDeep,
      });
    });

    events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    return events;
  }, [card]);

  return (
    <ExperiencePage title={c('managerCards')} navigation={navigation}>
      <RequestState request={request} />
      {card ? (
        <View style={{ gap: 16 }}>
          {/* Card Hero Summary */}
          <Card style={{ gap: 12 }}>
            <View style={s.cardTopRow}>
              <View style={s.pillGroup}>
                <View style={[s.severityPill, card.state === 'HANDLED' ? { backgroundColor: colors.validBg } : s.severityUrgent]}>
                  <AppText variant="caption" weight="extrabold" color={card.state === 'HANDLED' ? colors.success : colors.error}>
                    {card.state || 'OPEN'}
                  </AppText>
                </View>
                {card.type ? (
                  <View style={s.typePill}>
                    <AppText variant="caption" weight="bold" color={colors.textMuted}>
                      {card.type.replace(/_/g, ' ')}
                    </AppText>
                  </View>
                ) : null}
              </View>
              <AppText variant="caption" mono muted>
                {formatRelativeTime(card.openedAt)}
              </AppText>
            </View>

            <AppText variant="h3" weight="extrabold" style={{ fontSize: 17, lineHeight: 24 }}>
              {card.fact || c('unknown')}
            </AppText>

            <View style={s.subjectRow}>
              <View style={s.subjectBadge}>
                <Ionicons name="car-outline" size={14} color={colors.text} />
                <AppText weight="bold">{card.subject?.plate || c('unknown')}</AppText>
              </View>
              {card.subject?.driverName ? (
                <View style={s.subjectBadge}>
                  <Ionicons name="person-outline" size={14} color={colors.text} />
                  <AppText weight="bold">{card.subject.driverName}</AppText>
                </View>
              ) : null}
              {card.subject?.siteName ? (
                <View style={s.subjectBadge}>
                  <Ionicons name="location-outline" size={14} color={colors.text} />
                  <AppText weight="bold">{card.subject.siteName}</AppText>
                </View>
              ) : null}
            </View>
          </Card>

          {/* Incident Location on Map (M02) */}
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="h3" weight="extrabold">Incident Location</AppText>
              <Pressable onPress={() => navigation.navigate('Fleet map')} hitSlop={8}>
                <AppText variant="small" weight="bold" color={colors.primary}>Full Map →</AppText>
              </Pressable>
            </View>
            {vehicle?.coordinates ? (
              <View style={{ borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
                <FleetMap vehicles={[vehicle]} />
              </View>
            ) : (
              <Card style={{ gap: 6, alignItems: 'center', padding: 20 }}>
                <Ionicons name="map-outline" size={28} color={colors.textMuted} />
                <AppText weight="bold">Position Recorded at Incident</AppText>
                <AppText variant="caption" muted center>
                  {card.subject?.plate || 'Vehicle'} · {card.subject?.siteName || 'En-route on trip corridor'}
                </AppText>
              </Card>
            )}
          </View>

          {/* The Driver's Side & Crew (M02) */}
          <View style={{ gap: 8 }}>
            <AppText variant="h3" weight="extrabold">The Driver's Side</AppText>
            <Card style={{ gap: 12 }}>
              <View style={s.telemetryRow}>
                <View style={[s.miniDot, { backgroundColor: isMoving ? colors.success : '#9CA3AF' }]} />
                <AppText variant="small" weight="bold" color={isMoving ? colors.success : colors.textMuted}>
                  {isMoving ? `Vehicle Moving · ${speed || 0} km/h` : 'Vehicle Stationary'}
                </AppText>
              </View>

              <View style={s.telemetryRow}>
                <Ionicons name="disc-outline" size={14} color={colors.primary} />
                <AppText variant="small" weight="semibold">
                  At-Wheel: {card.driverSide?.atWheel?.status || 'Active'}{' '}
                  {card.driverSide?.atWheel?.confidence ? `(${Math.round(card.driverSide.atWheel.confidence * 100)}% confidence)` : ''}
                </AppText>
              </View>

              {isMoving && (
                <View style={s.safetyNoticeBox}>
                  <Ionicons name="warning-outline" size={16} color={colors.warning} />
                  <AppText variant="caption" weight="semibold" color="#92400E" style={{ flex: 1 }}>
                    Vehicle currently in motion at {speed || 0} km/h. Phone call requires driver safety verification.
                  </AppText>
                </View>
              )}

              {card.driverSide?.explanation ? (
                <View style={s.driverExplanationBox}>
                  <AppText variant="caption" weight="extrabold" color={colors.primaryDeep}>
                    Driver's Statement:
                  </AppText>
                  <AppText variant="body" color={colors.text}>
                    "{card.driverSide.explanation}"
                  </AppText>
                  {card.driverSide?.explanationSource ? (
                    <AppText variant="caption" mono muted>
                      Source: {card.driverSide.explanationSource}
                    </AppText>
                  ) : null}
                </View>
              ) : null}

              {/* Crew members list */}
              {Array.isArray(card.driverSide?.crew) && card.driverSide.crew.length > 0 && (
                <View style={{ gap: 6, marginTop: 4 }}>
                  <AppText variant="caption" weight="bold" color={colors.textMuted}>Assigned Crew Members:</AppText>
                  {card.driverSide.crew.map((member, idx) => (
                    <View key={member.driverId || idx} style={[s.subjectBadge, { justifyContent: 'space-between' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="person" size={14} color={colors.primary} />
                        <AppText weight="bold">{member.name || 'Crew member'}</AppText>
                        {member.role ? <AppText variant="caption" muted>({member.role})</AppText> : null}
                      </View>
                      {member.atWheel && (
                        <View style={[s.severityPill, { backgroundColor: colors.tealTint }]}>
                          <AppText variant="caption" weight="bold" color={colors.primaryDeep}>AT WHEEL</AppText>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </Card>
          </View>

          {/* Incident Timeline (M02) */}
          <View style={{ gap: 8 }}>
            <AppText variant="h3" weight="extrabold">Incident Timeline</AppText>
            <Card style={{ gap: 12 }}>
              {timelineEvents.map((evt, idx) => (
                <View key={idx} style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ alignItems: 'center', width: 24 }}>
                    <Ionicons name={evt.icon || 'ellipse'} size={18} color={evt.color || colors.primary} />
                    {idx < timelineEvents.length - 1 && (
                      <View style={{ width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 4 }} />
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 2, paddingBottom: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <AppText weight="bold" style={{ fontSize: 13 }}>{evt.title}</AppText>
                      <AppText variant="caption" mono muted>{formatRelativeTime(evt.at)}</AppText>
                    </View>
                    <AppText variant="caption" muted style={{ lineHeight: 18 }}>{evt.desc}</AppText>
                  </View>
                </View>
              ))}
            </Card>
          </View>

          {/* Evidence Records (M02) */}
          <View style={{ gap: 8 }}>
            <AppText variant="h3" weight="extrabold">{c('evidence')}</AppText>
            {(card.evidence || []).map((item, index) => (
              <Card key={`${item.source}:${index}`} style={{ gap: 6 }}>
                <View style={s.pillGroup}>
                  <AppText weight="bold">{item.source || c('unknown')}</AppText>
                  {item.confidence !== null && (
                    <View style={s.typePill}>
                      <AppText variant="caption" weight="bold" color={colors.primaryDeep}>
                        {Math.round(item.confidence * 100)}% confidence
                      </AppText>
                    </View>
                  )}
                </View>
                {item.detail ? <AppText muted variant="small">{item.detail}</AppText> : null}
                {item.at ? <AppText variant="caption" mono muted>{formatRelativeTime(item.at)}</AppText> : null}
              </Card>
            ))}
          </View>

          {/* M03 Actions Suite */}
          <View style={{ gap: 10, marginTop: 6, marginBottom: 20 }}>
            <ActionButton label={c('callDriver')} onPress={handleCall} />
            <ActionButton
              label={c('markHandled')}
              tone="secondary"
              disabled={actionLoading === 'handled'}
              onPress={handleMarkHandled}
            />
            <ActionButton
              label={c('snoozeCard')}
              tone="secondary"
              onPress={() => setSnoozeModalOpen(true)}
            />
            <ActionButton
              label={c('escalateCard')}
              tone="secondary"
              onPress={handleEscalate}
            />

            {card.subject?.vehicleId ? (
              <ActionButton
                label={c('vehicle')}
                tone="secondary"
                onPress={() => navigation.navigate('Vehicle detail', { id: card.subject.vehicleId })}
              />
            ) : null}

            {card.subject?.driverId ? (
              <ActionButton
                label={c('driver')}
                tone="secondary"
                onPress={() => navigation.navigate('Driver detail', { id: card.subject.driverId })}
              />
            ) : null}

            {card.actions?.messageConversationId ? (
              <ActionButton
                label={c('crewMessages')}
                tone="secondary"
                onPress={() => navigation.navigate('Conversation', { id: card.actions.messageConversationId })}
              />
            ) : null}
          </View>

          {/* Snooze Options BottomSheet */}
          <BottomSheet visible={snoozeModalOpen} onClose={() => setSnoozeModalOpen(false)}>
            <AppText variant="h3" weight="extrabold" style={s.sheetTitle}>
              {c('snoozeCard')}
            </AppText>
            <View style={s.snoozeOptions}>
              <Pressable style={s.snoozeRow} onPress={() => handleSnooze(30)}>
                <Ionicons name="time-outline" size={20} color={colors.primary} />
                <AppText weight="bold">{c('snooze30m')}</AppText>
              </Pressable>
              <Pressable style={s.snoozeRow} onPress={() => handleSnooze(120)}>
                <Ionicons name="time-outline" size={20} color={colors.primary} />
                <AppText weight="bold">{c('snooze2h')}</AppText>
              </Pressable>
              <Pressable style={s.snoozeRow} onPress={() => handleSnooze(960)}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <AppText weight="bold">{c('snoozeTomorrow')}</AppText>
              </Pressable>
            </View>
          </BottomSheet>

          {/* Safety Confirmation Modal */}
          <Modal visible={safetyCallOpen} transparent animationType="fade" onRequestClose={() => setSafetyCallOpen(false)}>
            <View style={s.modalScrim}>
              <View style={s.modalCard}>
                <View style={s.modalWarningIcon}>
                  <Ionicons name="warning" size={32} color={colors.warning} />
                </View>
                <AppText variant="h3" weight="extrabold" center>Driver is in Motion</AppText>
                <AppText variant="body" muted center style={s.modalText}>
                  {c('movingSafetyWarning').replace('{speed}', String(speed || 0))}
                </AppText>
                <View style={s.modalBtnRow}>
                  <Pressable style={s.modalCancelBtn} onPress={() => setSafetyCallOpen(false)}>
                    <AppText weight="bold" color={colors.textMuted}>{c('cancel')}</AppText>
                  </Pressable>
                  <Pressable style={s.modalConfirmBtn} onPress={executeCall}>
                    <Ionicons name="call" size={16} color={colors.white} />
                    <AppText weight="bold" color={colors.white}>Call Anyway</AppText>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      ) : !request.loading && !request.error ? (
        <AppText muted>{c('unknown')}</AppText>
      ) : null}
    </ExperiencePage>
  );
}

export const ManagerLiveSurface = ManagerLive;
export const DriverTimeline = UnavailableScreen;
export const DriverHelpfulCards = UnavailableScreen;
export function ManagerReviews({ navigation }) {
  const c = useExperienceCopy();
  return (
    <ExperiencePage title={c('approvals')} navigation={navigation}>
      <ActionButton label={c('addFuel')} onPress={() => navigation.navigate('Fuel review')} />
      <ActionButton label={c('reviewPapers')} tone="secondary" onPress={() => navigation.navigate('Fleet documents')} />
      <ActionButton label={c('workshopBill')} tone="secondary" onPress={() => navigation.navigate('Maintenance')} />
    </ExperiencePage>
  );
}
export function ManagerDriverDetail(props) {
  return (
    <DriverDetail
      {...props}
      route={{
        ...props.route,
        params: { ...props.route?.params, id: props.route?.params?.driverId || props.route?.params?.id },
      }}
    />
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 8,
    paddingRight: 14,
    paddingBottom: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeftLogo: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 2,
  },
  headerLogo: {
    width: 88,
    height: 46,
  },
  headerRightUser: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
    paddingLeft: 10,
  },
  userNameText: {
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'right',
  },
  userRoleText: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'right',
  },
  branchPillPulse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.tealTint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  branchPillPulseText: {
    fontSize: 11,
    lineHeight: 15,
    maxWidth: 150,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  pulseSection: {
    gap: 10,
  },
  pulseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  pulseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  pulseCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: colors.hairline,
    ...elevation.sm,
  },
  pulseCol: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 1,
  },
  pulseColTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  pulseColLabel: {
    fontSize: 10,
    lineHeight: 13,
  },
  pulseColNumber: {
    fontSize: 18,
    lineHeight: 22,
    marginTop: 3,
  },
  pulseDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.hairline,
  },
  pulseScroll: {
    gap: 10,
    paddingVertical: 2,
  },
  pulseTile: {
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    minWidth: 100,
    gap: 4,
    ...elevation.sm,
  },
  tileDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  actRateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...elevation.sm,
  },
  actRateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actRateIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actRateBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  filterChipActive: {
    backgroundColor: colors.black,
  },
  filterChipInactive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardsStack: {
    gap: 14,
  },
  cardContainer: {
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardUrgentBorder: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFDFD',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pillGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  severityPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  severityUrgent: {
    backgroundColor: '#FEE2E2',
  },
  severityNotice: {
    backgroundColor: colors.tealTint,
  },
  typePill: {
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  cardTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardFactText: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  subjectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  telemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  telemetryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  safetyNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  safetyNoticeText: {
    flex: 1,
  },
  driverExplanationBox: {
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: radius.sm,
    gap: 2,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  actionBtnBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    flex: 1,
  },
  callBtn: {
    backgroundColor: colors.primary,
  },
  msgBtn: {
    backgroundColor: colors.tealTint,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  handledBtn: {
    backgroundColor: colors.validBg,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  iconActionBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  remainingSection: {
    gap: 10,
  },
  toggleAccordionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.sm,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  remainingPill: {
    backgroundColor: colors.tealTint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  collapsedTeasers: {
    gap: 8,
  },
  teaserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  teaserLeft: {
    flex: 1,
    gap: 2,
    marginRight: 8,
  },
  teaserFact: {
    fontSize: 14,
    color: colors.text,
  },
  allClearContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.sm,
  },
  allClearIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.validBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  allClearText: {
    maxWidth: 320,
    lineHeight: 20,
  },
  shortcutsContainer: {
    width: '100%',
    gap: 8,
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  shortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  shortcutContent: {
    flex: 1,
    gap: 2,
  },
  errorCard: {
    alignItems: 'center',
    gap: 12,
    padding: 20,
  },
  sheetTitle: {
    marginBottom: 10,
  },
  branchList: {
    maxHeight: 280,
  },
  branchOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  branchOptionSelected: {
    backgroundColor: colors.tealTint,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
  },
  snoozeOptions: {
    gap: 10,
    marginTop: 12,
  },
  snoozeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.background,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 22,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: 12,
    ...elevation.md,
  },
  modalWarningIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalText: {
    lineHeight: 20,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  highlightsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.hairline,
    ...elevation.sm,
  },
  highlightItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  highlightIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightCol: {
    flex: 1,
    minWidth: 0,
  },
  highlightLabel: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
  highlightDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.hairline,
    marginHorizontal: 8,
  },
  launchpadSection: {
    gap: 10,
    marginTop: 4,
  },
  launchpadHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  launchpadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  launchpadTile: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.hairline,
    gap: 4,
    ...elevation.sm,
  },
  tileIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  recentAlertsSection: {
    gap: 10,
    marginTop: 4,
  },
  recentAlertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  inlineCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentAlertsCard: {
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  recentAlertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  recentAlertBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  recentAlertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recentAlertMain: {
    flex: 1,
    gap: 2,
  },
  recentAlertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  complianceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: radius.lg,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  complianceBannerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  complianceBannerContent: {
    flex: 1,
    gap: 1,
  },
  complianceBannerAction: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
