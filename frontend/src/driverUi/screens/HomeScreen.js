import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';
import { useDriverData } from '../../telematics/context/DriverDataContext';
import { c, r } from '../theme';
import { Btn, Card, Dot, Pill, SectionLabel, Txt, fmtNumber, fmtShortDate, fmtWeekdayDate, useDriverCopy } from '../kit';
import { ChevronIcon, DocIcon, IssueIcon } from '../icons';
import { AppHeader, TAB_BAR_SPACE } from '../shell';
import { gradeMileage, monthTrips, roundKmpl, todaySummary, tripDone, useDriverMileage, WATCH_RATIO } from '../data';

const GRADE = {
  good: { pill: c.goodPill, ink: c.okText, dot: c.okDot, label: 'good', caption: 'better', tile: c.goodTile },
  watch: { pill: c.watchBg, ink: c.watchInk, dot: c.watchDot, label: 'watch', caption: 'littleBelow', tile: c.watchBg },
  low: { pill: c.lowBg, ink: c.badText, dot: c.badDot, label: 'low', caption: 'muchBelow', tile: c.lowBg },
};

function MileageChart({ cycles, grade }) {
  const { t } = useDriverCopy();
  const [width, setWidth] = useState(0);
  const height = 80;
  const values = cycles.map((cycle) => cycle.kmPerL);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = cycles.length > 1 ? (width - 12) / (cycles.length - 1) : 0;
  const points = values.map((value, index) => [6 + index * step, 8 + (1 - (value - min) / span) * (height - 24)]);
  const line = points.map(([x, y]) => `${x},${y}`).join(' ');
  const last = points[points.length - 1];
  const area = points.length ? `M${points[0][0]} ${height - 4} L${points.map(([x, y]) => `${x} ${y}`).join(' L')} L${last[0]} ${height - 4} Z` : '';
  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} accessible accessibilityRole="image" accessibilityLabel={t('mileageChart', { n: cycles.length, value: fmtNumber(roundKmpl(values[values.length - 1])) })} style={{ marginTop: 10, height }}>
      {width > 0 && cycles.length > 1 ? (
        <Svg width={width} height={height}>
          <Path d={area} fill={c.tint} />
          <Polyline points={line} fill="none" stroke={c.accent} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
          <Circle cx={last[0]} cy={last[1]} r={5} fill={grade ? GRADE[grade].dot : c.accent} stroke="#fff" strokeWidth={2} />
        </Svg>
      ) : null}
    </View>
  );
}

function Tips({ grade, onReport }) {
  const { t } = useDriverCopy();
  if (grade !== 'watch' && grade !== 'low') return null;
  const keys = grade === 'watch' ? ['tipW1', 'tipW2', 'tipW3'] : ['tipL1', 'tipL2', 'tipL3'];
  const tone = GRADE[grade];
  return (
    <>
      <View style={[st.tips, { backgroundColor: grade === 'watch' ? c.watchBg : c.lowBg }]}>
        <Txt size={14} weight="bold" color={tone.ink}>{t(grade === 'watch' ? 'tipsWatch' : 'tipsLow')}</Txt>
        <View style={{ marginTop: 8, gap: 8 }}>
          {keys.map((key) => (
            <View key={key} style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ marginTop: 7 }}><Dot color={tone.dot} size={8} /></View>
              <Txt size={15} style={{ flex: 1 }}>{t(key)}</Txt>
            </View>
          ))}
        </View>
      </View>
      {grade === 'low' ? <Btn label={t('reportProblem')} onPress={onReport} height={50} size={16} style={{ marginTop: 12, borderRadius: r.lg }} /> : null}
    </>
  );
}

