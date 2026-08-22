import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Chip, TextField, WarningBanner, colors, spacing, radius } from '../../components/ui';
import { BackHeader } from '../../components/ui';
import { useSubmit } from '../../hooks/useSubmit';
import billService from '../../services/billService';

// Static reason presets (tap to prefill; the reason stays editable).
const REJECT_REASONS = ['Photo not readable', 'Amount mismatch', 'Duplicate bill', 'Not a valid expense', 'Personal expense'];

/** O3 · Reject — a reason is mandatory. */
export default function OwnerRejectScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const id = route?.params?.id;
  const [reason, setReason] = useState('');
  const [picked, setPicked] = useState(null);
  const { submit, busy, error } = useSubmit();

  const pickReason = (r) => { setPicked(r); setReason(r); };
  const ready = reason.trim().length >= 3 && !busy && !!id;

  // Pop the reject + detail screens to land back on the approvals list
  // (works for both the owner and manager stacks).
  const reject = () => submit(
    () => billService.rejectBill(id, reason.trim()),
    { onSuccess: () => navigation.pop(2) },
  );

  return (
    <View style={styles.container}>
      <BackHeader title="Reject this bill" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.head}>
          <View style={styles.icon}><Ionicons name="close" size={22} color={colors.error} /></View>
          <AppText variant="small" muted style={{ flex: 1 }}>The driver sees your reason and can re-submit.</AppText>
        </View>

        <AppText variant="label" muted>Common reasons</AppText>
        <View style={styles.chips}>
          {REJECT_REASONS.map((r) => (
            <Chip key={r} label={r} color={r === picked ? colors.error : colors.primary} selected={r === picked} onPress={() => pickReason(r)} />
          ))}
        </View>

        <TextField label="Reason for the driver" value={reason} onChangeText={setReason} placeholder="Explain why this bill is rejected" style={styles.field} />

        <WarningBanner tone="info" message="Rejecting does not change the wallet balance." style={styles.field} />
        {error ? <WarningBanner tone="error" message={error} style={styles.field} /> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button variant="secondary" size="lg" label="Cancel" style={{ flex: 1 }} onPress={() => navigation.goBack()} />
        <Button variant="danger" size="lg" label={busy ? 'Rejecting…' : 'Reject bill'} style={{ flex: 1.4 }} disabled={!ready} onPress={reject} />
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
