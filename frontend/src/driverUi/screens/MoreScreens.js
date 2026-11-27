import React, { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useDriverData } from '../../telematics/context/DriverDataContext';
import { c, r } from '../theme';
import { BackButton, Btn, Card, ErrorLine, ListRow, Page, Pill, SectionLabel, Txt, fmtLongDate, fmtMonthYear, fmtNumber, initialsOf, useDriverCopy } from '../kit';
import { ChevronIcon, ClockIcon, DocIcon, PhoneIcon, PlusIcon } from '../icons';
import { AppHeader, TAB_BAR_SPACE } from '../shell';
import { openFixSettings, useDriverSetup } from '../permissions';
import { attentionDocs, callOwner, monthTrips, useDriverDocuments, useDriverMileage } from '../data';

const LANGUAGE_NAMES = { en: 'English', hi: 'हिन्दी', bn: 'বাংলা' };
const driverName = (user) => user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || '';

/** 16 More (tab 3). */
export function MoreScreen({ navigation }) {
  const { t } = useDriverCopy();
  const { user, logout } = useAuth();
  const { language } = useLanguage();
  const { data } = useDriverData();
  const setup = useDriverSetup();
  const docs = useDriverDocuments();
  const status = setup?.status || {};
  const name = driverName(user);
  const expiring = attentionDocs(docs?.data).length;
  const month = monthTrips(data);
  const unread = data?.unreadCount || 0;
  const work = [
    { label: t('myTrips'), meta: t('monthCount', { n: month.total }), route: 'Recorded trips' },
    { label: t('fuelLog'), route: 'Fuel history' },
    { label: t('documents'), meta: expiring ? t('expiringCount', { n: expiring }) : '', route: 'Documents', metaColor: expiring ? c.watchInk : c.muted },
    { label: t('workshopBills'), route: 'Workshop bills' },
    { label: t('myIssues'), route: 'My issues' },
    // Not in the design's list; kept so alerts, messages and the existing tools stay reachable.
    { label: t('inbox'), meta: unread ? t('unreadCount', { n: unread }) : '', route: 'Existing alerts', metaColor: unread ? c.primary : c.muted },
    { label: t('otherTools'), route: 'Existing tools' },
  ];
  const locationMeta = status?.location === 'always' ? t('allTheTime') : status?.location === 'whileUsing' ? t('whileUsing') : t('notAllowed');
  const app = [
    { label: t('language'), meta: LANGUAGE_NAMES[language] || 'English', onPress: () => navigation.navigate('App language', { mode: 'settings' }) },
    { label: t('location'), meta: locationMeta, ok: !!(status?.locationOk && status?.gpsOn), onPress: () => (status?.locationOk && status?.gpsOn ? navigation.navigate('Location sharing') : navigation.navigate('Location guide', { mode: 'guard' })) },
    { label: t('notifications'), meta: status?.notifications ? t('on') : t('off'), ok: !!status?.notifications, onPress: () => openFixSettings({ ...status, locationOk: true, gpsOn: true, notifications: status?.notifications }) },
    { label: t('helpSupport'), onPress: () => navigation.navigate('Driver help') },
  ];
  const confirmLogout = () => Alert.alert(t('logout'), t('logoutConfirm'), [
    { text: t('cancel'), style: 'cancel' },
    { text: t('logout'), style: 'destructive', onPress: () => logout().catch(() => {}) },
  ]);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
    <AppHeader navigation={navigation} />
    <Page scroll insetTop={false} top={20} bottom={TAB_BAR_SPACE} padding={16}>
      <StatusBar style="dark" />
      <Txt display size={28} weight="extrabold" track={-0.03} accessibilityRole="header">{t('more')}</Txt>
      <Pressable onPress={() => navigation.navigate('Profile')} accessibilityRole="button" accessibilityLabel={`${name}, ${t('profile')}`} style={({ pressed }) => [st.profileCard, pressed && { opacity: 0.88 }]}>
        <View style={st.avatar}><Txt display size={18} weight="extrabold" color={c.primary}>{initialsOf(name)}</Txt></View>
        <View style={{ flex: 1 }}>
          <Txt size={17} weight="bold">{name || t('driver')}</Txt>
          <Txt size={14} color={c.muted}>{[t('driver'), data?.vehicle?.plate].filter(Boolean).join(' · ')}</Txt>
        </View>
        <ChevronIcon />
      </Pressable>
      <View style={{ marginTop: 18 }}>
        <SectionLabel style={st.sectionLabel}>{t('myWork')}</SectionLabel>
        <View style={st.group}>
          {work.map((row, index) => <ListRow key={row.label} first={index === 0} label={row.label} meta={row.meta} metaColor={row.metaColor} onPress={() => navigation.navigate(row.route)} />)}
        </View>
      </View>
      <View style={{ marginTop: 18 }}>
        <SectionLabel style={st.sectionLabel}>{t('appSettings')}</SectionLabel>
        <View style={st.group}>
          {app.map((row, index) => (
            <ListRow key={row.label} first={index === 0} marker={c.inputBorder} label={row.label} meta={row.meta} onPress={row.onPress}
              metaColor={row.ok === undefined ? c.muted : row.ok ? c.okText : c.badText} metaWeight={row.ok === undefined ? 'regular' : 'bold'} />
          ))}
        </View>
      </View>
      <Pressable onPress={confirmLogout} accessibilityRole="button" style={st.logout}>
        <Txt size={15} weight="bold" color={c.badInk} center>{t('logout')}</Txt>
      </Pressable>
    </Page>
    </View>
  );
}

