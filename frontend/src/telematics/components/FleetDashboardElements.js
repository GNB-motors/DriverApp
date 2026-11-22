import React from 'react';
import { View, Pressable, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card, colors, radius, elevation } from '../../components/ui';
import { GNB_LOGO_URI } from '../experience/gnbLogoUri';

export const DEFAULT_OPERATIONAL_TILES = [
  {
    id: 'liveFleet',
    title: 'Live Fleet',
    caption: 'Map & Tracking',
    icon: 'map',
    bg: '#EFF6FF',
    iconColor: colors.primary,
    route: 'Fleet map',
  },
  {
    id: 'dutyBoard',
    title: 'Duty Board',
    caption: 'Drivers & Hours',
    icon: 'people',
    bg: '#F0FDF4',
    iconColor: colors.success,
    route: 'Duty board',
  },
  {
    id: 'approvals',
    title: 'Approvals',
    caption: 'Bills & Advances',
    icon: 'checkmark-done-circle',
    bg: '#FAF5FF',
    iconColor: '#9333EA',
    route: 'Manager approvals',
  },
  {
    id: 'documents',
    title: 'Documents',
    caption: 'Permit, Tax, PUC',
    icon: 'document-text',
    bg: '#FFFBEB',
    iconColor: '#D97706',
    route: 'Fleet documents',
    params: { kind: 'documents' },
  },
  {
    id: 'fuelLogs',
    title: 'Fuel Logs',
    caption: 'Diesel & Mileage',
    icon: 'speedometer',
    bg: '#FEF2F2',
    iconColor: '#EF4444',
    route: 'Fuel review',
    params: { kind: 'fuel' },
  },
  {
    id: 'alerts',
    title: 'Alerts',
    caption: 'Alarms & Geofence',
    icon: 'notifications',
    bg: '#FFF1F2',
    iconColor: '#E11D48',
    route: 'Alerts',
  },
];

export function FleetTopBar({
  insets,
  userName = 'User',
  userRole = 'Manager',
  showBack = false,
  onBack,
}) {
  return (
    <View style={[styles.topBar, { paddingTop: (insets?.top || 0) + 6 }]}>
      <View style={styles.headerLeftLogo}>
        {showBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={10}
            onPress={onBack}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </Pressable>
        )}
        <Image
          source={{ uri: GNB_LOGO_URI }}
          style={styles.headerLogo}
          resizeMode="contain"
          accessibilityLabel="GNB Motors"
        />
      </View>

      <View style={styles.headerRightUser}>
        <AppText
          weight="extrabold"
          color={colors.text}
          numberOfLines={1}
          style={styles.userNameText}
        >
          {userName}
        </AppText>
        <AppText
          weight="semibold"
          color={colors.textMuted}
          numberOfLines={1}
          style={styles.userRoleText}
        >
          {userRole}
        </AppText>
      </View>
    </View>
  );
}

