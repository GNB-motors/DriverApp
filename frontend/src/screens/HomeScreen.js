import React, { useState, useCallback } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import * as Location from 'expo-location';
import { storage } from '../utils/storage';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useErp } from '../context/ErpContext';
import {
  isTripLive, stateLabel, tripRoute, tripRef, nextActionFor,
} from '../domain/tripState';
import { SELECTED_VEHICLE_KEY } from './VehicleScreen';
import { startLocationTracking, stopLocationTracking, isTracking } from '../services/locationTracker';
import { fetchMyFuelLogs, fetchFieldAgentFuelLogs } from '../services/api';
import { AppText, Badge, Switch, Card, colors, spacing, radius } from '../components/ui';
import logger from '../utils/logger';

dayjs.extend(relativeTime);

const LOCATION_SHARING_PREFERENCE_KEY = 'driverLocationSharingPreference';

export default function HomeScreen({ navigation }) {
  const { t } = useLanguage();
  const { user, token } = useAuth();
  const { activeTrip } = useErp();
  const insets = useSafeAreaInsets();
  const [savedVehicle, setSavedVehicle] = useState(null); // { _id, registrationNumber }
  const [onDuty, setOnDuty] = useState(isTracking());
  const [lastLog, setLastLog] = useState(null);

  const isFieldAgent = user?.role === 'FIELD_AGENT';

  // Re-read saved vehicle + latest refuel every time this screen comes into focus
  useFocusEffect(
    useCallback(() => {
      storage.getItem(SELECTED_VEHICLE_KEY)
        .then((saved) => setSavedVehicle(saved))
        .catch(() => setSavedVehicle(null));

      let cancelled = false;
      (async () => {
        if (!user?._id || !token) return;
        try {
          const res = isFieldAgent
            ? await fetchFieldAgentFuelLogs(token, 1, 1)
            : await fetchMyFuelLogs(token, user._id, 1, 1);
          if (!cancelled) setLastLog(res?.data?.[0] || null);
        } catch (err) {
          logger.warn('Home', `last refuel fetch failed: ${err.message}`);
          if (!cancelled) setLastLog(null);
        }
      })();
      return () => { cancelled = true; };
    }, [user, token, isFieldAgent]),
  );

  const requestForegroundLocationPermission = async () => {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.status === 'granted') return true;

    if (!current.canAskAgain) {
      Alert.alert(
        'Location Permission Blocked',
        'Please enable location access in your phone settings to go On Duty.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return false;
    }

    const requested = await Location.requestForegroundPermissionsAsync();
    if (requested.status === 'granted') return true;

    Alert.alert('Permission Required', 'Location permission is needed to go On Duty.');
    return false;
  };

  const requestAlwaysLocationPermission = async () => {
    const hasForegroundPermission = await requestForegroundLocationPermission();
    if (!hasForegroundPermission) return false;

    const currentBackground = await Location.getBackgroundPermissionsAsync();
    if (currentBackground.status === 'granted') return true;

    if (!currentBackground.canAskAgain) {
      Alert.alert(
        'Always Location Blocked',
        'Please enable Always Allow location access in your phone settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return false;
    }

    const requestedBackground = await Location.requestBackgroundPermissionsAsync();
    if (requestedBackground.status === 'granted') return true;

    Alert.alert(
      'Always Location Not Enabled',
      'You can still share location while using the app. To share in the background, enable Always Allow in settings.',
    );
    return true;
  };

  const askLocationSharingChoice = () =>
    new Promise((resolve) => {
      Alert.alert(
        'Share Location',
        'Choose how you want to share your location while on duty.',
        [
          { text: "Don't Share", style: 'cancel', onPress: () => resolve('none') },
          { text: 'While Using App', onPress: () => resolve('foreground') },
          { text: 'Always', onPress: () => resolve('always') },
        ],
      );
    });

  const getLocationSharingChoice = async () => {
    const savedChoice = await storage.getItem(LOCATION_SHARING_PREFERENCE_KEY);
    if (savedChoice === 'foreground' || savedChoice === 'always') return savedChoice;

    const choice = await askLocationSharingChoice();
    if (choice === 'foreground' || choice === 'always') {
      await storage.setItem(LOCATION_SHARING_PREFERENCE_KEY, choice);
    }
    return choice;
  };

  const toggleDuty = async () => {
    if (onDuty) {
      stopLocationTracking();
      setOnDuty(false);
      return;
    }

    const choice = await getLocationSharingChoice();
    if (choice === 'none') return;

    const hasPermission = choice === 'always'
      ? await requestAlwaysLocationPermission()
      : await requestForegroundLocationPermission();
    if (!hasPermission) return;

    startLocationTracking(token);
    setOnDuty(true);
  };

  const startRefuel = () => {
    if (isFieldAgent) {
      navigation.navigate('RefuelDetails', {});
    } else {
      navigation.navigate('RefuelDetails', {
        vehicleId: savedVehicle?._id || null,
        vehicleLabel: savedVehicle?.registrationNumber || null,
        vehicleAssigned: !!savedVehicle,
      });
    }
  };

  const driverName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Driver' : 'Driver';
  const initials = (`${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`).toUpperCase() || 'D';

  // Quick actions — only routes that exist for this role.
  const actions = [
    !isFieldAgent && { icon: 'car-sport', label: t('home', 'myVehicle') || 'My Vehicle', onPress: () => navigation.navigate('Vehicle') },
    { icon: 'time-outline', label: t('home', 'fuelHistory') || 'Fuel History', onPress: () => navigation.navigate('FuelHistory') },
    !isFieldAgent && { icon: 'build-outline', label: t('repairs', 'tabName') || 'Repairs', onPress: () => navigation.navigate('Repairs') },
    // 'Advances' is the org-wide manager list — a driver belongs on the
    // self-scoped one, or they get a 403 from /api/erp/advances.
    !isFieldAgent && { icon: 'wallet-outline', label: 'My Advances', onPress: () => navigation.navigate('MyAdvances') },
    !isFieldAgent && { icon: 'receipt-outline', label: 'My Khata', onPress: () => navigation.navigate('MyKhata') },
    !isFieldAgent && { icon: 'map-outline', label: 'My Trips', onPress: () => navigation.navigate('MyTrips') },
    !isFieldAgent && {
      icon: 'document-text-outline',
      label: 'Documents',
      onPress: () => navigation.navigate('Documents'),
    },
  ].filter(Boolean);

  // The hero's call to action names the driver's own next step when they have
  // one, and otherwise just offers to open the trip.
  const tripAction = nextActionFor(activeTrip, user?.role);
  const tripCta = tripAction && !tripAction.wait
    ? (tripAction.driverLabel || tripAction.label)
    : 'View trip';

  const lastIsFull = lastLog?.fillingType === 'FULL_TANK';
  const lastLitres = lastLog?.litres != null ? `${Number(lastLog.litres).toFixed(1)} L` : null;
  const lastTotal = lastLog?.totalAmount != null ? `₹${Math.round(lastLog.totalAmount).toLocaleString('en-IN')}` : null;
  const lastSummary = [lastLitres, lastTotal].filter(Boolean).join(' · ');
  const lastMeta = [lastLog?.vehicleId?.registrationNumber, lastLog?.refuelTime ? dayjs(lastLog.refuelTime).fromNow() : null].filter(Boolean).join(' · ');

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.avatar}>
          <AppText weight="extrabold" color={colors.primary} style={styles.avatarText}>{initials}</AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="small" weight="medium" muted>{t('home', 'greeting') || 'Welcome back'}</AppText>
          <AppText variant="h3" weight="extrabold" numberOfLines={1}>{driverName}</AppText>
        </View>
        <Pressable style={styles.bell} hitSlop={8}>
          <Ionicons name="notifications-outline" size={21} color="#3C4C47" />
          <View style={styles.bellDot} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Duty status (drivers only) ── */}
        {!isFieldAgent && (
          <Card onPress={toggleDuty} elevated="sm" padding={15} style={styles.dutyCard}>
            <View style={[styles.dutyIcon, { backgroundColor: onDuty ? colors.validBg : colors.background }]}>
              <Ionicons name="power" size={21} color={onDuty ? colors.success : colors.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.dutyTitleRow}>
                <AppText variant="bodyStrong" weight="bold">
                  {onDuty ? (t('home', 'onDuty') || 'On Duty') : (t('home', 'offDuty') || 'Off Duty')}
                </AppText>
                {onDuty ? <View style={styles.dutyDot} /> : null}
              </View>
              <AppText variant="small" muted numberOfLines={1}>
                {onDuty ? (t('home', 'dutyActiveSub') || 'Location sharing active') : (t('home', 'dutyInactiveSub') || 'Tap to go on duty')}
              </AppText>
            </View>
            <View pointerEvents="none">
              <Switch value={onDuty} />
            </View>
          </Card>
        )}

        {/* ── Active Trip Hero or Refuel Hero ──
             `isTripLive` reads the real `state` enum. This used to test
             `activeTrip.pipelineStage < 8`, a field the API never returned, so the
             hero never appeared even when a trip was assigned. The route and
             reference come from tripState helpers rather than invented
             source/destination/lrNumber fields. */}
        {!isFieldAgent && isTripLive(activeTrip) ? (
          <Pressable onPress={() => navigation.navigate('ActiveTrip')}>
            <LinearGradient
              colors={['#0F6E60', '#052E27']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <Ionicons name="map" size={80} color="rgba(255,255,255,0.06)" style={styles.heroGlyph} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
                <AppText variant="small" weight="bold" color={colors.success}>
                  {stateLabel(activeTrip.state).toUpperCase()}
                </AppText>
              </View>
              <AppText variant="h2" weight="extrabold" color={colors.white} numberOfLines={1}>
                {tripRoute(activeTrip).text}
              </AppText>
              <AppText variant="small" weight="medium" color={colors.onPrimaryMuted} style={{ marginTop: 3 }}>
                {tripRef(activeTrip)}
              </AppText>
              <View style={styles.heroBtn}>
                <AppText variant="bodyStrong" weight="bold" color={colors.primary}>
                  {tripCta}
                </AppText>
                <Ionicons name="arrow-forward" size={16} color={colors.primary} />
              </View>
            </LinearGradient>
          </Pressable>
        ) : (
          <LinearGradient
            colors={['#1AA28E', '#0C5A50']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.hero}
          >
            <Ionicons name="water" size={80} color="rgba(255,255,255,0.10)" style={styles.heroGlyph} />
            <AppText variant="h2" weight="extrabold" color={colors.white}>{t('home', 'startRefuel') || 'Start Refuel'}</AppText>
            <AppText variant="small" weight="medium" color={colors.onPrimaryMuted} style={{ marginTop: 3 }}>
              {t('home', 'refuelSubtitle') || 'Record your latest diesel fill-up'}
            </AppText>
            <Pressable style={styles.heroBtn} onPress={startRefuel}>
              <Ionicons name="add" size={19} color={colors.primary} />
              <AppText variant="bodyStrong" weight="bold" color={colors.primary}>{t('home', 'tapToStart') || 'Tap to Start'}</AppText>
            </Pressable>
          </LinearGradient>
        )}

        {/* ── Quick actions ── */}
        <View style={styles.grid}>
          {actions.map((a) => (
            <Pressable key={a.label} style={styles.gridItem} onPress={a.onPress}>
              <View style={styles.gridIcon}>
                <Ionicons name={a.icon} size={20} color={colors.primary} />
              </View>
              <AppText variant="small" weight="bold" numberOfLines={1} style={{ flex: 1 }}>{a.label}</AppText>
            </Pressable>
          ))}
        </View>

        {/* ── Last refuel ── */}
        {lastLog && lastSummary ? (
          <Card elevated="sm" padding={14} style={{ marginTop: 14 }}>
            <View style={styles.lastHeader}>
              <AppText variant="label" muted>Last refuel</AppText>
              <Badge tone={lastIsFull ? 'valid' : 'info'} label={lastIsFull ? 'Full' : 'Partial'} />
            </View>
            <View style={styles.lastBody}>
              <View style={styles.gridIcon}>
                <Ionicons name="water" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong" weight="bold" mono>{lastSummary}</AppText>
                {lastMeta ? <AppText variant="small" muted mono>{lastMeta}</AppText> : null}
              </View>
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 22,
    paddingBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.tealTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 17 },
  bell: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#102824',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  bellDot: {
    position: 'absolute',
    top: 11,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },

  scroll: { paddingHorizontal: 22, paddingTop: 6, paddingBottom: 32, gap: 14 },

  // Duty
  dutyCard: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  dutyIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dutyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dutyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },

  // Hero
  hero: {
    borderRadius: 22,
    padding: 20,
    overflow: 'hidden',
    shadowColor: '#0C5A50',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 10,
  },
  heroGlyph: { position: 'absolute', top: -10, right: -6 },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 16,
  },

  // Quick actions grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: {
    width: '47.5%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    shadowColor: '#102824',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  gridIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.tealTint,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Last refuel
  lastHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  lastBody: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
