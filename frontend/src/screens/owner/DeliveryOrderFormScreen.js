/**
 * DeliveryOrderFormScreen.js
 *
 * Owner's interface to quickly create DOs directly from the app.
 */

import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card, colors, spacing, radius } from '../../components/ui';
import { TextInput } from 'react-native';

export default function DeliveryOrderFormScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  
  const [form, setForm] = useState({
    partyName: '',
    material: '',
    qty: '',
    rate: ''
  });

  const handleSubmit = () => {
    Alert.alert('Created', 'Delivery Order successfully created.', [
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
        <AppText variant="h2" weight="extrabold">New Delivery Order</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card padding={20}>
          
          <View style={styles.field}>
            <AppText variant="small" weight="semibold" style={styles.label}>Party Name</AppText>
            <TextInput style={styles.input} value={form.partyName} onChangeText={t => setForm(f => ({...f, partyName: t}))} placeholder="Select or type Party" />
          </View>
          
          <View style={styles.field}>
            <AppText variant="small" weight="semibold" style={styles.label}>Material</AppText>
            <TextInput style={styles.input} value={form.material} onChangeText={t => setForm(f => ({...f, material: t}))} placeholder="e.g. Iron Ore" />
          </View>
          
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <View style={[styles.field, { flex: 1 }]}>
              <AppText variant="small" weight="semibold" style={styles.label}>Quantity (Tons)</AppText>
              <TextInput style={styles.input} value={form.qty} onChangeText={t => setForm(f => ({...f, qty: t}))} keyboardType="numeric" placeholder="e.g. 50" />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <AppText variant="small" weight="semibold" style={styles.label}>Rate per Ton</AppText>
              <TextInput style={styles.input} value={form.rate} onChangeText={t => setForm(f => ({...f, rate: t}))} keyboardType="numeric" placeholder="e.g. 1500" />
            </View>
          </View>

          <Button label="Create DO" onPress={handleSubmit} size="lg" style={{ marginTop: 20 }} />
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
