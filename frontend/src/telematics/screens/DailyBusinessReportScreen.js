import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
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
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import useOwnerRequest from '../hooks/useOwnerRequest';
import {
  istDay,
  yesterday,
  shiftDay,
  reportSpeech,
  hisabTiles,
} from '../services/ownerReport';

const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function DailyBusinessReportScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const { user } = useAuth();
  const { language } = useLanguage();
  const context = useManagerData();
  const branch = context.branchId === 'all' ? undefined : context.branchId;
  const service = context.service;

  const todayStr = istDay(new Date());
  const initialDate = route.params?.date || yesterday();
  const [date, setDate] = useState(initialDate);

  const key = `${user?._id}:${typeof user?.orgId === 'object' ? user.orgId._id : user?.orgId}:${branch || 'all'}`;

  // Requests
  const dailyReq = useOwnerRequest(
    `${key}:${date}:daily`,
    () => service.ownerDaily(date, branch),
    60000
  );
  const digestReq = useOwnerRequest(
    `${key}:${date}:digest`,
    () => service.dailyDigest(date, branch),
    60000
  );

  const isToday = date === todayStr;

  // Audio Speech state
  const [speaking, setSpeaking] = useState(false);
  const speechSequence = useRef(0);

  useEffect(() => {
    setSpeaking(false);
    return () => {
      speechSequence.current++;
      Speech.stop();
    };
  }, [date]);

  async function handleSpeak() {
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }
    const seq = ++speechSequence.current;
    try {
      await Speech.stop();
      const lang = { en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN' }[language] || 'en-IN';
      const text = reportSpeech(dailyReq.data, language);
      Speech.speak(text, {
        language: lang,
        onStart: () => { if (speechSequence.current === seq) setSpeaking(true); },
        onDone: () => { if (speechSequence.current === seq) setSpeaking(false); },
        onStopped: () => { if (speechSequence.current === seq) setSpeaking(false); },
        onError: () => { if (speechSequence.current === seq) setSpeaking(false); },
      });
    } catch {
      setSpeaking(false);
    }
  }

  // Canonical Hisab Tiles
  const tiles = useMemo(() => {
    return hisabTiles(dailyReq.data, { today: isToday });
  }, [dailyReq.data, isToday]);

  // Operational numbers
  const workNumbers = useMemo(() => {
    const sections = dailyReq.data?.sections || [];
    const work = sections.find((s) => s.id === 'yesterdaysWork')?.numbers || {};
    return work;
  }, [dailyReq.data]);

  // Financial numbers
  const moneyNumbers = useMemo(() => {
    const sections = dailyReq.data?.sections || [];
    const m = sections.find((s) => s.id === 'moneyOut')?.numbers || {};
    return m;
  }, [dailyReq.data]);

  const onRefresh = () => {
    dailyReq.reload();
    digestReq.reload();
  };

  const branchLabel = branch ? context.branches.find((b) => b.id === branch)?.name || 'Selected branch' : 'All branches';

  return (
    <View style={s.screen}>
      {focused && <StatusBar style="dark" />}
      <BackHeader
        title="Today's business report"
        subtitle={`${branchLabel} · ${date}`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={dailyReq.loading} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Date Selector Navigation Bar */}
        <View style={s.dateBar}>
          <Pressable
            style={s.dateArrow}
            onPress={() => setDate((curr) => shiftDay(curr, -1))}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={20} color="#1E293B" />
          </Pressable>

          <View style={s.dateCenter}>
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <AppText variant="bodyStrong" weight="bold">
              {isToday ? `Today (${date})` : date}
            </AppText>
          </View>

          <Pressable
            style={[s.dateArrow, isToday && s.dateArrowDisabled]}
            disabled={isToday}
            onPress={() => setDate((curr) => shiftDay(curr, 1))}
            hitSlop={8}
          >
            <Ionicons name="chevron-forward" size={20} color={isToday ? '#CBD5E1' : '#1E293B'} />
          </Pressable>

          {/* Audio Listen Pill */}
          <Pressable
            style={[s.listenPill, speaking && s.listenPillActive]}
            onPress={handleSpeak}
          >
            <Ionicons
              name={speaking ? 'volume-high' : 'volume-medium-outline'}
              size={16}
              color={speaking ? colors.white : colors.primary}
            />
            <AppText
              variant="caption"
              weight="bold"
              color={speaking ? colors.white : colors.primary}
            >
              {speaking ? 'Stop' : 'Listen'}
            </AppText>
          </Pressable>
        </View>

        {/* 4 Core Business Tiles (Aaj Ka Hisab) */}
        <View style={s.tilesGrid}>
          {tiles.map((tile) => {
            const valDisplay = tile.value == null
              ? '—'
              : tile.unit === 'INR'
              ? money(tile.value)
              : tile.unit === 'km'
              ? `${Number(tile.value).toLocaleString('en-IN')} km`
              : tile.value;

            return (
              <Card
                key={tile.key}
                elevated="sm"
                padding={14}
                style={s.tileCard}
                onPress={() => tile.route && navigation.navigate(tile.route)}
              >
                <View style={s.tileHeader}>
                  <View style={s.tileIconBox}>
                    <Ionicons name={tile.icon} size={16} color={colors.primary} />
                  </View>
                  <AppText variant="caption" weight="semibold" color="#64748B" numberOfLines={1}>
                    {tile.label}
                  </AppText>
                </View>

                <AppText variant="h2" weight="extrabold" color={colors.text} numberOfLines={1}>
                  {valDisplay}
                </AppText>

                <AppText variant="caption" color="#94A3B8" numberOfLines={1} style={{ fontSize: 11 }}>
                  {tile.caption}
                </AppText>
              </Card>
            );
          })}
        </View>

        {/* Operational Movement Breakdown (Work Done) */}
        <Card elevated="sm" padding={16} style={s.sectionCard}>
          <View style={s.sectionTitleRow}>
            <View style={[s.sectionIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="speedometer-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong" weight="bold">Operational Movement</AppText>
              <AppText variant="caption" muted>Freight transport and vehicle utilization</AppText>
            </View>
          </View>

          <View style={s.statRows}>
            <View style={s.statRow}>
              <AppText variant="small" color="#64748B">Trips Started</AppText>
              <AppText variant="small" weight="bold">{workNumbers.trips ?? '—'}</AppText>
            </View>
            <View style={s.statDivider} />
            <View style={s.statRow}>
              <AppText variant="small" color="#64748B">Completed Trips</AppText>
              <AppText variant="small" weight="bold" color="#10B981">{workNumbers.completedTrips ?? '—'}</AppText>
            </View>
            <View style={s.statDivider} />
            <View style={s.statRow}>
              <AppText variant="small" color="#64748B">Trips Still On Road</AppText>
              <AppText variant="small" weight="bold" color={colors.primary}>{workNumbers.openTrips ?? '—'}</AppText>
            </View>
            <View style={s.statDivider} />
            <View style={s.statRow}>
              <AppText variant="small" color="#64748B">Loaded Distance</AppText>
              <AppText variant="small" weight="bold">{workNumbers.km ? `${Number(workNumbers.km).toLocaleString('en-IN')} km` : '—'}</AppText>
            </View>
          </View>

          <Button
            label="View Trip History"
            variant="secondary"
            size="sm"
            onPress={() => navigation.navigate('Fleet trips')}
            style={{ marginTop: 8 }}
          />
        </Card>

        {/* Financial Disbursals Breakdown (Money Out) */}
        <Card elevated="sm" padding={16} style={s.sectionCard}>
          <View style={s.sectionTitleRow}>
            <View style={[s.sectionIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="wallet-outline" size={18} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong" weight="bold">Daily Expenditure</AppText>
              <AppText variant="caption" muted>Fuel purchases, driver claims, and en-route costs</AppText>
            </View>
          </View>

          <View style={s.statRows}>
            <View style={s.statRow}>
              <AppText variant="small" color="#64748B">Diesel Billed</AppText>
              <AppText variant="small" weight="bold">{moneyNumbers.dieselBillInr ? money(moneyNumbers.dieselBillInr) : '—'}</AppText>
            </View>
            <View style={s.statDivider} />
            <View style={s.statRow}>
              <AppText variant="small" color="#64748B">Driver Bills Approved</AppText>
              <AppText variant="small" weight="bold">{moneyNumbers.expenseApprovedInr ? money(moneyNumbers.expenseApprovedInr) : '—'}</AppText>
            </View>
            <View style={s.statDivider} />
            <View style={s.statRow}>
              <AppText variant="small" color="#64748B">Driver Bills Pending</AppText>
              <AppText variant="small" weight="bold" color="#F59E0B">
                {moneyNumbers.expensePendingInr ? money(moneyNumbers.expensePendingInr) : '₹0'}
                {moneyNumbers.expensePendingCount ? ` (${moneyNumbers.expensePendingCount} waiting)` : ''}
              </AppText>
            </View>
          </View>

          <View style={s.dualButtons}>
            <Button
              label="Fuel Logs"
              variant="secondary"
              size="sm"
              onPress={() => navigation.navigate('Fuel logs')}
              style={{ flex: 1 }}
            />
            <Button
              label="Review Approvals"
              variant="secondary"
              size="sm"
              onPress={() => navigation.navigate('Manager approvals')}
              style={{ flex: 1 }}
            />
          </View>
        </Card>

        {/* Attention & Action Items */}
        <Card elevated="sm" padding={16} style={s.sectionCard}>
          <View style={s.sectionTitleRow}>
            <View style={[s.sectionIcon, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="alert-circle-outline" size={18} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong" weight="bold">Action Items For This Date</AppText>
              <AppText variant="caption" muted>Reviews and verifications waiting on you</AppText>
            </View>
          </View>

          <View style={{ gap: 8, marginTop: 4 }}>
            <Pressable
              style={s.actionItemRow}
              onPress={() => navigation.navigate('Manager approvals', { filter: 'DRIVER' })}
            >
              <View style={[s.actionItemIcon, { backgroundColor: '#FAF5FF' }]}>
                <Ionicons name="receipt-outline" size={16} color="#8B5CF6" />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="small" weight="semibold">Driver Expense Claims</AppText>
                <AppText variant="caption" muted>
                  {moneyNumbers.expensePendingCount ? `${moneyNumbers.expensePendingCount} claims waiting for review` : 'No pending driver claims'}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </Pressable>

            <Pressable
              style={s.actionItemRow}
              onPress={() => navigation.navigate('Fleet documents', { filter: 'EXPIRING' })}
            >
              <View style={[s.actionItemIcon, { backgroundColor: '#FFFBEB' }]}>
                <Ionicons name="document-text-outline" size={16} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="small" weight="semibold">Expiring Compliance & Papers</AppText>
                <AppText variant="caption" muted>Check fitness, permit & PUC due</AppText>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </Pressable>
          </View>
        </Card>
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
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
    ...elevation.sm,
  },
  dateArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateArrowDisabled: {
    opacity: 0.4,
  },
  dateCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  listenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  listenPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tileCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    ...elevation.sm,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tileIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    ...elevation.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statRows: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  statDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dualButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  actionItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  actionItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
