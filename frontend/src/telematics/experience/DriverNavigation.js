import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText } from '../../components/ui';
import { ActionButton, ExperiencePage, useExperienceCopy } from './ExperienceUI';
import { useDriverData } from '../context/DriverDataContext';

function TruckWatermark() {
  return (
    <View
      pointerEvents="none"
      style={styles.watermarkContainer}
    >
      <Svg width="160" height="110" viewBox="0 0 160 110" fill="none">
        {/* Outer trailer */}
        <Rect
          x="4"
          y="22"
          width="94"
          height="60"
          rx="4"
          stroke="#FFFFFF"
          strokeWidth="3"
        />
        {/* Inner trailer detail */}
        <Rect
          x="12"
          y="30"
          width="78"
          height="44"
          rx="2"
          stroke="#FFFFFF"
          strokeWidth="2"
        />
        {/* Cab */}
        <Path
          d="M98 42 L124 42 L138 60 L138 82 L98 82 Z"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Cab window */}
        <Path
          d="M104 48 L120 48 L130 60 L104 60 Z"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Wheels */}
        <Circle
          cx="32"
          cy="85"
          r="11"
          stroke="#FFFFFF"
          strokeWidth="3"
          fill="#2563EB"
        />
        <Circle
          cx="32"
          cy="85"
          r="5"
          stroke="#FFFFFF"
          strokeWidth="2"
          fill="none"
        />
        <Circle
          cx="120"
          cy="85"
          r="11"
          stroke="#FFFFFF"
          strokeWidth="3"
          fill="#2563EB"
        />
        <Circle
          cx="120"
          cy="85"
          r="5"
          stroke="#FFFFFF"
          strokeWidth="2"
          fill="none"
        />
      </Svg>
    </View>
  );
}

