import React, { useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { fontFamily } from '../theme/tokens';
import { driverUiCopy } from './copy';
import { c, r } from './theme';
import { BackIcon, ChevronIcon } from './icons';

export function useDriverCopy() {
  const { language } = useLanguage();
  const lang = driverUiCopy[language] ? language : 'en';
  const t = useCallback((key, vars) => {
    let text = driverUiCopy[lang][key] ?? driverUiCopy.en[key] ?? key;
    if (vars) for (const [name, value] of Object.entries(vars)) text = text.split(`{${name}}`).join(String(value));
    return text;
  }, [lang]);
  return { t, lang };
}

const LATIN_DISPLAY = fontFamily.heading;
const LATIN_BODY = fontFamily.display;

/**
 * Text in the design's two families: DM Sans for headings (`display`), Inter
 * for everything else. Hindi and Bengali switch to Hind / Hind Siliguri, which
 * need extra line height and no negative tracking.
 */
export function Txt({ children, size = 15, weight = 'regular', display = false, color = c.ink, style, lineHeight, track, center, ...rest }) {
  const { lang } = useDriverCopy();
  const indic = lang === 'hi' || lang === 'bn';
  const family = (indic ? fontFamily[lang] : display ? LATIN_DISPLAY : LATIN_BODY)[weight] || LATIN_BODY.regular;
  const height = lineHeight ?? Math.round(size * (indic ? 1.45 : display ? 1.18 : 1.35));
  return (
    <Text
      {...rest}
      style={[{ fontFamily: family, fontSize: size, lineHeight: height, color }, !indic && track != null && { letterSpacing: size * track }, center && { textAlign: 'center' }, style]}
    >
      {children}
    </Text>
  );
}

const BUTTON_TONES = {
  primary: { bg: c.primary, fg: '#FFFFFF' },
  tint: { bg: c.tint, fg: c.primary },
  danger: { bg: c.badBg, fg: c.sosText },
  sos: { bg: c.sos, fg: '#FFFFFF' },
};

export function Btn({ label, onPress, tone = 'primary', disabled, loading, icon, iconRight, height = 56, size = 17, style, accessibilityLabel }) {
  const t = BUTTON_TONES[tone];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={({ pressed }) => [s.btn, { minHeight: height, backgroundColor: t.bg }, (disabled || loading) && s.disabled, pressed && s.pressed, style]}
    >
      {loading ? <ActivityIndicator color={t.fg} /> : <>{icon}<Txt size={size} weight="bold" color={t.fg} center>{label}</Txt>{iconRight}</>}
    </Pressable>
  );
}

export function BackButton({ onPress, label }) {
  const { t } = useDriverCopy();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label || t('back')} hitSlop={6} style={({ pressed }) => [s.back, pressed && s.pressed]}>
      <BackIcon color={c.ink} />
    </Pressable>
  );
}

export function Card({ children, style, tone }) {
  return <View style={[s.card, tone === 'tint' && s.cardTint, style]}>{children}</View>;
}

export const Dot = ({ color, size = 10, square }) => <View style={{ width: size, height: size, borderRadius: square ? 3 : size / 2, backgroundColor: color }} />;

export function Pill({ label, bg, fg, dot }) {
  return (
    <View style={[s.pill, { backgroundColor: bg }]}>
      {dot ? <Dot color={dot} size={9} /> : null}
      <Txt size={14} weight="bold" color={fg}>{label}</Txt>
    </View>
  );
}

/** Status list used by screens 07 and 08: dot · label (+sub) · value or action. */
export function StatusList({ rows }) {
  return (
    <Card style={{ padding: 0 }}>
      {rows.map((row, index) => {
        const content = (
          <>
            <Dot color={row.ok ? c.okDot : c.badDot} />
            <View style={{ flex: 1 }}>
              <Txt size={15} weight={row.sub ? 'bold' : 'semibold'}>{row.label}</Txt>
              {row.sub ? <Txt size={13} color={c.badText}>{row.sub}</Txt> : null}
            </View>
            <Txt size={14} weight="bold" color={row.ok ? c.okText : c.badText}>{row.value}</Txt>
          </>
        );
        const rowStyle = [s.statusRow, index > 0 && s.divider];
        return row.onPress && !row.ok ? (
          <Pressable key={row.key} onPress={row.onPress} accessibilityRole="button" accessibilityLabel={`${row.label}: ${row.value}`} style={({ pressed }) => [...rowStyle, pressed && s.pressed]}>{content}</Pressable>
        ) : <View key={row.key} style={rowStyle} accessible accessibilityLabel={`${row.label}: ${row.value}`}>{content}</View>;
      })}
    </Card>
  );
}

