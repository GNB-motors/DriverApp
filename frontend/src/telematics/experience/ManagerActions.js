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
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Card, Skeleton, SkeletonCard, BottomSheet, colors, spacing, radius, elevation } from '../../components/ui';
import { useManagerData } from '../context/ManagerDataContext';
import useOwnerRequest from '../hooks/useOwnerRequest';
import { RequestState } from '../components/FormControls';
import { managerCardsFromResponse } from '../services/liveData';
import { DriverDetail, ManagerLive } from '../screens/ManagerScreens';
import { ActionButton, ExperiencePage, UnavailableScreen, useExperienceCopy } from './ExperienceUI';

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
      <View style={[s.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <View style={s.headerLeft}>
          <AppText variant="h2" weight="extrabold" color={colors.text}>
            {c('managerCards')}
          </AppText>
          <Pressable
            style={s.branchPill}
            onPress={() => setBranchSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={c('branchFilter')}
          >
            <Ionicons name="business-outline" size={14} color={colors.primary} />
            <AppText variant="caption" weight="bold" color={colors.primaryDeep} numberOfLines={1}>
              {currentBranchName}
            </AppText>
            <Ionicons name="chevron-down" size={13} color={colors.primary} />
          </Pressable>
        </View>

        <Pressable
          style={s.refreshBtn}
          onPress={onRefresh}
          accessibilityRole="button"
          accessibilityLabel="Refresh"
        >
          <Ionicons name="refresh-outline" size={20} color={colors.textMuted} />
        </Pressable>
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
              <AppText variant="label" weight="bold" color={colors.text}>
                {c('fleetPulse')}
              </AppText>
            </View>
            <Pressable onPress={() => navigation.navigate('Fleet map')} hitSlop={8}>
              <AppText variant="small" weight="bold" color={colors.primary}>
                {c('liveFleetMap')} →
              </AppText>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pulseScroll}>
            <Pressable
              style={[s.pulseTile, { borderLeftColor: colors.success }]}
              onPress={() => navigation.navigate('Fleet map')}
            >
              <View style={s.tileDotRow}>
                <View style={[s.statusDot, { backgroundColor: colors.success }]} />
                <AppText variant="caption" weight="bold" color={colors.textMuted}>
                  {c('moving')}
                </AppText>
              </View>
              <AppText variant="h3" weight="extrabold" color={colors.text}>
                {movingVehicles}
              </AppText>
            </Pressable>

            <Pressable
              style={[s.pulseTile, { borderLeftColor: colors.warning }]}
              onPress={() => navigation.navigate('Fleet map')}
            >
              <View style={s.tileDotRow}>
                <View style={[s.statusDot, { backgroundColor: colors.warning }]} />
                <AppText variant="caption" weight="bold" color={colors.textMuted}>
                  {c('idling')}
                </AppText>
              </View>
              <AppText variant="h3" weight="extrabold" color={colors.text}>
                {idlingVehicles}
              </AppText>
            </Pressable>

            <Pressable
              style={[s.pulseTile, { borderLeftColor: '#6B7280' }]}
              onPress={() => navigation.navigate('Fleet map')}
            >
              <View style={s.tileDotRow}>
                <View style={[s.statusDot, { backgroundColor: '#6B7280' }]} />
                <AppText variant="caption" weight="bold" color={colors.textMuted}>
                  {c('stopped')}
                </AppText>
              </View>
              <AppText variant="h3" weight="extrabold" color={colors.text}>
                {stoppedVehicles}
              </AppText>
            </Pressable>

            <Pressable
              style={[s.pulseTile, { borderLeftColor: colors.error }]}
              onPress={() => navigation.navigate('Fleet map')}
            >
              <View style={s.tileDotRow}>
                <View style={[s.statusDot, { backgroundColor: colors.error }]} />
                <AppText variant="caption" weight="bold" color={colors.textMuted}>
                  {c('offline')}
                </AppText>
              </View>
              <AppText variant="h3" weight="extrabold" color={colors.text}>
                {offlineVehicles}
              </AppText>
            </Pressable>

            <Pressable
              style={[s.pulseTile, { borderLeftColor: colors.primary }]}
              onPress={() => navigation.navigate('Duty board')}
            >
              <View style={s.tileDotRow}>
                <Ionicons name="people-outline" size={12} color={colors.primary} />
                <AppText variant="caption" weight="bold" color={colors.textMuted}>
                  {c('onDuty')}
                </AppText>
              </View>
              <AppText variant="h3" weight="extrabold" color={colors.text}>
                {driversOnDuty}
              </AppText>
            </Pressable>
          </ScrollView>
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

            {/* Quick Operational Shortcuts */}
            <View style={s.shortcutsContainer}>
              <Pressable
                style={s.shortcutCard}
                onPress={() => navigation.navigate('Fleet map')}
              >
                <Ionicons name="map-outline" size={20} color={colors.primary} />
                <View style={s.shortcutContent}>
                  <AppText weight="bold">{c('liveFleetMap')}</AppText>
                  <AppText variant="caption" muted>
                    Track active trucks and routes
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>

              <Pressable
                style={s.shortcutCard}
                onPress={() => navigation.navigate('Duty board')}
              >
                <Ionicons name="people-outline" size={20} color={colors.primary} />
                <View style={s.shortcutContent}>
                  <AppText weight="bold">{c('dutyBoard')}</AppText>
                  <AppText variant="caption" muted>
                    Driver assignments and duty hours
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>

              <Pressable
                style={s.shortcutCard}
                onPress={() => navigation.navigate('Manager approvals')}
              >
                <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                <View style={s.shortcutContent}>
                  <AppText weight="bold">{c('approvalsQueue')}</AppText>
                  <AppText variant="caption" muted>
                    Review fuel bills, papers, workshop
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
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
  const { service, branchId } = useManagerData();
  const branch = branchId === 'all' ? undefined : branchId;

  const card = request.data?.find((item) => item.id === route.params?.actionId);
  const isMoving = card?.driverSide?.moving;
  const speed = card?.driverSide?.speedKmph;

  const handleCall = () => {
    const phone =
      card?.driverSide?.crew?.[0]?.phone ||
      card?.subject?.phone ||
      card?.driverSide?.phone ||
      '';
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', c('dialerFailed')));
    } else {
      Alert.alert('Call Driver', 'No phone number available.');
    }
  };

  const handleMarkHandled = async () => {
    try {
      await service.managerCardOutcome(card.id, { outcome: 'HANDLED', note: 'Resolved on detail' }, branch);
      await request.reload();
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <ExperiencePage title={c('managerCards')} navigation={navigation}>
      <RequestState request={request} />
      {card ? (
        <View style={{ gap: 14 }}>
          {/* Card Summary Hero */}
          <Card style={{ gap: 10 }}>
            <View style={s.pillGroup}>
              <View style={s.severityPill}>
                <AppText variant="caption" weight="extrabold" color={colors.primaryDeep}>
                  {card.state || 'OPEN'}
                </AppText>
              </View>
              {card.type ? (
                <View style={s.typePill}>
                  <AppText variant="caption" weight="bold" color={colors.textMuted}>
                    {card.type}
                  </AppText>
                </View>
              ) : null}
            </View>

            <AppText variant="h3" weight="extrabold">
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
            </View>
          </Card>

          {/* Driver's Side (M02) */}
          <AppText variant="h3" weight="extrabold">
            Driver's Telemetry & Status
          </AppText>
          <Card style={{ gap: 8 }}>
            <View style={s.telemetryRow}>
              <AppText variant="small" muted>
                Speed / Motion:
              </AppText>
              <AppText variant="small" weight="bold">
                {isMoving ? `Moving at ${speed || 0} km/h` : 'Stationary'}
              </AppText>
            </View>
            <View style={s.telemetryRow}>
              <AppText variant="small" muted>
                At-Wheel Status:
              </AppText>
              <AppText variant="small" weight="bold">
                {card.driverSide?.atWheel?.status || 'Unknown'}
              </AppText>
            </View>
            {card.driverSide?.explanation ? (
              <View style={s.driverExplanationBox}>
                <AppText variant="caption" weight="bold" color={colors.primaryDeep}>
                  Driver Explanation:
                </AppText>
                <AppText variant="caption">"{card.driverSide.explanation}"</AppText>
              </View>
            ) : null}
          </Card>

          {/* Evidence Records (M02) */}
          <AppText variant="h3" weight="extrabold">
            {c('evidence')}
          </AppText>
          {(card.evidence || []).map((item, index) => (
            <Card key={`${item.source}:${index}`} style={{ gap: 4 }}>
              <View style={s.pillGroup}>
                <AppText weight="bold">{item.source || c('unknown')}</AppText>
                {item.confidence !== null && (
                  <View style={s.typePill}>
                    <AppText variant="caption" weight="bold">
                      {Math.round(item.confidence * 100)}% conf
                    </AppText>
                  </View>
                )}
              </View>
              {item.detail ? <AppText muted variant="small">{item.detail}</AppText> : null}
              {item.at ? <AppText variant="caption" mono muted>{formatRelativeTime(item.at)}</AppText> : null}
            </Card>
          ))}

          {/* Action Buttons */}
          <View style={{ gap: 10, marginTop: 8 }}>
            <ActionButton label={c('callDriver')} onPress={handleCall} />
            <ActionButton label={c('markHandled')} tone="secondary" onPress={handleMarkHandled} />

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
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    gap: 4,
  },
  branchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.tealTint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
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
});
