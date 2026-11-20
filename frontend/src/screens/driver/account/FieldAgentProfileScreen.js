import React, { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import {
  AppText,
  Card,
  Button,
  ListRow,
  BottomSheet,
  colors,
  spacing,
  radius,
} from '../../../components/ui';

export default function FieldAgentProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { logout, user, organization } = useAuth();
  const { language, t } = useLanguage();
  const c = (key, fallback) => t('fieldAgent', key) || fallback;

  const [showHelpSheet, setShowHelpSheet] = useState(false);

  const confirmLogout = () =>
    Alert.alert(
      c('logoutConfirm', 'Log out?'),
      c('logoutMessage', 'You will need to sign in again.'),
      [
        { text: c('cancel', 'Cancel'), style: 'cancel' },
        { text: c('logout', 'Log out'), style: 'destructive', onPress: logout },
      ]
    );

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.name ||
    '';
  const agent = {
    name: fullName || '—',
    phone: user?.mobileNumber || user?.phone || '—',
    role: c('role', 'Field Agent'),
    initials: (fullName.trim()[0] || 'A').toUpperCase(),
    company: organization?.companyName || organization?.name || c('noOrgSelected', 'No org selected'),
  };

  const languageDisplayName =
    language === 'hi' ? 'हिन्दी' : language === 'bn' ? 'বাংলা' : 'English';

  const settingsRows = [
    {
      icon: 'language-outline',
      title: c('language', 'Language'),
      right: <AppText variant="body" weight="medium" color={colors.primary}>{languageDisplayName}</AppText>,
      onPress: () => navigation.navigate('LanguageScreen'),
    },
    {
      icon: 'notifications-outline',
      title: c('notifications', 'Notifications'),
      onPress: () => navigation.navigate('Alerts'),
    },
    {
      icon: 'help-circle-outline',
      title: c('helpSupport', 'Help & support'),
      onPress: () => setShowHelpSheet(true),
    },
  ];

  const handleCall = () => {
    Linking.openURL('tel:18008890120').catch(() => {
      Alert.alert('Phone dialer unavailable', 'Call Highway Sahayak Support at 1800-889-0120.');
    });
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `Hello Highway Sahayak Support, I am Field Agent ${fullName} (${user?.mobileNumber || ''}) needing assistance.`
    );
    Linking.openURL(`https://wa.me/918000000000?text=${text}`).catch(() => {
      Alert.alert('WhatsApp unavailable', 'Please contact support via phone or email.');
    });
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Field Agent Support - ${fullName}`);
    Linking.openURL(`mailto:support@gnbedge.in?subject=${subject}`).catch(() => {
      Alert.alert('Email client unavailable', 'Please email support@gnbedge.in');
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Gradient header — Nova SpiceKit */}
      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + spacing.sm }]}
      >
        <View style={styles.headerContent}>
          {/* Avatar — white ring + infoBg fill */}
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <AppText weight="extrabold" color={colors.primary} style={styles.avatarText}>
                {agent.initials}
              </AppText>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="h3" weight="extrabold" color={colors.white}>
              {agent.name}
            </AppText>
            <AppText variant="small" color={colors.onPrimaryMuted}>
              {agent.phone} · {agent.role}
            </AppText>
            <AppText variant="small" color={colors.onPrimaryMuted} numberOfLines={1}>
              {agent.company}
            </AppText>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Settings group */}
        <Card style={styles.group}>
          {settingsRows.map((r, i) => (
            <View key={r.title}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <ListRow
                icon={r.icon}
                title={r.title}
                right={r.right}
                onPress={r.onPress}
                showChevron={!r.right}
                style={styles.rowFlat}
              />
            </View>
          ))}
        </Card>

        {/* Log out button */}
        <Pressable
          style={styles.logout}
          onPress={confirmLogout}
          accessibilityRole="button"
          accessibilityLabel={c('logout', 'Log out')}
        >
          <Ionicons name="log-out-outline" size={19} color={colors.error} />
          <AppText variant="bodyStrong" weight="bold" color={colors.error}>
            {c('logout', 'Log out')}
          </AppText>
        </Pressable>

        <AppText variant="caption" muted style={styles.version}>
          Sahayak · Highway Sahayak Drive v1.0.1
        </AppText>
      </ScrollView>

      {/* Help & Support BottomSheet */}
      <BottomSheet visible={showHelpSheet} onClose={() => setShowHelpSheet(false)}>
        <View style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <View style={styles.helpIconBadge}>
              <Ionicons name="headset" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="h3" weight="extrabold">
                {c('helpSupport', 'Help & Support')}
              </AppText>
              <AppText variant="small" muted>
                {c('supportHelpline', '24/7 Fleet & Field Operations Desk')}
              </AppText>
            </View>
          </View>

          {/* Contact options */}
          <View style={styles.actionList}>
            <Pressable onPress={handleCall} style={styles.contactBtn}>
              <View style={[styles.contactIconBg, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="call" size={20} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong" weight="bold">
                  {c('callSupport', 'Call Support (24/7)')}
                </AppText>
                <AppText variant="caption" muted>
                  1800-889-0120 · Toll-free
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>

            <Pressable onPress={handleWhatsApp} style={styles.contactBtn}>
              <View style={[styles.contactIconBg, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="logo-whatsapp" size={20} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong" weight="bold">
                  {c('chatWhatsapp', 'WhatsApp Support')}
                </AppText>
                <AppText variant="caption" muted>
                  Quick chat with operations executive
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>

            <Pressable onPress={handleEmail} style={styles.contactBtn}>
              <View style={[styles.contactIconBg, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="mail" size={20} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong" weight="bold">
                  {c('emailSupport', 'Email Support')}
                </AppText>
                <AppText variant="caption" muted>
                  support@gnbedge.in
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Quick Guide */}
          <Card style={styles.guideCard}>
            <AppText variant="bodyStrong" weight="bold" color={colors.text}>
              {c('quickGuide', 'Field Agent Quick Guide')}
            </AppText>
            <View style={styles.guideStep}>
              <View style={styles.stepNum}><AppText variant="caption" weight="bold" color={colors.primary}>1</AppText></View>
              <AppText variant="small" muted style={{ flex: 1 }}>{c('guideStep1', 'Select organisation context before refueling.')}</AppText>
            </View>
            <View style={styles.guideStep}>
              <View style={styles.stepNum}><AppText variant="caption" weight="bold" color={colors.primary}>2</AppText></View>
              <AppText variant="small" muted style={{ flex: 1 }}>{c('guideStep2', 'Capture a clear, well-lit photo of the fuel receipt.')}</AppText>
            </View>
            <View style={styles.guideStep}>
              <View style={styles.stepNum}><AppText variant="caption" weight="bold" color={colors.primary}>3</AppText></View>
              <AppText variant="small" muted style={{ flex: 1 }}>{c('guideStep3', 'Verify vehicle number and pump meter reading.')}</AppText>
            </View>
            <View style={styles.guideStep}>
              <View style={styles.stepNum}><AppText variant="caption" weight="bold" color={colors.primary}>4</AppText></View>
              <AppText variant="small" muted style={{ flex: 1 }}>{c('guideStep4', 'Full-tank entries require odometer photo.')}</AppText>
            </View>
          </Card>

          <Button
            size="md"
            variant="secondary"
            label="Close"
            onPress={() => setShowHelpSheet(false)}
          />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: 22,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.infoBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20 },

  scroll: { paddingHorizontal: 20, paddingTop: 16, gap: 14 },

  group: { overflow: 'hidden', padding: 0 },
  rowFlat: { borderWidth: 0, borderRadius: 0, backgroundColor: 'transparent' },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 68 },

  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    backgroundColor: colors.surface,
  },

  version: { textAlign: 'center', marginTop: 4 },

  sheetContent: {
    gap: 16,
    paddingBottom: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  helpIconBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.infoBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionList: {
    gap: 10,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactIconBg: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideCard: {
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  guideStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.infoBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
