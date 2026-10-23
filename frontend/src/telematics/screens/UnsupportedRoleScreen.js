import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Button, colors } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
export default function UnsupportedRoleScreen() {
  const { logout } = useAuth(); const [error, setError] = useState('');
  return <SafeAreaView style={s.page}><View style={s.content}><AppText variant="h1">Please use the web dashboard</AppText><AppText muted>This account role has no mobile workspace. Sign out to use another account.</AppText>{error ? <AppText color={colors.error}>{error}</AppText> : null}<Button label="Sign out" onPress={async () => { try { await logout(); } catch (err) { setError(err.message); } }} /></View></SafeAreaView>;
}
const s = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24 }, content: { gap: 20, maxWidth: 520, alignSelf: 'center', width: '100%' } });
