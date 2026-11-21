import React, { useState, useEffect } from 'react';
import { View, Text, Platform, Linking, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Notifications from '../services/notificationsModule';
import { useAuth } from '../context/AuthContext';

const PUSH_TOKEN_KEY = 'expo_push_token';

export default function PushSettings() {
  const { enableNotifications, disableNotifications } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const checkStatus = async () => {
    if (Platform.OS === 'web') return;
    try {
      const stored = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      let hasPerm = false;
      if (Notifications?.getPermissionsAsync) {
        const { status } = await Notifications.getPermissionsAsync();
        hasPerm = status === 'granted';
      }
      setEnabled(Boolean(stored || hasPerm));
    } catch {
      setEnabled(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleToggle = async () => {
    setBusy(true);
    setMessage('');
    try {
      if (enabled) {
        if (disableNotifications) {
          await disableNotifications();
        } else {
          await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
        }
        setEnabled(false);
        setMessage('Notifications disabled on this device.');
      } else {
        const token = await enableNotifications();
        if (token) {
          setEnabled(true);
          setMessage('Notifications active. Delivery registered.');
        } else {
          let permStatus = 'undetermined';
          if (Notifications?.getPermissionsAsync) {
            const { status } = await Notifications.getPermissionsAsync();
            permStatus = status;
          }
          if (permStatus === 'granted') {
            setEnabled(true);
            setMessage('Notifications enabled on device.');
          } else {
            setMessage('Permission required. Please grant permission in notification settings.');
          }
        }
      }
    } catch (err) {
      setMessage(err.message || 'Notification setup failed.');
    } finally {
      setBusy(false);
      checkStatus();
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={s.card}>
        <View style={s.headerRow}>
          <View style={s.iconCircle}>
            <Ionicons name="notifications-outline" size={18} color="#64748B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Push Notifications</Text>
            <Text style={s.cardSubtitle}>Web preview mode active.</Text>
          </View>
        </View>
        <Text style={s.infoText}>Push delivery requires an installed mobile build.</Text>
      </View>
    );
  }

  return (
    <View style={s.card}>
      {/* Header with Live Badge */}
      <View style={s.headerRow}>
        <View style={[s.iconCircle, enabled && { backgroundColor: '#DCFCE7' }]}>
          <Ionicons
            name={enabled ? 'notifications' : 'notifications-off-outline'}
            size={18}
            color={enabled ? '#16A34A' : '#64748B'}
          />
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={s.cardTitle}>Push Notifications</Text>
            <View style={[s.statusBadge, enabled ? s.statusBadgeActive : s.statusBadgeInactive]}>
              <Text style={[s.statusBadgeText, enabled ? s.statusBadgeTextActive : s.statusBadgeTextInactive]}>
                {enabled ? 'Active' : 'Disabled'}
              </Text>
            </View>
          </View>
          <Text style={s.cardSubtitle}>
            {enabled
              ? 'Receiving instant alerts on this device'
              : 'Alerts are currently muted on this device'}
          </Text>
        </View>
      </View>

      {/* Buttons */}
      <View style={s.buttonGroup}>
        <TouchableOpacity
          style={[s.toggleBtn, enabled ? s.toggleBtnDisable : s.toggleBtnEnable, busy && { opacity: 0.7 }]}
          onPress={handleToggle}
          disabled={busy}
          activeOpacity={0.8}
        >
          {busy ? (
            <ActivityIndicator size="small" color={enabled ? '#DC2626' : '#FFFFFF'} />
          ) : (
            <>
              <Ionicons
                name={enabled ? 'notifications-off-outline' : 'notifications-outline'}
                size={16}
                color={enabled ? '#DC2626' : '#FFFFFF'}
              />
              <Text style={[s.toggleBtnText, enabled ? s.toggleBtnTextDisable : s.toggleBtnTextEnable]}>
                {enabled ? 'Disable Notifications' : 'Enable Notifications'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={s.settingsBtn}
          onPress={() => Linking.openSettings().catch((err) => setMessage(err.message))}
          activeOpacity={0.8}
        >
          <Ionicons name="settings-outline" size={15} color="#475569" />
          <Text style={s.settingsBtnText}>Device Permissions</Text>
        </TouchableOpacity>
      </View>

      {message ? (
        <Text style={[s.messageText, enabled ? { color: '#166534' } : { color: '#B45309' }]}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  statusBadgeActive: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeInactive: {
    backgroundColor: '#F1F5F9',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadgeTextActive: {
    color: '#166534',
  },
  statusBadgeTextInactive: {
    color: '#64748B',
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  toggleBtnEnable: {
    backgroundColor: '#1A56DB',
  },
  toggleBtnDisable: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  toggleBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  toggleBtnTextEnable: {
    color: '#FFFFFF',
  },
  toggleBtnTextDisable: {
    color: '#DC2626',
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  settingsBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  messageText: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 2,
  },
  infoText: {
    fontSize: 12,
    color: '#64748B',
  },
});
