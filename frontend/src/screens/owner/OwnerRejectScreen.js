import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Chip, TextField, WarningBanner, colors, spacing, radius } from '../../components/ui';
import { BackHeader } from '../../components/ui';
import * as mock from '../../demo/mock';

/** O3 · Reject — a reason is mandatory. */
export default function OwnerRejectScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState('Bill photo is blurred, amount not readable. Please re-upload a clear photo.');
  const [picked, setPicked] = useState('Photo not readable');

  return (
    <View style={styles.container}>
      <BackHeader title="Reject this bill" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.head}>
          <View style={styles.icon}><Ionicons name="close" size={22} color={colors.error} /></View>
          <AppText variant="small" muted style={{ flex: 1 }}>Ramesh sees your reason and can re-submit.</AppText>
        </View>

        <AppText variant="label" muted>Common reasons</AppText>
        <View style={styles.chips}>
          {mock.rejectReasons.map((r) => (
            <Chip key={r} label={r} color={r === picked ? colors.error : colors.primary} selected={r === picked} onPress={() => setPicked(r)} />
          ))}
        </View>

        <TextField label="Reason for the driver" value={reason} onChangeText={setReason} style={styles.field} />

        <WarningBanner tone="info" message="Rejecting does not change the wallet balance." style={styles.field} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button variant="secondary" size="lg" label="Cancel" style={{ flex: 1 }} onPress={() => navigation.goBack()} />
        <Button variant="danger" size="lg" label="Reject bill" style={{ flex: 1.4 }} onPress={() => navigation.navigate('OwnerApprovals')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  icon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.expiredBg, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  field: { marginTop: 10 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});
