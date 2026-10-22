/**
 * UnloadingFormScreen.js
 *
 * Form for stage 8 unloading entry.
 */

import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useErp } from '../../context/ErpContext';
import { AppText, Button, Card, colors, spacing, radius } from '../../components/ui';
import { TextInput } from 'react-native';
import VehicleLoader from '../../components/ui/VehicleLoader';

export default function UnloadingFormScreen({ route, navigation }) {
  const { tripId } = route.params || {};
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { triggerRefresh } = useErp();
  
  const [form, setForm] = useState({
    unloadedQty: '',
    shortageQty: '0',
    damageRemarks: '',
  });
  
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.unloadedQty) return Alert.alert('Missing Info', 'Please specify the unloaded quantity.');

    setLoading(true);
    try {
      // API call to finalize unloading
      // await finalizeUnloading(token, tripId, form);
      triggerRefresh();
      navigation.goBack();
      Alert.alert('Success', 'Unloading details recorded.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || err.message || 'Failed to record unloading');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
      <StatusBar style="dark" />
      <VehicleLoader visible={loading} message="Saving Unloading Info..." />

      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <AppText variant="h2" weight="extrabold">Unloading Entry</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card padding={20}>
          <View style={styles.field}>
            <AppText variant="small" weight="semibold" style={styles.label}>Unloaded Qty</AppText>
            <TextInput
              style={styles.input}
              value={form.unloadedQty}
              onChangeText={(t) => setForm(f => ({ ...f, unloadedQty: t }))}
              keyboardType="decimal-pad"
              placeholder="e.g. 24"
            />
          </View>

          <View style={styles.field}>
            <AppText variant="small" weight="semibold" style={styles.label}>Shortage Qty</AppText>
            <TextInput
              style={styles.input}
              value={form.shortageQty}
              onChangeText={(t) => setForm(f => ({ ...f, shortageQty: t }))}
              keyboardType="decimal-pad"
              placeholder="e.g. 0.5"
            />
          </View>

          <View style={styles.field}>
            <AppText variant="small" weight="semibold" style={styles.label}>Damage / Remarks</AppText>
            <TextInput
              style={styles.input}
              value={form.damageRemarks}
              onChangeText={(t) => setForm(f => ({ ...f, damageRemarks: t }))}
              placeholder="Any issues to report?"
              multiline
              numberOfLines={3}
            />
          </View>

          <Button label="Save Entry" onPress={handleSubmit} size="lg" style={{ marginTop: 20 }} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 22, paddingBottom: 16, backgroundColor: colors.surface },
  backBtn: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 22, paddingBottom: 40 },
  field: { marginBottom: 16 },
  label: { marginBottom: 8, color: colors.textMuted },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    textAlignVertical: 'top',
  },
});
