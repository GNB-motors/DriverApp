/**
 * DigiLockerVerifyCard — "Verify with DigiLocker" panel for DocumentsScreen.
 *
 * Flow (all server-side state lives on the backend; this component is a
 * thin, retryable client of three calls):
 *
 *   1. tap "Verify" → POST /digilocker/start
 *        backend mints a single-use `state`, returns `authorizationUrl`
 *   2. `Linking.openURL(authorizationUrl)` hands off to the system browser /
 *      DigiLocker app. Driver picks DL and/or RC and consents.
 *   3. DigiLocker bounces back to `digilockerapp://callback?code=…&state=…`
 *      (scheme registered in app.json). We stash the pending state in
 *      AsyncStorage *before* opening the browser, because the OS may cold-start
 *      the app and unmount this component.
 *   4. on return → POST /digilocker/callback {code, state}
 *        ONLY this call sets `verifiedAt` on the backend.
 *   5. GET /digilocker/status → re-render the badge.
 *
 * When `DIGILOCKER_ENABLED=false` (the default) step 1 returns 503 and we show
 * a single non-retryable notice, so drivers never tap a dead button.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { View, Pressable, ActivityIndicator, Alert, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { storage } from '../utils/storage';
import logger from '../utils/logger';
import {
  startDigiLockerVerification,
  completeDigiLockerVerification,
  fetchDigiLockerStatus,
} from '../services/digilockerService';
import {
  parseDigiLockerCallback,
  isDigiLockerCallbackUrl,
  friendlyDigiLockerError,
} from '../utils/digilocker';
import { AppText, Button, Badge, colors, spacing, radius } from './ui';

/** AsyncStorage key for the in-flight state token. */
export const PENDING_STATE_KEY = '@gnb/digilocker/pending';

const COPY = {
  en: {
    title: 'DigiLocker verification',
    subtitle:
      'Pull your Driving Licence and Registration Certificate straight from DigiLocker instead of uploading photos.',
    verify: 'Verify with DigiLocker',
    reVerify: 'Re-verify',
    checking: 'Checking…',
    opening: 'Opening DigiLocker…',
    verifying: 'Confirming with DigiLocker…',
    verifiedOn: 'Verified',
    disabledTitle: 'DigiLocker unavailable',
    disabledBody:
      'Your fleet has not enabled DigiLocker verification. You can still upload document photos below.',
    dl: 'Driving Licence',
    rc: 'Registration Certificate',
    cancelTitle: 'Verification cancelled',
    cancelBody: 'No documents were fetched. You can try again any time.',
    retry: 'Try again',
  },
  hi: {
    title: 'DigiLocker सत्यापन',
    subtitle:
      'ड्राइविंग लाइसेंस और पंजीकरण प्रमाणपत्र सीधे DigiLocker से प्राप्त करें, फ़ोटो अपलोड करने की ज़रूरत नहीं।',
    verify: 'DigiLocker से सत्यापित करें',
    reVerify: 'फिर से सत्यापित करें',
    checking: 'जाँच हो रही है…',
    opening: 'DigiLocker खोला जा रहा है…',
    verifying: 'DigiLocker से पुष्टि हो रही है…',
    verifiedOn: 'सत्यापित',
    disabledTitle: 'DigiLocker उपलब्ध नहीं',
    disabledBody:
      'आपकी कंपनी ने DigiLocker सत्यापन सक्षम नहीं किया है। आप नीचे दस्तावेज़ फ़ोटो अपलोड कर सकते हैं।',
    dl: 'ड्राइविंग लाइसेंस',
    rc: 'पंजीकरण प्रमाणपत्र',
    cancelTitle: 'सत्यापन रद्द',
    cancelBody: 'कोई दस्तावेज़ नहीं लिया गया। आप कभी भी पुनः प्रयास कर सकते हैं।',
    retry: 'पुनः प्रयास करें',
  },
};

