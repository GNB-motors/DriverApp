import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, colors, radius } from './ui';
import { fetchDutyStatus } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import logger from '../utils/logger';

/**
 * DutyStatusStrip — the persistent hours-of-service indicator shown while a trip
 * is on. Sits above the scrolling content so it never scrolls away while a
 * driver is driving.
 *
 * Colour comes straight from the server's `band` (GREEN / AMBER / RED), so the
 * thresholds the fleet is measured against live in one place — the backend — and
 * changing DRIVER_DUTY_WARN_MINUTES changes what every driver sees without an
 * app release.
 */

// The tracker pings the server every 2 min; poll slower than that so the strip
// never costs the driver more than one request a minute.
const POLL_MS = 60 * 1000;

const BAND = {
  GREEN: { color: colors.success, bg: colors.validBg, icon: 'checkmark-circle' },
  AMBER: { color: colors.warning, bg: '#FDF3E2', icon: 'alert-circle' },
  RED: { color: colors.error, bg: colors.expiredBg, icon: 'warning' },
};

/** 372 -> "6h 12m", 45 -> "45m". */
function formatDuration(minutes) {
  const total = Math.max(0, Math.round(minutes || 0));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function DutyStatusStrip({ token, active }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState(null);
  // Highest band already alerted on, so a driver is warned once per level
  // rather than on every poll while they sit in the amber band.
  const warnedRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const next = await fetchDutyStatus(token);
      setStatus(next);
    } catch (err) {
      // A strip that cannot reach the server must not nag the driver every
      // minute; the next poll is close enough.
      logger.warn('DutyStrip', `duty status fetch failed: ${err?.message}`);
    }
  }, [token]);

  useEffect(() => {
    if (!active || !token) {
      setStatus(null);
      warnedRef.current = null;
      return undefined;
    }
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [active, token, refresh]);

  // Warn on entry into amber, then again on red. GREEN never warns, and a band
  // already alerted on stays quiet until the driver climbs past it.
  useEffect(() => {
    if (!status) return;
    const rank = { GREEN: 0, AMBER: 1, RED: 2 };
    const current = rank[status.band] ?? 0;
    const already = warnedRef.current == null ? -1 : rank[warnedRef.current];
    if (current < 1 || current <= already) return;

    warnedRef.current = status.band;
    const over = current === 2;
    Alert.alert(
      over
        ? t('duty', 'limitOverTitle') || 'Driving limit reached'
        : t('duty', 'limitWarnTitle') || 'Driving limit almost reached',
      over
        ? t('duty', 'limitOverBody') ||
          'You have used your full driving window for today. Stop driving and rest.'
        : `${formatDuration(status.remainingDrivingMinutes)} ${t('duty', 'left') || 'left'} — ${t('duty', 'limitWarnBody') || 'take your break now.'}`,
    );
  }, [status, t]);

  if (!active || !status) return null;

  const band = BAND[status.band] || BAND.GREEN;
  const isDriving = status.state === 'DRIVING';

  return (
    <View style={[styles.strip, { backgroundColor: band.bg, borderColor: band.color }]}>
      <View style={[styles.iconWrap, { backgroundColor: band.color }]}>
        <Ionicons name={isDriving ? 'navigate' : 'bed'} size={15} color={colors.white} />
      </View>

      <View style={{ flex: 1 }}>
        <AppText variant="label" weight="bold" color={band.color}>
          {isDriving ? t('duty', 'driving') || 'DRIVING' : t('duty', 'resting') || 'RESTING'}
        </AppText>
        <AppText variant="small" muted numberOfLines={1}>
          {formatDuration(status.remainingDrivingMinutes)} {t('duty', 'left') || 'left'}
          {isDriving && status.continuousDrivingMinutes > 0
            ? ` · ${t('duty', 'drivingFor') || 'Driving for'} ${formatDuration(status.continuousDrivingMinutes)}`
            : ''}
        </AppText>
      </View>

      <Ionicons name={band.icon} size={19} color={band.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 22,
    marginBottom: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});