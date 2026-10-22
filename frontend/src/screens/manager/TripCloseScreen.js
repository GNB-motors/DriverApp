/**
 * TripCloseScreen.js
 *
 * Interface to close a trip (Stage 6) -> requires unloadLocation, unloadedAt.
 */

import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useErp } from '../../context/ErpContext';
import { useAuth } from '../../context/AuthContext';
import { closeErpTrip } from '../../services/erpApi';
import { AppText, Button, Card, colors, spacing, radius } from '../../components/ui';
import { TextInput } from 'react-native';
import VehicleLoader from '../../components/ui/VehicleLoader';

export default function TripCloseScreen({ route, navigation }) {
  const { tripId } = route.params || {};
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { triggerRefresh } = useErp();
  
  const [form, setForm] = useState({
    unloadedAt: new Date().toISOString().split('T')[0],
    unloadLocation: '',
    reportEmpty: false,
    emptyTo: '',
    emptyKm: '',
    closeRemarks: '',
  });
  
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.unloadLocation) return Alert.alert('Missing Info', 'Please specify the unload location.');
    if (form.reportEmpty && !form.emptyTo) return Alert.alert('Missing Info', 'Please specify the empty-to location.');

    setLoading(true);
    try {
      await closeErpTrip(token, tripId, {
        unloadedAt: form.unloadedAt,
        unloadLocation: form.unloadLocation,
        reportEmpty: form.reportEmpty,
        emptyTo: form.reportEmpty ? form.emptyTo : undefined,
        emptyKm: form.reportEmpty ? Number(form.emptyKm) : undefined,
        closeRemarks: form.closeRemarks,
      });

      triggerRefresh();
      navigation.navigate('Main'); // Reset to home/main tabs
      Alert.alert('Success', 'Trip closed successfully.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || err.message || 'Failed to close trip');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
      <StatusBar style="dark" />
      <VehicleLoader visible={loading} message="Closing Trip..." />

      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <AppText variant="h2" weight="extrabold">End Trip</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card padding={20}>
          <AppText variant="label" muted style={{ marginBottom: 16 }}>UNLOADING DETAILS</AppText>
          
          <View style={styles.field}>
            <AppText variant="small" weight="semibold" style={styles.label}>Unload Location</AppText>
            <TextInput
              style={styles.input}
              value={form.unloadLocation}
              onChangeText={(t) => setForm(f => ({ ...f, unloadLocation: t }))}
              placeholder="e.g. Warehouse A, Delhi"
            />
          </View>

          <View style={styles.field}>
            <AppText variant="small" weight="semibold" style={styles.label}>Remarks</AppText>
            <TextInput
              style={styles.input}
              value={form.closeRemarks}
              onChangeText={(t) => setForm(f => ({ ...f, closeRemarks: t }))}
              placeholder="Any damages or delays?"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={[styles.field, { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <AppText variant="bodyStrong" weight="semibold">Report Vehicle as Empty?</AppText>
            <Pressable
              style={[styles.toggleBtn, form.reportEmpty && styles.toggleActive]}
              onPress={() => setForm(f => ({ ...f, reportEmpty: !f.reportEmpty }))}
            >
              <View style={[styles.toggleKnob, form.reportEmpty && styles.toggleKnobActive]} />
            </Pressable>
          </View>

          {form.reportEmpty && (
            <View style={styles.emptyCard}>
              <View style={styles.field}>
                <AppText variant="small" weight="semibold" style={styles.label}>Proceeding Empty To</AppText>
                <TextInput
                  style={styles.input}
                  value={form.emptyTo}
                  onChangeText={(t) => setForm(f => ({ ...f, emptyTo: t }))}
                  placeholder="e.g. Surat"
                />
              </View>
              <View style={styles.field}>
                <AppText variant="small" weight="semibold" style={styles.label}>Est. Empty Distance (Km)</AppText>
                <TextInput
                  style={styles.input}
                  value={form.emptyKm}
                  onChangeText={(t) => setForm(f => ({ ...f, emptyKm: t }))}
                  keyboardType="number-pad"
                  placeholder="e.g. 150"
                />
              </View>
            </View>
          )}

          <Button label="Confirm & End Trip" onPress={handleSubmit} size="lg" style={{ marginTop: 20 }} />
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
  toggleBtn: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.border,
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: { backgroundColor: colors.primary },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.white,
  },
  toggleKnobActive: { transform: [{ translateX: 20 }] },
  emptyCard: {
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: radius.md,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
