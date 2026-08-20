import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, KeyValueTable, KeyValueRow, colors, spacing, radius } from '../../components/ui';
import { BackHeader, Pill } from '../../components/ui';
import * as mock from '../../demo/mock';

/** O2 · Bill detail — confirm or reject. */
export default function OwnerBillDetailScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const d = mock.ownerBillDetail;

  return (
    <View style={styles.container}>
      <BackHeader title={d.name} subtitle={`${d.plate} · ${d.trip}`} onBack={() => navigation.goBack()} right={<Pill tone="pending" label="Pending" />} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.photo}>
          <Ionicons name="document-text-outline" size={44} color={colors.textMuted} />
          <AppText variant="small" muted>Bill photo</AppText>
          <AppText variant="caption" mono muted>{d.file}</AppText>
          <View style={styles.photoBtns}>
            <View style={styles.photoBtn}><Ionicons name="search" size={16} color={colors.text} /></View>
            <View style={styles.photoBtn}><Ionicons name="download-outline" size={16} color={colors.text} /></View>
          </View>
        </View>

        <KeyValueTable>
          <KeyValueRow label="Category" value={d.category} />
          <KeyValueRow label="Bill date" value={d.date} mono />
          <KeyValueRow label="Wallet after confirm" value={d.walletAfter} mono valueColor={colors.success} />
          <KeyValueRow label="Amount claimed" value={d.amount} mono highlight />
        </KeyValueTable>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button variant="secondary" size="lg" icon="close" label="Reject" style={styles.reject} onPress={() => navigation.navigate('OwnerReject')} />
        <Button size="lg" icon="checkmark" label={`Confirm ${d.amount}`} style={styles.confirm} onPress={() => navigation.navigate('OwnerApprovals')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, gap: 16 },
  photo: { height: 250, borderRadius: radius.lg, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 8 },
  photoBtns: { position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', gap: 6 },
  photoBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  reject: { flex: 1, borderColor: '#F0CFCB' },
  confirm: { flex: 1.4 },
});
