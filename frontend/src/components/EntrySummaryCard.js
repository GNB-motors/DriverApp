import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import styles, { COLORS } from '../styles/UploadPhotosScreen.styles';

export default function EntrySummaryCard({
  state,
  dispatch,
  driverName,
  vehicleLabel,
  needsOdometer,
  lastOdometer
}) {
  const { t } = useLanguage();
  const fillingType = needsOdometer ? t('summary', 'fullTank') : t('summary', 'partialFill');
  const fillingColor = needsOdometer ? COLORS.primary : '#F59E0B';

  const editableRows = [
    { label: t('summary', 'litres'), key: 'litres', value: state.litres, placeholder: t('summary', 'notCaptured'), unit: 'L' },
    { label: t('summary', 'rate'), key: 'rate', value: state.rate, placeholder: t('summary', 'notCaptured'), unit: '₹/L' },
    ...(needsOdometer ? [{ label: t('summary', 'odometer'), key: 'odometerReading', value: state.odometerReading, placeholder: t('summary', 'notCaptured'), unit: 'km', isOdo: true }] : []),
    { label: t('summary', 'location'), key: 'location', value: state.location, placeholder: t('summary', 'notCaptured'), unit: null },
  ];

  return (
    <View style={styles.previewCard}>
      {/* ── Header ── */}
      <View style={styles.previewHeader}>
        <View style={styles.previewHeaderLeft}>
          <Ionicons name="receipt-outline" size={17} color={COLORS.primary} />
          <Text style={styles.previewTitle}>{t('summary', 'title')}</Text>
        </View>
      </View>

      {/* ── Identity chips: Vehicle + Driver + Filling type ── */}
      <View style={styles.previewChips}>
        <View style={styles.previewChip}>
          <Ionicons name="car-outline" size={13} color={COLORS.primary} />
          <Text style={styles.previewChipText}>{vehicleLabel}</Text>
        </View>
        <View style={styles.previewChip}>
          <Ionicons name="person-outline" size={13} color={COLORS.primary} />
          <Text style={styles.previewChipText}>{driverName}</Text>
        </View>
        <View style={[styles.previewChip, { borderColor: fillingColor, backgroundColor: fillingColor + '18' }]}>
          <Ionicons name={needsOdometer ? 'speedometer-outline' : 'water-outline'} size={13} color={fillingColor} />
          <Text style={[styles.previewChipText, { color: fillingColor }]}>{fillingType}</Text>
        </View>
        <View style={[styles.previewChip, { borderColor: '#64748B' }]}>
          <Text style={[styles.previewChipText, { color: '#64748B' }]}>{state.fuelType}</Text>
        </View>
      </View>

      {/* ── Odometer guard banner ── */}
      {needsOdometer && (
        <View style={[
          styles.odoContextBanner,
          state.odometerError ? styles.odoContextBannerError : styles.odoContextBannerInfo,
        ]}>
          <Ionicons
            name={state.odometerError ? 'alert-circle' : 'speedometer-outline'}
            size={13}
            color={state.odometerError ? COLORS.errorText : COLORS.primary}
          />
          <Text style={[
            styles.odoContextText,
            state.odometerError && styles.odoContextTextError,
          ]}>
            {state.odometerError
              ? state.odometerError
              : lastOdometer?.odometerReading != null
                ? t('summary', 'lastRecorded').replace('{{last}}', lastOdometer.odometerReading)
                : t('summary', 'noPriorLogs')}
          </Text>
        </View>
      )}

      {/* ── Divider ── */}
      <View style={styles.previewDivider} />

      {/* ── Editable / read-only data rows ── */}
      {editableRows.map(({ label, key, value, placeholder, unit, isOdo }, idx) => {
        const isLast = idx === editableRows.length - 1;
        const hasError = isOdo && !!state.odometerError;
        return (
          <View key={key} style={[styles.previewRow, isLast && styles.previewRowLast]}>
            <Text style={styles.previewLabel}>{label}</Text>
            <View style={styles.previewInputWrapper}>
              <TextInput
                style={[
                  styles.previewInput,
                  hasError && styles.previewInputError,
                ]}
                value={value}
                onChangeText={(txt) => {
                  dispatch({ type: 'UPDATE_FIELD', field: key, value: txt });
                  if (isOdo && lastOdometer?.odometerReading != null) {
                    const parsed = parseFloat(txt);
                    if (!txt || isNaN(parsed)) {
                      dispatch({ type: 'SET_ODOMETER_ERROR', error: t('summary', 'odoRequired') });
                    } else if (parsed <= lastOdometer.odometerReading) {
                      dispatch({ type: 'SET_ODOMETER_ERROR', error: t('summary', 'mustBeGreater').replace('{{last}}', lastOdometer.odometerReading) });
                    } else {
                      dispatch({ type: 'SET_ODOMETER_ERROR', error: null });
                    }
                  }
                }}
                placeholder={placeholder}
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                keyboardType={['litres', 'rate', 'odometerReading'].includes(key) ? 'numeric' : 'default'}
                returnKeyType="done"
              />
              {unit && <Text style={styles.previewInputUnit}>{unit}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}
