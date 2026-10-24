import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { createTelematicsApi } from '../telematics/services/telematicsApi';

export default function NotificationRouter({ navigationRef, ready }) {
  const { user, token, loading, invalidateSession } = useAuth();
  const [pending, setPending] = useState(null);
  const handled = useRef(new Set());
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const accept = (response) => { if (response) setPending(response); };
    const listener = Notifications.addNotificationResponseReceivedListener(accept);
    Notifications.getLastNotificationResponseAsync().then(accept).catch(() => {});
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (!ready || loading || !user || !token || !pending || !navigationRef.isReady()) return undefined;
    const id = pending.notification.request.identifier;
    if (handled.current.has(id)) return undefined;
    const data = pending.notification.request.content.data;
    const orgId = typeof user.orgId === 'object' ? user.orgId?._id : user.orgId;
    if (data?.userId !== String(user._id) || data?.orgId !== String(orgId)) return undefined;
    let active = true;
    const service = createTelematicsApi({ baseURL: process.env.EXPO_PUBLIC_API_URL, token, user,
      audience: user.role === 'DRIVER' ? 'driver' : 'manager', onUnauthorized: () => invalidateSession(token) });
    (async () => {
      if (data.kind === 'DRIVER_ALERT' && user.role === 'DRIVER' && data.alertId) {
        await service.driverAlert(data.alertId);
        if (active) navigationRef.navigate('Alert detail', { id: data.alertId });
      } else if (data.kind === 'INCIDENT' && ['OWNER', 'MANAGER'].includes(user.role) && data.incidentId) {
        await service.fleetRecord('issues', data.incidentId);
        if (active) navigationRef.navigate('Review detail', { id: data.incidentId, kind: 'issues' });
      }
      if (active) handled.current.add(id);
    })().catch(() => { if (active) handled.current.add(id); });
    return () => { active = false; };
  }, [ready, loading, user, token, pending, navigationRef, invalidateSession]);
  return null;
}