const maskMobile = (mobile) => {
  const digits = String(mobile || '').replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? `+91 ••••• ••${digits.slice(-3)}` : '—';
};

function Detail({ label, value }) {
  return (
    <View style={{ width: '50%', paddingRight: 8, marginBottom: 12 }}>
      <Txt size={13} color={c.muted}>{label}</Txt>
      <Txt size={15} weight="bold">{value}</Txt>
    </View>
  );
}

/** 17 Profile & vehicle. */
export function ProfileScreen({ navigation }) {
  const { t, lang } = useDriverCopy();
  const { user, organization } = useAuth();
  const { language } = useLanguage();
  const { data, service } = useDriverData();
  const docs = useDriverDocuments();
  const mileage = useDriverMileage();
  const [error, setError] = useState('');
  const name = driverName(user);
  const vehicle = data?.vehicle;
  const licence = docs?.data?.find((row) => row?.type === 'DRIVER_LICENSE');
  const licenceValue = !licence?.doc ? t('notUploaded') : licence?.state?.expiry ? fmtLongDate(licence.state.expiry, lang) : t('valid');
  const assigned = mileage?.data?.assignedVehicle;
  const range = assigned?.expectedGoodRange;
  const expected = range ? `${fmtNumber(range[0])}–${fmtNumber(range[1])} km/L` : assigned?.expectedKmPerL ? `${fmtNumber(assigned.expectedKmPerL)} km/L` : t('notSet');
  const live = vehicle && !vehicle.isStale && vehicle.coordinates;
  const ring = async () => {
    setError('');
    try { if (!(await callOwner(service))) setError(t('ownerUnavailable')); }
    catch { setError(t('ownerUnavailable')); }
  };
  return (
    <Page scroll top={20} padding={16}>
      <StatusBar style="dark" />
      <View style={st.titleRow}>
        <BackButton onPress={() => navigation.goBack()} />
        <Txt display size={22} weight="extrabold" track={-0.02} accessibilityRole="header">{t('profile')}</Txt>
      </View>
      <View style={st.identity}>
        <View style={st.avatarLarge}><Txt display size={28} weight="extrabold" color={c.primary}>{initialsOf(name)}</Txt></View>
        <Txt size={22} weight="bold" center>{name || t('driver')}</Txt>
        <Txt size={14} color={c.muted} center>{[t('driver'), organization?.companyName || organization?.name].filter(Boolean).join(' · ')}</Txt>
      </View>
      <Card style={{ marginTop: 16, paddingBottom: 4 }}>
        <Txt size={16} weight="bold">{t('driverDetails')}</Txt>
        <View style={st.details}>
          <Detail label={t('mobile')} value={maskMobile(user?.mobileNumber || user?.phone)} />
          <Detail label={t('licenceValid')} value={docs.loading && !docs.data ? '…' : licenceValue} />
          <Detail label={t('joined')} value={user?.createdAt ? fmtMonthYear(user.createdAt, lang) : '—'} />
          <Detail label={t('language')} value={LANGUAGE_NAMES[language] || 'English'} />
        </View>
      </Card>
      <Card tone="tint" style={{ marginTop: 16, paddingBottom: 4 }}>
        <View style={st.between}>
          <Txt size={16} weight="bold">{t('assignedVehicle')}</Txt>
          {vehicle ? <Pill label={live ? t('gpsLive') : t('gpsStale')} bg={live ? c.okBg : c.watchBg} fg={live ? c.okText : c.watchInk} dot={live ? c.okDot : c.watchDot} /> : null}
        </View>
        {vehicle ? (
          <>
            <Txt display size={26} weight="extrabold" track={0.02} style={{ marginTop: 10 }}>{vehicle.plate}</Txt>
            <View style={[st.details, { marginTop: 8 }]}>
              <Detail label={t('type')} value={vehicle.model || '—'} />
              <Detail label={t('expectedMileage')} value={mileage.loading && !mileage.data ? '…' : expected} />
            </View>
          </>
        ) : <Txt size={15} color={c.muted} style={{ marginTop: 10, marginBottom: 12 }}>{t('noVehicle')}</Txt>}
      </Card>
      <View style={{ flex: 1, minHeight: 24 }} />
      <ErrorLine>{error}</ErrorLine>
      <Btn label={t('callFleetOwner')} tone="tint" height={52} size={16} icon={<PhoneIcon color={c.primary} />} onPress={ring} style={{ marginTop: 8 }} />
    </Page>
  );
}