export function ListRow({ label, meta, metaColor = c.muted, metaWeight = 'regular', onPress, marker = c.accentSoft, first }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={meta ? `${label}, ${meta}` : label} style={({ pressed }) => [s.listRow, !first && s.divider, pressed && s.pressedRow]}>
      <Dot color={marker} square />
      <Txt size={16} weight="semibold" style={{ flex: 1 }}>{label}</Txt>
      {meta ? <Txt size={14} weight={metaWeight} color={metaColor}>{meta}</Txt> : null}
      <ChevronIcon />
    </Pressable>
  );
}

export function SectionLabel({ children, style }) {
  return <Txt size={13} weight="bold" color={c.muted} track={0.05} style={[{ textTransform: 'uppercase' }, style]}>{children}</Txt>;
}

/** Full-height page on the grey background with safe-area padding. */
export function Page({ children, scroll = false, padding = 20, top = 20, bottom = 28, bg = c.bg, refreshControl, contentStyle, insetTop = true }) {
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: (insetTop ? insets.top : 0) + top, paddingBottom: insets.bottom + bottom, paddingHorizontal: padding };
  if (scroll) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={[pad, { flexGrow: 1 }, contentStyle]} keyboardShouldPersistTaps="handled" refreshControl={refreshControl} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    );
  }
  return <View style={[{ flex: 1, backgroundColor: bg }, pad, contentStyle]}>{children}</View>;
}

export function TitleBlock({ title, sub, size = 30, top = 20 }) {
  return (
    <View style={{ marginTop: top }}>
      <Txt display size={size} weight="extrabold" track={-0.03} accessibilityRole="header">{title}</Txt>
      {sub ? <Txt size={15} color={c.muted} style={{ marginTop: 8 }}>{sub}</Txt> : null}
    </View>
  );
}

export function ErrorLine({ children }) {
  if (!children) return null;
  return <Txt size={14} weight="semibold" color={c.badText} accessibilityRole="alert" accessibilityLiveRegion="polite">{children}</Txt>;
}

// ── Dates & numbers ──────────────────────────────────────────────────────
// Trips and refills are Indian operations; days are counted in IST no matter
// what timezone the phone is set to.
const IST_OFFSET_MS = 330 * 60000;
export const istDayKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  const ms = date.getTime();
  return Number.isFinite(ms) ? new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10) : null;
};
export const istMonthKey = (value) => istDayKey(value)?.slice(0, 7) || null;
const istParts = (value) => {
  const key = istDayKey(value);
  if (!key) return null;
  const shifted = new Date(new Date(value).getTime() + IST_OFFSET_MS);
  return { year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) - 1, day: Number(key.slice(8, 10)), weekday: shifted.getUTCDay() };
};

const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  hi: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
  bn: ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'],
};
const MONTHS_SHORT = {
  en: MONTHS.en,
  hi: ['जन', 'फ़र', 'मार्च', 'अप्रै', 'मई', 'जून', 'जुला', 'अग', 'सितं', 'अक्टू', 'नवं', 'दिसं'],
  bn: ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলা', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'],
};
const WEEKDAYS = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  hi: ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'],
  bn: ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি', 'শুক্র', 'শনি'],
};

/** "Mon, 23 Nov" — the Home fuel-records heading. */
export function fmtWeekdayDate(value, lang) {
  const p = istParts(value);
  return p ? `${WEEKDAYS[lang][p.weekday]}, ${p.day} ${MONTHS[lang][p.month]}` : '';
}
/** "23 Nov" — trip rows. */
export function fmtShortDate(value, lang) {
  const p = istParts(value);
  return p ? `${p.day} ${MONTHS_SHORT[lang][p.month]}` : '';
}
/** "14 Mar 2028" — documents and the refill date field. */
export function fmtLongDate(value, lang) {
  const p = istParts(value);
  return p ? `${p.day} ${MONTHS[lang][p.month]} ${p.year}` : '';
}
/** "Jun 2024" — profile joined date. */
export function fmtMonthYear(value, lang) {
  const p = istParts(value);
  return p ? `${MONTHS[lang][p.month]} ${p.year}` : '';
}
export const fmtNumber = (value, digits = 1) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return Number.isInteger(n) ? String(n) : n.toFixed(digits).replace(/\.0+$/, '');
};

export const initialsOf = (name) => String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || '•';

export const s = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: r.xl, paddingHorizontal: 16 },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.82 },
  pressedRow: { backgroundColor: '#F7F8FB' },
  back: { width: 44, height: 44, borderRadius: r.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: r.card, padding: 16 },
  cardTint: { backgroundColor: c.tintAlt, borderColor: c.tintBorder },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 99, alignSelf: 'flex-start' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  divider: { borderTopWidth: 1, borderTopColor: c.border },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16 },
});
