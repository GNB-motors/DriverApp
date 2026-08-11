/**
 * NotificationsScreen.js
 *
 * There is no per-user notification feed on the backend yet — the `notifications`
 * module exposes only SUPER_ADMIN trigger and diagnostics routes. What DOES exist
 * is the owner-alert feed:
 *
 *   GET /api/owner-alerts        (Owner + Manager only)
 *   PUT /api/owner-alerts/:id/ack
 *
 * So this screen surfaces that where the role allows it, and is honest about
 * having nothing to show where it does not, rather than rendering a hardcoded
 * "All caught up" empty state with no data source behind it (which is what it did
 * before — it looked identical whether there were zero alerts or no API at all).
 *
 * When a real per-user feed ships, swap the fetcher here; the layout stands.
 */

import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { useAccess } from '../../context/AccessContext';
import useList from '../../hooks/useList';
import { fetchOwnerAlerts, ackOwnerAlert } from '../../services/erpApi';
import ListScreen from '../../components/ListScreen';
import {
  AppText, Card, Badge, Button, SubHeader, EmptyState, colors, radius,
} from '../../components/ui';
import { StatusBar } from 'expo-status-bar';

/** Alert severity → badge tone + icon. */
const SEVERITY = {
  CRITICAL: { tone: 'expired', icon: 'alert-circle', color: colors.error },
  HIGH: { tone: 'pending', icon: 'warning', color: colors.warning },
  MEDIUM: { tone: 'info', icon: 'information-circle', color: colors.primary },
  LOW: { tone: 'neutral', icon: 'ellipse', color: colors.textMuted },
};

const severity = (s) => SEVERITY[String(s || '').toUpperCase()] || SEVERITY.MEDIUM;

const humanise = (s) =>
  String(s || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());

export default function NotificationsScreen({ navigation }) {
  const { token } = useAuth();
  const { can, resolved } = useAccess();
  const canSee = can('alerts.view');

  const list = useList(fetchOwnerAlerts, {
    initial: { status: 'UNACKED' },
    enabled: canSee,
  });
  const [acking, setAcking] = useState(null);

  const ack = async (alert) => {
    setAcking(alert._id);
    try {
      await ackOwnerAlert(token, alert._id);
      list.refresh();
    } catch (err) {
      Alert.alert('Could not acknowledge', err?.message || 'Something went wrong.');
    } finally {
      setAcking(null);
    }
  };

  // Drivers and other roles have no alert feed to read — say so plainly.
  if (resolved && !canSee) {
    return (
      <View style={styles.flex}>
        <StatusBar style="dark" />
        <SubHeader title="Alerts" onBack={() => navigation.goBack()} />
        <EmptyState
          icon="notifications-off-outline"
          title="No alerts for you"
          message="Alerts about documents, approvals and fuel go to owners and managers."
        />
      </View>
    );
  }

  return (
    <ListScreen
      title="Alerts"
      subtitle={list.meta?.total ? `${list.meta.total} unacknowledged` : undefined}
      onBack={() => navigation.goBack()}
      list={list}
      filters={[
        { value: 'UNACKED', label: 'Open' },
        { value: 'ACKED', label: 'Acknowledged' },
      ]}
      filterKey="status"
      renderItem={({ item }) => {
        const sev = severity(item.severity);
        const open = !item.acknowledgedAt;

        return (
          <Card padding={16} elevated="sm" style={styles.card}>
            <View style={styles.head}>
              <View style={[styles.icon, { backgroundColor: `${sev.color}18` }]}>
                <Ionicons name={sev.icon} size={17} color={sev.color} />
              </View>
              <View style={styles.headText}>
                <AppText variant="bodyStrong" weight="bold" numberOfLines={2}>
                  {item.title || humanise(item.type)}
                </AppText>
                <AppText variant="caption" muted weight="medium">
                  {item.createdAt ? dayjs(item.createdAt).format('DD MMM YYYY, HH:mm') : '—'}
                </AppText>
              </View>
              <Badge tone={sev.tone} label={humanise(item.severity) || 'Alert'} />
            </View>

            {item.message || item.description ? (
              <AppText variant="small" style={styles.message}>
                {item.message || item.description}
              </AppText>
            ) : null}

            {item.vehicleNumber || item.entityLabel ? (
              <AppText variant="caption" muted weight="medium" style={styles.entity}>
                {item.vehicleNumber || item.entityLabel}
              </AppText>
            ) : null}

            {open ? (
              <Button
                variant="secondary"
                size="sm"
                label="Acknowledge"
                loading={acking === item._id}
                onPress={() => ack(item)}
                style={styles.ackBtn}
              />
            ) : null}
          </Card>
        );
      }}
      empty={{
        icon: 'notifications-off-outline',
        title: 'All caught up',
        message: 'Nothing needs your attention right now.',
      }}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  card: { marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icon: {
    width: 36, height: 36, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  headText: { flex: 1 },
  message: { marginTop: 12 },
  entity: { marginTop: 8 },
  ackBtn: { marginTop: 14 },
});