export default function DigiLockerVerifyCard({ language = 'en', onVerified }) {
  const c = COPY[language] || COPY.en;

  const [status, setStatus] = useState(null); // backend /digilocker/status
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [busy, setBusy] = useState(null); // 'start' | 'exchange' | null
  const [disabled, setDisabled] = useState(false);

  const refreshStatus = useCallback(async () => {

    try {
      setLoadingStatus(true);
      const data = await fetchDigiLockerStatus();
      setStatus(data);
      setDisabled(!data?.enabled);
    } catch (err) {
      // 503 => integration switched off for this org. Anything else (network
      // blip) leaves the card in its last-known state and lets the driver retry.
      if (err?.statusCode === 503) setDisabled(true);
      logger.error('DigiLockerVerifyCard', `status fetch failed: ${err?.message}`);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // If the OS cold-started us straight onto the callback URI, the `state` we
  // stashed before opening the browser is still in AsyncStorage — complete the
  // exchange without the driver tapping anything.
  useEffect(() => {
    let cancelled = false;

    async function completeFromDeepLink(url) {
      const parsed = parseDigiLockerCallback(url);
      if (!parsed) return;

      const pendingState = await storage.getItem(PENDING_STATE_KEY);
      if (!pendingState) return;

      // Mismatched state => the callback is not ours (or is stale). Drop it.
      if (parsed.state && parsed.state !== pendingState) {
        if (!cancelled) logger.warn('DigiLockerVerifyCard', 'callback state mismatch — ignored');
        return;
      }

      if (parsed.error) {
        await storage.removeItem(PENDING_STATE_KEY);
        if (!cancelled) {
          Alert.alert(c.cancelTitle, c.cancelBody);
        }
        return;
      }

      if (!parsed.code) {
        await storage.removeItem(PENDING_STATE_KEY);
        if (!cancelled) Alert.alert(c.cancelTitle, c.cancelBody);
        return;
      }

      try {
        if (!cancelled) setBusy('exchange');
        await completeDigiLockerVerification({ code: parsed.code, state: parsed.state || pendingState });
        await storage.removeItem(PENDING_STATE_KEY);
        if (!cancelled) {
          await refreshStatus();
          onVerified?.();
        }
      } catch (err) {
        await storage.removeItem(PENDING_STATE_KEY);
        const { message } = friendlyDigiLockerError(err, language);
        if (!cancelled) {
          setBusy(null);
          Alert.alert(c.cancelTitle, message);
        }
      }
    }

    Linking.getInitialURL().then((url) => {
      if (url && !cancelled) completeFromDeepLink(url);
    });
    const sub = Linking.addEventListener('url', ({ url }) => completeFromDeepLink(url));
    return () => {
      cancelled = true;
      sub?.remove?.();
    };
    // Intentionally mount-only: a re-render mid-consent would be unusual and
    // re-running this could double-submit a code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(async () => {
    try {
      setBusy('start');
      const data = await startDigiLockerVerification(['DL', 'RC']);

      // Persist BEFORE handing off — the app may be unmounted/killed while the
      // driver is on the DigiLocker screen.
      await storage.setItem(PENDING_STATE_KEY, data.state);
      setBusy('opening');

      const canOpen = await Linking.canOpenURL(data.authorizationUrl);
      if (!canOpen) {
        throw { statusCode: 0, message: 'cannot open url' };
      }
      await Linking.openURL(data.authorizationUrl);
      setBusy(null);
    } catch (err) {
      setBusy(null);
      await storage.removeItem(PENDING_STATE_KEY);
      const { message } = friendlyDigiLockerError(err, language);
      Alert.alert(c.cancelTitle, message);
      refreshStatus();
    }
  }, [language, c, refreshStatus]);

  if (disabled) {
    return (
      <View style={[styles.card, styles.cardMuted]}>
        <View style={styles.headerRow}>
          <View style={[styles.icon, { backgroundColor: colors.expiredBg }]}>
            <Ionicons name="cloud-offline-outline" size={20} color={colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong" weight="bold">{c.disabledTitle}</AppText>
            <AppText variant="caption" style={{ color: colors.textMuted, marginTop: 2 }}>
              {c.disabledBody}
            </AppText>
          </View>
        </View>
      </View>
    );
  }

  const verified = status?.verified || {};
  const anyVerified = Boolean(verified.DL || verified.RC);

  const verifiedChips = [];
  if (verified.DL) verifiedChips.push({ label: c.dl, at: status?.verifiedAt?.DL });
  if (verified.RC) verifiedChips.push({ label: c.rc, at: status?.verifiedAt?.RC });

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.icon, { backgroundColor: colors.tealTint }]}>
          <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong" weight="bold">{c.title}</AppText>
          <AppText variant="caption" style={{ color: colors.textMuted, marginTop: 2 }}>
            {c.subtitle}
          </AppText>
        </View>
      </View>

      {loadingStatus ? (
        <View style={styles.statusRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <AppText variant="caption" style={{ color: colors.textMuted, marginLeft: 8 }}>{c.checking}</AppText>
        </View>
      ) : (
        verifiedChips.map((chip) => (
          <View key={chip.label} style={styles.chipRow}>
            <Badge tone="valid" label={`${chip.label} · ${c.verifiedOn}`} />
            {chip.at ? (
              <AppText variant="caption" style={{ color: colors.textMuted, marginLeft: 8 }}>
                {new Date(chip.at).toLocaleDateString()}
              </AppText>
            ) : null}
          </View>
        ))
      )}

      <Button
        title={busy === 'start' || busy === 'opening' ? c.opening : anyVerified ? c.reVerify : c.verify}
        onPress={start}
        disabled={Boolean(busy)}
        loading={busy === 'exchange'}
        variant={anyVerified ? 'secondary' : 'primary'}
        style={{ marginTop: spacing.sm }}
        icon={<Ionicons name="shield-checkmark-outline" size={18} color={colors.white} />}
      />

      {busy === 'exchange' ? (
        <AppText variant="caption" style={{ color: colors.textMuted, marginTop: 6, textAlign: 'center' }}>
          {c.verifying}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardMuted: {
    backgroundColor: colors.surfaceMuted || colors.surface,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
});

// Re-exported for the screen's useEffect-based link handling.
export { isDigiLockerCallbackUrl };