function MileageCard({ mileage, navigation }) {
  const { t, lang } = useDriverCopy();
  const latest = mileage.data?.latest;
  if (!latest) {
    return (
      <Card style={{ marginTop: 12 }}>
        <Txt size={15} weight="semibold" color={c.muted}>{t('average')}</Txt>
        <Txt size={14} color={mileage.error ? c.badText : c.muted} style={{ marginTop: 6 }}>{mileage.error ? t('mileageError') : mileage.loading && !mileage.data ? '…' : t('mileageEmpty')}</Txt>
      </Card>
    );
  }
  const expected = latest.expectedKmPerL;
  const grade = gradeMileage(latest.kmPerL, expected);
  const tone = grade ? GRADE[grade] : null;
  const cycles = (mileage.data.recent || []).filter((cycle) => Number.isFinite(cycle.kmPerL));
  const first = cycles[0];
  const middle = cycles[Math.floor((cycles.length - 1) / 2)];
  const watchFloor = expected ? fmtNumber(roundKmpl(expected * WATCH_RATIO)) : null;
  const target = expected ? fmtNumber(roundKmpl(expected)) : null;
  const tiles = expected ? [
    ['good', `≥ ${target} km/L`],
    ['watch', `${watchFloor}–${target} km/L`],
    ['low', `< ${watchFloor} km/L`],
  ] : [];
  return (
    <Card style={{ marginTop: 12 }}>
      <View style={st.mileageTop}>
        <View>
          <Txt size={15} weight="semibold" color={c.muted}>{t('average')}</Txt>
          <Txt>
            <Txt size={40} weight="extrabold" lineHeight={46} track={-0.045}>{fmtNumber(roundKmpl(latest.kmPerL))}</Txt>
            <Txt size={14} color={c.muted}>{` ${t('kmpl')}`}</Txt>
          </Txt>
        </View>
        <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
          {tone ? <Pill label={t(tone.label)} bg={tone.pill} fg={tone.ink} dot={tone.dot} /> : null}
          <Txt size={13} color={c.muted} style={{ marginTop: 6, textAlign: 'right' }}>{tone ? t(tone.caption) : t('noTarget')}</Txt>
        </View>
      </View>
      <Txt size={13} color={c.muted} style={{ marginTop: 2 }}>{t('lastFullTank', { date: fmtShortDate(latest.endDate, lang) })}</Txt>
      <MileageChart cycles={cycles} grade={grade} />
      {cycles.length > 1 ? (
        <View style={st.axis}>
          <Txt size={13} color={c.muted}>{fmtShortDate(first.endDate, lang)}</Txt>
          {cycles.length > 2 ? <Txt size={13} color={c.muted}>{fmtShortDate(middle.endDate, lang)}</Txt> : null}
          <Txt size={13} color={c.muted}>{fmtShortDate(latest.endDate, lang)}</Txt>
        </View>
      ) : null}
      {tiles.length ? (
        <View style={st.tiles}>
          {tiles.map(([key, range]) => {
            const active = key === grade;
            return (
              <View key={key} style={[st.tile, { backgroundColor: active ? GRADE[key].tile : key === 'good' ? c.goodPill : GRADE[key].tile }, active && { borderWidth: 2, borderColor: GRADE[key].dot }]}>
                <Txt size={13} weight="bold" color={GRADE[key].ink}>{t(GRADE[key].label)}</Txt>
                <Txt size={13} color={c.muted}>{range}</Txt>
              </View>
            );
          })}
        </View>
      ) : null}
      <Tips grade={grade} onReport={() => navigation.navigate('Report issue')} />
    </Card>
  );
}

function HubTile({ icon, bg, title, sub, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}, ${sub}`} style={({ pressed }) => [st.hubTile, pressed && { opacity: 0.85 }]}>
      <View style={[st.hubIcon, { backgroundColor: bg }]}>{icon}</View>
      <Txt size={15} weight="bold">{title}</Txt>
      <Txt size={13} color={c.muted} lineHeight={17}>{sub}</Txt>
    </Pressable>
  );
}

function TripRow({ trip, onPress, first }) {
  const { t, lang } = useDriverCopy();
  const done = tripDone(trip);
  const status = trip.status === 'OPEN' ? t('inProgress') : done ? t('completed') : t('needsReview');
  const meta = [fmtShortDate(trip.startedAt, lang), trip.distanceKm == null ? null : `${Math.round(trip.distanceKm)} km`, status].filter(Boolean).join(' · ');
  const route = t('tripRoute', { from: trip.from, to: trip.to });
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${route}, ${meta}`} style={({ pressed }) => [st.tripRow, !first && st.divider, pressed && { backgroundColor: '#F7F8FB' }]}>
      <Dot color={done ? c.tripDone : trip.status === 'OPEN' ? c.tripOpen : c.watchDot} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt size={15} weight="bold" numberOfLines={1}>{route}</Txt>
        <Txt size={14} color={c.muted}>{meta}</Txt>
      </View>
      <ChevronIcon />
    </Pressable>
  );
}

