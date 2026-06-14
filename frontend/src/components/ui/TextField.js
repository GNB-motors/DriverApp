import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, monoFont, bodyFont } from '../../theme/tokens';
import { useLanguage } from '../../context/LanguageContext';
import AppText from './AppText';

/**
 * TextField — labelled input matching the components.html field spec.
 *
 *   <TextField label="Vehicle Number" icon="car" mono value={v} onChangeText={...} />
 *   <TextField label="Litres" unit="L" mono keyboardType="numeric" error="Required field" />
 *
 * Props: label, value, onChangeText, placeholder, icon (Ionicons, left chip),
 *        unit (right suffix), error (string), mono, editable, keyboardType, …TextInput props.
 */
export default function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  unit,
  error,
  mono = false,
  editable = true,
  style,
  inputStyle,
  ...rest
}) {
  const { language } = useLanguage();
  const hasError = !!error;
  const fontFamily = mono ? monoFont('semibold') : bodyFont(language, 'medium');

  return (
    <View style={style}>
      {label ? (
        <AppText
          variant="label"
          color={hasError ? colors.error : colors.textMuted}
          style={styles.label}
        >
          {label}
        </AppText>
      ) : null}

      <View
        style={[
          styles.field,
          hasError && styles.fieldError,
          !editable && styles.fieldDisabled,
        ]}
      >
        {icon ? (
          <View style={styles.iconChip}>
            <Ionicons name={icon} size={17} color={colors.primary} />
          </View>
        ) : null}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          editable={editable}
          style={[styles.input, { fontFamily, color: hasError ? '#B43029' : colors.text }, inputStyle]}
          {...rest}
        />

        {unit ? (
          <AppText mono weight="semibold" color={colors.textMuted} style={styles.unit}>
            {unit}
          </AppText>
        ) : null}
      </View>

      {hasError ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={colors.error} />
          <AppText variant="small" weight="medium" color={colors.error}>
            {error}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: spacing.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  fieldError: {
    backgroundColor: '#FBE9E7',
    borderColor: '#F0B7B2',
  },
  fieldDisabled: { opacity: 0.6 },
  iconChip: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.tealTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0, // strip Android default
  },
  unit: { flexShrink: 0 },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
});
