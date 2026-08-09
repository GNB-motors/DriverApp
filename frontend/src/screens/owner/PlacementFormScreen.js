/**
 * PlacementFormScreen.js
 *
 * Owner's interface to quickly create Placements.
 */

import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card, colors, spacing, radius } from '../../components/ui';
import { TextInput } from 'react-native';

export default function PlacementFormScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  
  const [form, setForm] = useState({
    doNumber: '',
    source: '',
    destination: '',
    vehicleType: '',
    freightRate: ''
  });

  const handleSubmit = () => {
    Alert.alert('Created', 'Placement successfully created.', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <AppText variant="h2" weight="extrabold">New Placement</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card padding={20}>
          
          <View style={styles.field}>
            <AppText variant="small" weight="semibold" style={styles.label}>Link DO (Optional)</AppText>
            <TextInput style={styles.input} value={form.doNumber} onChangeText={t => setForm(f => ({...f, doNumber: t}))} placeholder="Search DO..." />
          </View>
          
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <View style={[styles.field, { flex: 1 }]}>
              <AppText variant="small" weight="semibold" style={styles.label}>Source</AppText>
              <TextInput style={styles.input} value={form.source} onChangeText={t => setForm(f => ({...f, source: t}))} placeholder="Origin City" />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <AppText variant="small" weight="semibold" style={styles.label}>Destination</AppText>
              <TextInput style={styles.input} value={form.destination} onChangeText={t => setForm(f => ({...f, destination: t}))} placeholder="Dest City" />
            </View>
          </View>

          <View style={styles.field}>
            <AppText variant="small" weight="semibold" style={styles.label}>Requested Vehicle Type</AppText>
            <TextInput style={styles.input} value={form.vehicleType} onChangeText={t => setForm(f => ({...f, vehicleType: t}))} placeholder="e.g. 10 Wheeler Open" />
          </View>

          <View style={styles.field}>
            <AppText variant="small" weight="semibold" style={styles.label}>Estimated Freight (per Ton)</AppText>
            <TextInput style={styles.input} value={form.freightRate} onChangeText={t => setForm(f => ({...f, freightRate: t}))} keyboardType="numeric" placeholder="e.g. 2000" />
          </View>

          <Button label="Create Placement" onPress={handleSubmit} size="lg" style={{ marginTop: 20 }} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 22, paddingBottom: 16, backgroundColor: colors.surface },
  backBtn: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 22 },
  field: { marginBottom: 16 },
  label: { marginBottom: 8, color: colors.textMuted },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text }
});