/** 10 Home · Operations (tab 1). */
export default function HomeScreen({ navigation }) {
  const { t, lang } = useDriverCopy();
  const { data, error, loading, refresh } = useDriverData();
  const mileage = useDriverMileage();
  const today = todaySummary(data);
  const month = monthTrips(data);
  const onRefresh = () => { refresh(); mileage.reload(); };
  const refills = today.refills === 0 ? t('refills0') : today.refills === 1 ? t('refill1') : t('refills', { n: today.refills });
  const completed = today.completedTrips === 0 ? t('completedTrips0') : today.completedTrips === 1 ? t('completedTrip1') : t('completedTrips', { n: today.completedTrips });
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style="dark" />
      <AppHeader navigation={navigation} />
      <ScrollView contentContainerStyle={st.main} refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={onRefresh} />} showsVerticalScrollIndicator={false}>
        {error ? <Card style={{ borderColor: c.badBorder, backgroundColor: c.badBg }}><Txt size={14} weight="semibold" color={c.badText}>{t('loadError')}</Txt></Card> : null}
        {data && !data.vehicle ? <Card style={{ borderColor: c.amberBorder, backgroundColor: c.amberBg }}><Txt size={14} weight="semibold" color={c.watchInk}>{t('noTruck')}</Txt></Card> : null}

        <View style={st.hero}>
          <View style={{ flex: 1 }}>
            <Txt display size={22} weight="extrabold" track={-0.03}>{t('heroTitle')}</Txt>
            <Txt size={14} color={c.muted} style={{ marginTop: 6 }}>{t('heroSub')}</Txt>
            <Btn label={t('addFuelReceipt')} onPress={() => navigation.navigate('Fuel receipt')} height={48} size={15} style={st.heroBtn} />
          </View>
          <Svg width={96} height={96} viewBox="0 0 96 96" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Rect x="22" y="10" width="52" height="72" rx="6" fill="#fff" stroke="#213EA7" strokeWidth={3} />
            <Path d="M32 28h32M32 40h32M32 52h20" stroke="#6D8AF3" strokeWidth={3} strokeLinecap="round" />
            <Circle cx="68" cy="70" r="16" fill="#2F58EE" />
            <Path d="M68 62v16M60 70h16" stroke="#fff" strokeWidth={3} strokeLinecap="round" />
          </Svg>
        </View>

        <View>
          <SectionLabel>{t('fuelRecords')}</SectionLabel>
          <Txt size={18} weight="bold" style={{ marginTop: 2 }}>
            {fmtWeekdayDate(new Date(), lang)}
            {t('ist') ? <Txt size={18} color={c.muted}>{` ${t('ist')}`}</Txt> : null}
          </Txt>
          <View style={st.stats}>
            <View style={st.stat}>
              <Txt size={14} weight="semibold" color={c.muted}>{t('dieselFilled')}</Txt>
              <Txt size={26} weight="bold" track={-0.03} style={{ marginTop: 4 }}>{`${fmtNumber(today.litres)} L`}</Txt>
              <Txt size={14} color={c.muted}>{refills}</Txt>
            </View>
            <View style={st.stat}>
              <Txt size={14} weight="semibold" color={c.muted}>{t('distanceCovered')}</Txt>
              <Txt size={26} weight="bold" track={-0.03} style={{ marginTop: 4 }}>{today.distanceKm == null ? '0 km' : `${Math.round(today.distanceKm)} km`}</Txt>
              <Txt size={14} color={c.muted}>{completed}</Txt>
            </View>
          </View>
          <MileageCard mileage={mileage} navigation={navigation} />
        </View>

        <View>
          <Txt display size={20} weight="extrabold" track={-0.025}>{t('hub')}</Txt>
          <View style={st.hub}>
            <HubTile icon={<DocIcon color={c.docInk} />} bg={c.docBg} title={t('documents')} sub={t('documentsSub')} onPress={() => navigation.navigate('Documents')} />
            <HubTile icon={<IssueIcon color={c.issueInk} />} bg={c.issueBg} title={t('myIssues')} sub={t('myIssuesSub')} onPress={() => navigation.navigate('My issues')} />
            <HubTile icon={<Txt size={18} weight="extrabold" color={c.primary}>₹</Txt>} bg={c.billBg} title={t('workshopBills')} sub={t('workshopBillsSub')} onPress={() => navigation.navigate('Workshop bills')} />
          </View>
        </View>

        <View>
          <View style={st.tripsHead}>
            <View style={{ flex: 1 }}>
              <Txt size={16} weight="extrabold" track={0.035} style={{ textTransform: 'uppercase' }}>{t('driverTrips')}</Txt>
              <Txt size={14} color={c.muted}>{t('tripsMonth', { total: month.total, done: month.completed })}</Txt>
            </View>
            <Pressable onPress={() => navigation.navigate('Recorded trips')} accessibilityRole="button" style={st.viewAll} hitSlop={6}>
              <Txt size={15} weight="bold" color={c.primary}>{t('viewAll', { n: month.total })}</Txt>
            </Pressable>
          </View>
          <View style={st.tripList}>
            {month.rows.slice(0, 3).map((trip, index) => <TripRow key={trip.id} trip={trip} first={index === 0} onPress={() => navigation.navigate('Trip detail', { id: trip.id })} />)}
            {!month.rows.length ? <Txt size={14} color={c.muted} style={{ padding: 16 }}>{data ? t('noTripsMonth') : '…'}</Txt> : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  main: { padding: 16, paddingBottom: TAB_BAR_SPACE + 10, gap: 24 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 18, borderRadius: r.big, backgroundColor: c.tintAlt, borderWidth: 1, borderColor: c.tintBorder },
  heroBtn: { marginTop: 14, alignSelf: 'flex-start', borderRadius: r.md },
  stats: { marginTop: 12, flexDirection: 'row', gap: 12 },
  stat: { flex: 1, padding: 14, borderRadius: r.card, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  mileageTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  tiles: { marginTop: 12, flexDirection: 'row', gap: 6 },
  tile: { flex: 1, padding: 8, borderRadius: r.md },
  tips: { marginTop: 14, paddingVertical: 12, paddingHorizontal: 14, borderRadius: r.lg },
  hub: { marginTop: 10, flexDirection: 'row', gap: 8 },
  hubTile: { flex: 1, gap: 6, minHeight: 124, padding: 12, borderRadius: r.card, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  hubIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tripsHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  viewAll: { minHeight: 44, justifyContent: 'center' },
  tripList: { marginTop: 10, borderRadius: r.card, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
  tripRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 66, paddingVertical: 11, paddingHorizontal: 16 },
  divider: { borderTopWidth: 1, borderTopColor: c.border },
});