export function FleetPulseSection({
  title = 'Fleet Pulse',
  branchName = 'All branches',
  onOpenBranch,
  branchLabel = 'Branch Filter',
  movingCount = 0,
  idlingCount = 0,
  stoppedCount = 0,
  offlineCount = 0,
  onDutyCount = 0,
  navigation,
  labels = {},
}) {
  const lblMoving = labels.moving || 'Moving';
  const lblIdling = labels.idling || 'Idling';
  const lblStopped = labels.stopped || 'Stopped';
  const lblOffline = labels.offline || 'Offline';
  const lblOnDuty = labels.onDuty || 'On Duty';

  return (
    <View style={styles.pulseSection}>
      <View style={styles.pulseHeader}>
        <View style={styles.pulseTitleRow}>
          <View style={styles.liveDot} />
          <AppText variant="label" weight="extrabold" color={colors.text}>
            {title}
          </AppText>
        </View>

        {/* Without onOpenBranch (a manager, fixed to one branch) the pill only names it. */}
        <Pressable
          style={styles.branchPillPulse}
          onPress={onOpenBranch}
          disabled={!onOpenBranch}
          accessibilityRole={onOpenBranch ? "button" : "text"}
          accessibilityLabel={onOpenBranch ? branchLabel : branchName}
        >
          <Ionicons name="business" size={13} color={colors.primary} />
          <AppText
            variant="caption"
            weight="bold"
            color={colors.primaryDeep}
            numberOfLines={1}
            style={styles.branchPillPulseText}
          >
            {branchName}
          </AppText>
          {onOpenBranch ? <Ionicons name="chevron-down" size={11} color={colors.primary} /> : null}
        </Pressable>
      </View>

      <Card style={styles.pulseCardRow} padding={0}>
        <Pressable
          style={styles.pulseCol}
          onPress={() => navigation?.navigate('Fleet map', { filter: 'moving' })}
          accessibilityRole="button"
          accessibilityLabel={`${lblMoving}: ${movingCount}`}
        >
          <View style={styles.pulseColTop}>
            <View style={[styles.statusDot, { backgroundColor: '#0C9F41' }]} />
            <AppText
              variant="caption"
              weight="bold"
              color={colors.textMuted}
              numberOfLines={1}
              style={styles.pulseColLabel}
            >
              {lblMoving}
            </AppText>
          </View>
          <AppText variant="h3" weight="extrabold" color={colors.text} style={styles.pulseColNumber}>
            {movingCount}
          </AppText>
        </Pressable>

        <View style={styles.pulseDivider} />

        <Pressable
          style={styles.pulseCol}
          onPress={() => navigation?.navigate('Fleet map', { filter: 'idling' })}
          accessibilityRole="button"
          accessibilityLabel={`${lblIdling}: ${idlingCount}`}
        >
          <View style={styles.pulseColTop}>
            <View style={[styles.statusDot, { backgroundColor: '#F97316' }]} />
            <AppText
              variant="caption"
              weight="bold"
              color={colors.textMuted}
              numberOfLines={1}
              style={styles.pulseColLabel}
            >
              {lblIdling}
            </AppText>
          </View>
          <AppText variant="h3" weight="extrabold" color={colors.text} style={styles.pulseColNumber}>
            {idlingCount}
          </AppText>
        </Pressable>

        <View style={styles.pulseDivider} />

        <Pressable
          style={styles.pulseCol}
          onPress={() => navigation?.navigate('Fleet map', { filter: 'stopped' })}
          accessibilityRole="button"
          accessibilityLabel={`${lblStopped}: ${stoppedCount}`}
        >
          <View style={styles.pulseColTop}>
            <View style={[styles.statusDot, { backgroundColor: '#9333EA' }]} />
            <AppText
              variant="caption"
              weight="bold"
              color={colors.textMuted}
              numberOfLines={1}
              style={styles.pulseColLabel}
            >
              {lblStopped}
            </AppText>
          </View>
          <AppText variant="h3" weight="extrabold" color={colors.text} style={styles.pulseColNumber}>
            {stoppedCount}
          </AppText>
        </Pressable>

        <View style={styles.pulseDivider} />

        <Pressable
          style={styles.pulseCol}
          onPress={() => navigation?.navigate('Fleet map', { filter: 'offline' })}
          accessibilityRole="button"
          accessibilityLabel={`${lblOffline}: ${offlineCount}`}
        >
          <View style={styles.pulseColTop}>
            <View style={[styles.statusDot, { backgroundColor: '#9CA3AF' }]} />
            <AppText
              variant="caption"
              weight="bold"
              color={colors.textMuted}
              numberOfLines={1}
              style={styles.pulseColLabel}
            >
              {lblOffline}
            </AppText>
          </View>
          <AppText variant="h3" weight="extrabold" color={colors.text} style={styles.pulseColNumber}>
            {offlineCount}
          </AppText>
        </Pressable>

        <View style={styles.pulseDivider} />

        <Pressable
          style={styles.pulseCol}
          onPress={() => navigation?.navigate('Duty board')}
          accessibilityRole="button"
          accessibilityLabel={`${lblOnDuty}: ${onDutyCount}`}
        >
          <View style={styles.pulseColTop}>
            <Ionicons name="people-outline" size={11} color={colors.primary} />
            <AppText
              variant="caption"
              weight="bold"
              color={colors.primary}
              numberOfLines={1}
              style={styles.pulseColLabel}
            >
              {lblOnDuty}
            </AppText>
          </View>
          <AppText variant="h3" weight="extrabold" color={colors.primaryDeep} style={styles.pulseColNumber}>
            {onDutyCount}
          </AppText>
        </Pressable>
      </Card>
    </View>
  );
}

export function FleetTodayHighlights({
  totalDistanceToday = 0,
  onRoadCount = 0,
  totalVehiclesCount = 0,
  exceptionsCount = 0,
  hasAlertsOrLowFuel = false,
}) {
  return (
    <View style={styles.highlightsCard}>
      <View style={styles.highlightItem}>
        <View style={[styles.highlightIconCircle, { backgroundColor: '#EFF6FF' }]}>
          <Ionicons name="speedometer-outline" size={17} color={colors.primary} />
        </View>
        <View style={styles.highlightCol}>
          <AppText variant="caption" color={colors.textMuted} weight="bold" style={styles.highlightLabel}>
            TODAY'S RUN
          </AppText>
          <AppText variant="h3" weight="extrabold" color={colors.text}>
            {Number(totalDistanceToday || 0).toLocaleString('en-IN')}{' '}
            <AppText variant="caption" weight="bold" color={colors.textMuted}>
              km
            </AppText>
          </AppText>
        </View>
      </View>

      <View style={styles.highlightDivider} />

      <View style={styles.highlightItem}>
        <View style={[styles.highlightIconCircle, { backgroundColor: '#F0FDF4' }]}>
          <Ionicons name="git-network-outline" size={17} color={colors.success} />
        </View>
        <View style={styles.highlightCol}>
          <AppText variant="caption" color={colors.textMuted} weight="bold" style={styles.highlightLabel}>
            ON ROAD
          </AppText>
          <AppText variant="h3" weight="extrabold" color={colors.text}>
            {onRoadCount}{' '}
            <AppText variant="caption" weight="bold" color={colors.textMuted}>
              / {totalVehiclesCount}
            </AppText>
          </AppText>
        </View>
      </View>

      <View style={styles.highlightDivider} />

      <View style={styles.highlightItem}>
        <View
          style={[
            styles.highlightIconCircle,
            { backgroundColor: hasAlertsOrLowFuel ? '#FEF2F2' : '#F8FAFC' },
          ]}
        >
          <Ionicons
            name="warning-outline"
            size={17}
            color={hasAlertsOrLowFuel ? colors.warning : colors.textMuted}
          />
        </View>
        <View style={styles.highlightCol}>
          <AppText variant="caption" color={colors.textMuted} weight="bold" style={styles.highlightLabel}>
            EXCEPTIONS
          </AppText>
          <AppText
            variant="h3"
            weight="extrabold"
            color={hasAlertsOrLowFuel ? colors.warning : colors.text}
          >
            {exceptionsCount}{' '}
            <AppText variant="caption" weight="bold" color={colors.textMuted}>
              events
            </AppText>
          </AppText>
        </View>
      </View>
    </View>
  );
}

