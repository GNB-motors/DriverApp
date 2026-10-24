import React, { useState } from 'react';
import { Platform, Linking } from 'react-native';
import { Card, AppText, Button, colors } from './ui';
import { useAuth } from '../context/AuthContext';
export default function PushSettings() {
  const { enableNotifications } = useAuth();
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  if (Platform.OS === 'web') return <Card><AppText muted>Remote notifications require an installed native development or release build.</AppText></Card>;
  return <Card><AppText weight="semibold">Notifications</AppText><AppText muted>Enable alerts on this device. Permission and native push credentials are required.</AppText><Button label="Enable notifications" loading={busy} onPress={async () => {
    setBusy(true);
    try { const token = await enableNotifications(); setMessage(token ? 'Device registered. Delivery depends on server push configuration.' : 'Notifications unavailable. Check device permissions and the installed build configuration.'); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }} /><Button label="Open notification settings" variant="secondary" onPress={() => Linking.openSettings().catch((error) => setMessage(error.message))} />{message ? <AppText color={colors.textMuted}>{message}</AppText> : null}</Card>;
}