export function NavigateScreen({ navigation }) {
  const c = useExperienceCopy();

  return (
    <ExperiencePage title={c('navigationLabel')} navigation={navigation}>
      {/* 1. Notice Banner */}
      <View style={styles.noticeBanner}>
        <Ionicons
          name="information-circle-outline"
          size={24}
          color="#854D0E"
          style={{ marginRight: 12, marginTop: 1 }}
        />
        <View style={{ flex: 1 }}>
          <AppText style={styles.noticeTitle}>
            Navigation not available yet
          </AppText>
          <AppText style={styles.noticeSubtitle}>
            Turn-by-turn is not connected. Use the options below.
          </AppText>
        </View>
      </View>

      {/* 2. Assigned Vehicle Card */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="My truck - Open your truck to see its details"
        onPress={() => navigation.navigate('My truck')}
        style={({ pressed }) => [
          styles.vehicleCard,
          pressed && { opacity: 0.95 },
        ]}
      >
        <TruckWatermark />
        <View style={styles.cardHeaderRow}>
          <AppText style={styles.vehicleHeaderLabel}>ASSIGNED VEHICLE</AppText>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </View>
        <AppText style={styles.vehicleTitle}>My truck</AppText>
        <AppText style={styles.vehicleSubtitle}>
          Open your truck to see its details
        </AppText>
        <View style={styles.pillsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Documents"
            onPress={() => navigation.navigate('Documents')}
            style={styles.pillWhite}
          >
            <AppText style={styles.pillWhiteText}>Documents</AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fuel"
            onPress={() => navigation.navigate('Fuel history')}
            style={styles.pillWhite}
          >
            <AppText style={styles.pillWhiteText}>Fuel</AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Service"
            onPress={() => navigation.navigate('Workshop bills')}
            style={styles.pillWhite}
          >
            <AppText style={styles.pillWhiteText}>Service</AppText>
          </Pressable>
        </View>
      </Pressable>

      {/* 3. Trip History Card */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Trip records"
        onPress={() => navigation.navigate('Recorded trips')}
        style={({ pressed }) => [
          styles.tripCard,
          pressed && { opacity: 0.95 },
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <AppText style={styles.tripHeaderLabel}>TRIP HISTORY</AppText>
          <Ionicons name="chevron-forward" size={20} color="#0F172A" />
        </View>
        <AppText style={styles.tripTitle}>Trip records</AppText>
        <View style={styles.pillsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="All trips"
            onPress={() => navigation.navigate('Recorded trips')}
            style={styles.pillBlue}
          >
            <AppText style={styles.pillBlueText}>All trips</AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Proof of delivery"
            onPress={() => navigation.navigate('Recorded trips')}
            style={styles.pillAmber}
          >
            <AppText style={styles.pillAmberText}>Proof of delivery</AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Payments"
            onPress={() => navigation.navigate('Recorded trips')}
            style={styles.pillGreen}
          >
            <AppText style={styles.pillGreenText}>Payments</AppText>
          </Pressable>
        </View>
      </Pressable>

      {/* 4. Quick Action Tiles Row */}
      <View style={styles.quickActionsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Report issue"
          onPress={() => navigation.navigate('Report issue')}
          style={({ pressed }) => [
            styles.quickActionTile,
            pressed && { opacity: 0.8 },
          ]}
        >
          <View style={styles.actionIconAvatar}>
            <Ionicons name="flag" size={20} color="#2563EB" />
          </View>
          <AppText style={styles.actionLabel}>Report issue</AppText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fuel receipt"
          onPress={() => navigation.navigate('Add fuel')}
          style={({ pressed }) => [
            styles.quickActionTile,
            pressed && { opacity: 0.8 },
          ]}
        >
          <View style={styles.actionIconAvatar}>
            <Ionicons name="document-text" size={20} color="#2563EB" />
          </View>
          <AppText style={styles.actionLabel}>Fuel receipt</AppText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Breakdown"
          onPress={() =>
            navigation.navigate('Report issue', { kind: 'breakdown' })
          }
          style={({ pressed }) => [
            styles.quickActionTile,
            pressed && { opacity: 0.8 },
          ]}
        >
          <View style={styles.actionIconAvatar}>
            <MaterialCommunityIcons name="wrench" size={20} color="#2563EB" />
          </View>
          <AppText style={styles.actionLabel}>Breakdown</AppText>
        </Pressable>
      </View>

      {/* 5. Emergency Help / SOS */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Emergency help - Hold 2 seconds to alert dispatch"
        onPress={() => navigation.navigate('SOS')}
        onLongPress={() => navigation.navigate('SOS')}
        delayLongPress={2000}
        style={({ pressed }) => [
          styles.emergencyCard,
          pressed && { opacity: 0.9 },
        ]}
      >
        <View style={styles.sosCircle}>
          <AppText style={styles.sosText}>sos</AppText>
        </View>
        <View style={styles.emergencyTextCol}>
          <AppText style={styles.emergencyTitle}>Emergency help</AppText>
          <AppText style={styles.emergencySubtitle}>
            Hold 2 seconds to alert dispatch
          </AppText>
        </View>
      </Pressable>
    </ExperiencePage>
  );
}

export function CaptureScreen({ navigation }) {
  const c = useExperienceCopy();
  const { data } = useDriverData();
  const moving = data?.vehicle?.speed > 0;
  const actions = [["Photo any paper", "Photo any paper"], [c('uploadDocument'), 'Upload document'], [c('addFuel'), 'Add fuel'], ["Add expense bill", "AddBill"], [c('reportIssue'), 'Report issue'], [c('workshopBill'), 'Workshop bill'], ["Road report", "Road report"], ["Explain a stop", "Explain a stop"], [c('sos'), 'SOS']];
  return <ExperiencePage title={c('captureLabel')} navigation={navigation}>{moving && <AppText>{c('stopToCapture')}</AppText>}{actions.map(([label, route]) => <ActionButton key={route} label={label} disabled={moving && route !== 'SOS'} onPress={() => navigation.navigate(route, route === 'Photo any paper' ? { cameraFirst: true } : undefined)} />)}</ExperiencePage>;
}

const styles = StyleSheet.create({
  noticeBanner: {
    backgroundColor: '#FEFCE8',
    borderWidth: 1,
    borderColor: '#FEF08A',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#713F12',
  },
  noticeSubtitle: {
    fontSize: 13,
    color: '#854D0E',
    marginTop: 2,
    lineHeight: 18,
  },
  vehicleCard: {
    backgroundColor: '#2563EB',
    borderRadius: 24,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  watermarkContainer: {
    position: 'absolute',
    right: -10,
    bottom: 8,
    opacity: 0.22,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleHeaderLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#BFDBFE',
    letterSpacing: 0.5,
  },
  vehicleTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 12,
  },
  vehicleSubtitle: {
    fontSize: 14,
    color: '#DBEAFE',
    marginTop: 4,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    flexWrap: 'wrap',
    gap: 8,
  },
  pillWhite: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  pillWhiteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  tripHeaderLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E40AF',
    letterSpacing: 0.5,
  },
  tripTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
  },
  pillBlue: {
    backgroundColor: '#EFF6FF',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  pillBlueText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  pillAmber: {
    backgroundColor: '#FEF3C7',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  pillAmberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  pillGreen: {
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  pillGreenText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIconAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  emergencyCard: {
    backgroundColor: '#DC2626',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  sosCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosText: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'lowercase',
  },
  emergencyTextCol: {
    marginLeft: 14,
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emergencySubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
});