export function OperationalHubSection({
  navigation,
  title = 'OPERATIONAL HUB',
  subtitle = 'Everyday Tools & Workflows',
  tiles = DEFAULT_OPERATIONAL_TILES,
}) {
  return (
    <View style={styles.launchpadSection}>
      <View style={styles.launchpadHeader}>
        <AppText variant="label" weight="extrabold" color={colors.text}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color={colors.textMuted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      <View style={styles.launchpadGrid}>
        {tiles.map((tile) => (
          <Pressable
            key={tile.id || tile.title}
            style={styles.launchpadTile}
            onPress={() => {
              if (tile.onPress) {
                tile.onPress();
              } else if (tile.route) {
                navigation?.navigate(tile.route, tile.params);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={tile.title}
          >
            <View style={[styles.tileIconCircle, { backgroundColor: tile.bg }]}>
              <Ionicons name={tile.icon} size={20} color={tile.iconColor} />
            </View>
            <AppText variant="body" weight="extrabold" color={colors.text}>
              {tile.title}
            </AppText>
            <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
              {tile.caption}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function RecentExceptionsSection({
  alerts = [],
  unacknowledgedCount = 0,
  navigation,
  onViewAll,
  onSelectAlert,
  title = 'RECENT EXCEPTIONS',
}) {
  if (!Array.isArray(alerts) || alerts.length === 0) return null;

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      navigation?.navigate('Alerts');
    }
  };

  const handleSelect = (alert) => {
    if (onSelectAlert) {
      onSelectAlert(alert);
    } else {
      navigation?.navigate('Alerts');
    }
  };

  return (
    <View style={styles.recentAlertsSection}>
      <View style={styles.recentAlertsHeader}>
        <View style={styles.inlineCenter}>
          <Ionicons name="notifications-circle" size={18} color={colors.error} />
          <AppText variant="label" weight="extrabold" color={colors.text}>
            {title}
          </AppText>
        </View>
        <Pressable onPress={handleViewAll} hitSlop={8}>
          <AppText variant="small" weight="bold" color={colors.primary}>
            View All ({unacknowledgedCount || alerts.length}) →
          </AppText>
        </Pressable>
      </View>

      <Card padding={0} style={styles.recentAlertsCard}>
        {alerts.map((alert, idx) => {
          const isUrgent =
            alert.severity === 'CRITICAL' ||
            alert.severity === 'HIGH' ||
            alert.type?.includes('SPEED') ||
            alert.type?.includes('THEFT');
          return (
            <Pressable
              key={alert.id || alert._id || idx}
              style={[styles.recentAlertRow, idx > 0 && styles.recentAlertBorder]}
              onPress={() => handleSelect(alert)}
            >
              <View style={[styles.recentAlertDot, { backgroundColor: isUrgent ? colors.error : colors.warning }]} />
              <View style={styles.recentAlertMain}>
                <View style={styles.recentAlertTitleRow}>
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
  );
}

export const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 8,
    paddingRight: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  headerLeftLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
  },
  headerLogo: {
    width: 86,
    height: 44,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  headerRightUser: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  userNameText: {
    fontSize: 14,
    lineHeight: 18,
  },
  userRoleText: {
    fontSize: 11,
    lineHeight: 14,
  },
  pulseSection: {
    gap: 8,
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
    backgroundColor: '#0C9F41',
  },
  branchPillPulse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    maxWidth: 180,
  },
  branchPillPulseText: {
    fontSize: 11,
  },
  pulseCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingVertical: 10,
    paddingHorizontal: 4,
    backgroundColor: colors.surface,
  },
  pulseCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  pulseColTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pulseColLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  pulseColNumber: {
    fontSize: 16,
    lineHeight: 20,
  },
  pulseDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.hairline,
  },
  highlightsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  highlightItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    gap: 1,
  },
  highlightLabel: {
    fontSize: 9,
    letterSpacing: 0.4,
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
});