const pill = (bg, fg) => ({ backgroundColor: bg, color: fg });
function DocumentRow({ row, first, onPress }) {
  const { t, lang } = useDriverCopy();
  const { state, doc } = row;
  const meta = state?.kind === 'missing' ? t('notUploaded')
    : state?.kind === 'expired' ? t('expiredOn', { date: fmtLongDate(state?.expiry, lang) })
      : state?.kind === 'expiring' ? t('expiresOn', { date: fmtLongDate(state?.expiry, lang) })
        : state?.expiry ? t('validTill', { date: fmtLongDate(state?.expiry, lang) }) : t('uploadedOn', { date: fmtLongDate(doc?.createdAt, lang) });
  const tag = state?.kind === 'missing' ? [t('missing'), pill(c.missingBg, c.badText)]
    : state?.kind === 'expired' ? [t('expired'), pill(c.missingBg, c.badText)]
      : state?.kind === 'expiring' ? [t('days', { n: state?.days }), pill(c.amberBg, c.watchInk)]
        : [t('valid'), pill(c.okBg, c.okText)];
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${t(row.label)}, ${meta}, ${tag[0]}`} style={({ pressed }) => [st.docRow, !first && st.divider, pressed && { backgroundColor: '#F7F8FB' }]}>
      <View style={st.docIcon}><DocIcon color={c.docInk} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={15} weight="bold">{t(row.label)}</Txt>
        <Txt size={13} color={c.muted}>{meta}</Txt>
      </View>
      <View style={[st.tag, { backgroundColor: tag[1].backgroundColor }]}><Txt size={13} weight="bold" color={tag[1].color}>{tag[0]}</Txt></View>
    </Pressable>
  );
}

/** 18 Documents. Missing rows open the upload form for that paper. */
export function DocumentsScreen({ navigation }) {
  const { t } = useDriverCopy();
  const { data } = useDriverData();
  const docs = useDriverDocuments();
  const rows = (Array.isArray(docs?.data) ? docs.data : []).filter((row) => row?.scope === 'personal' || data?.vehicle);
  const first = attentionDocs(rows)[0];
  const open = (row) => (row?.doc
    ? navigation.navigate('Document detail', { kind: 'documents', id: row.doc.id || row.doc._id })
    : navigation.navigate('Upload document', { scope: row?.scope }));
  return (
    <Page scroll top={20} padding={16} refreshControl={<RefreshControl refreshing={docs.loading && !!docs.data} onRefresh={docs.reload} />}>
      <StatusBar style="dark" />
      <View style={st.titleRow}>
        <BackButton onPress={() => navigation.goBack()} />
        <Txt display size={22} weight="extrabold" track={-0.02} accessibilityRole="header">{t('documents')}</Txt>
      </View>
      {first ? (
        <View style={st.expiryBanner} accessibilityRole="alert">
          <ClockIcon color={c.watchInk} />
          <Txt size={14} weight="semibold" color={c.watchInk} style={{ flex: 1 }}>
            {first?.state?.kind === 'expired' ? t('docExpired', { name: t(first.label) }) : t('docExpiresIn', { name: t(first.label), n: first?.state?.days })}
          </Txt>
        </View>
      ) : null}
      {docs.error && !docs.data ? <View style={{ marginTop: 16 }}><ErrorLine>{t('loadError')}</ErrorLine></View> : null}
      {rows.length ? (
        <View style={st.docList}>
          {rows.map((row, index) => <DocumentRow key={row.type} row={row} first={index === 0} onPress={() => open(row)} />)}
        </View>
      ) : docs.loading ? <Txt size={14} color={c.muted} style={{ marginTop: 16 }}>…</Txt> : null}
      <View style={{ flex: 1, minHeight: 24 }} />
      <Btn label={t('uploadDocument')} icon={<PlusIcon color="#fff" />} onPress={() => navigation.navigate('Upload document', { scope: 'personal' })} />
      <Txt size={13} color={c.muted} center style={{ marginTop: 8 }}>{t('docHint')}</Txt>
    </Page>
  );
}

/** Navigate tab: the design's maps screens (13–15) are deferred; this holds the slot. */
export function NavigateSoonScreen({ navigation }) {
  const { t } = useDriverCopy();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
    <AppHeader navigation={navigation} />
    <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32, paddingBottom: TAB_BAR_SPACE }} style={{ backgroundColor: c.bg }}>
      <Txt size={16} weight="semibold" color={c.muted} center>{t('navSoon')}</Txt>
    </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  profileCard: { marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderRadius: r.big, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { marginHorizontal: 4, marginBottom: 8 },
  group: { borderRadius: r.big, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
  logout: { marginTop: 18, minHeight: 44, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  identity: { alignItems: 'center', gap: 8, paddingVertical: 8, marginTop: 16 },
  avatarLarge: { width: 84, height: 84, borderRadius: 42, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center' },
  details: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  expiryBanner: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: r.lg, backgroundColor: c.amberBg, borderWidth: 1, borderColor: c.amberBorder },
  docList: { marginTop: 16, borderRadius: r.big, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, paddingVertical: 10, paddingHorizontal: 16 },
  divider: { borderTopWidth: 1, borderTopColor: c.border },
  docIcon: { width: 40, height: 40, borderRadius: r.md, backgroundColor: c.docBg, alignItems: 'center', justifyContent: 'center' },
  tag: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 99 },
});
