import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme/theme';
import { useLanguage } from '../context/LanguageContext';

export default function RefuelDetailsScreen({ navigation, route }) {
  const { t } = useLanguage();
  const { vehicleAssigned } = route.params || {};
  const [vehicleNumber, setVehicleNumber] = useState(vehicleAssigned ? 'MH 12 AB 1234' : '');
  const [refuelType, setRefuelType] = useState(null);

  const handleNext = () => {
    navigation.navigate('UploadPhotos', { refuelType });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('refuel', 'title')}</Text>
        <Text style={styles.headerSubtitle}>{t('refuel', 'step')}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>{t('refuel', 'vehicleInput')}</Text>
        <View style={[styles.input, { paddingHorizontal: 0, justifyContent: 'center' }, vehicleAssigned && styles.inputDisabled]}>
          <Picker
            selectedValue={vehicleNumber}
            onValueChange={(itemValue) => setVehicleNumber(itemValue)}
            enabled={!vehicleAssigned}
            dropdownIconColor={theme.colors.primary}
            style={{ color: vehicleNumber ? theme.colors.textPrimary : theme.colors.textSecondary }}
          >
            <Picker.Item label={t('refuel', 'selectVehicle')} value="" />
            <Picker.Item label="MH 12 AB 1234" value="MH 12 AB 1234" />
            <Picker.Item label="MH 14 XY 9876" value="MH 14 XY 9876" />
            <Picker.Item label="DL 01 AA 1111" value="DL 01 AA 1111" />
          </Picker>
        </View>

        <Text style={styles.label}>{t('refuel', 'driverInput')}</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value="Rajesh Kumar"
          editable={false}
        />

        <Text style={styles.label}>{t('refuel', 'typeInput')}</Text>
        <View style={styles.optionsRow}>
          <TouchableOpacity 
            style={[styles.optionCard, refuelType === 'full' && styles.optionSelected]} 
            onPress={() => setRefuelType('full')}
          >
            <Text style={[styles.optionText, refuelType === 'full' && styles.optionTextSelected]}>⛽ {t('refuel', 'full')}</Text>
          </TouchableOpacity>
          <View style={{ width: 16 }} />
          <TouchableOpacity 
            style={[styles.optionCard, refuelType === 'partial' && styles.optionSelected]} 
            onPress={() => setRefuelType('partial')}
          >
            <Text style={[styles.optionText, refuelType === 'partial' && styles.optionTextSelected]}>⛽ {t('refuel', 'partial')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.nextBtn, (!vehicleNumber || !refuelType) && styles.nextBtnDisabled]}
          disabled={!vehicleNumber || !refuelType}
          onPress={handleNext}
        >
          <Text style={styles.nextText}>{t('refuel', 'next')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { padding: theme.spacing.lg, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: theme.colors.border },
  headerTitle: { ...theme.typography.large, color: theme.colors.textPrimary },
  headerSubtitle: { ...theme.typography.small, color: theme.colors.primary, fontWeight: 'bold', marginTop: 4 },
  form: { flex: 1, padding: theme.spacing.lg },
  label: { ...theme.typography.normal, color: theme.colors.textPrimary, marginBottom: 8, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.components.borderRadius, height: 56, paddingHorizontal: 16, marginBottom: theme.spacing.lg, fontSize: 16 },
  inputDisabled: { backgroundColor: theme.colors.surface, color: theme.colors.textSecondary },
  optionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  optionCard: { flex: 1, height: 80, borderWidth: 2, borderColor: theme.colors.border, borderRadius: theme.components.borderRadius, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  optionSelected: { borderColor: theme.colors.primary, backgroundColor: '#e8f0fe' },
  optionText: { ...theme.typography.medium, color: theme.colors.textPrimary },
  optionTextSelected: { color: theme.colors.primary },
  footer: { padding: theme.spacing.lg, backgroundColor: '#fff', borderTopWidth: 1, borderColor: theme.colors.border },
  nextBtn: { backgroundColor: theme.colors.primary, height: 60, borderRadius: theme.components.borderRadius, justifyContent: 'center', alignItems: 'center' },
  nextBtnDisabled: { backgroundColor: theme.colors.border },
  nextText: { color: '#fff', ...theme.typography.medium },
});
