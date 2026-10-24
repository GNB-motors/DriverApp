import React, { Children, isValidElement, useEffect, useState } from 'react';
import { FlatList, Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';
import AppText from './AppText';
import BottomSheet from './BottomSheet';
import TextField from './TextField';

// Keep Picker's value and callback contract so existing forms retain their behavior.
export default function SelectField({ children, selectedValue, onValueChange, enabled = true, accessibilityLabel = 'Select an option', style }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const options = Children.toArray(children).filter(isValidElement).map((child, index) => ({
    value: child.props.value,
    label: child.props.label,
    enabled: child.props.enabled !== false,
    index,
  }));
  const selected = options.find((option) => Object.is(option.value, selectedValue));
  const search = query.trim().toLocaleLowerCase();
  const filtered = options.filter((option) => String(option.label).toLocaleLowerCase().includes(search));
  useEffect(() => { if (!enabled) setOpen(false); }, [enabled]);

  function close() {
    Keyboard.dismiss();
    setOpen(false);
  }

  return (
    <View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel}: ${selected?.label || 'Choose an option'}`}
        accessibilityState={{ disabled: !enabled, expanded: open }}
        disabled={!enabled}
        onPress={() => { Keyboard.dismiss(); setQuery(''); setOpen(true); }}
        style={[styles.field, open && styles.fieldOpen, !enabled && styles.disabled]}
      >
        <AppText variant="small" weight="medium" muted={!selected} style={[styles.value, styles.valueText]}>{selected?.label || 'Choose an option'}</AppText>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>
      <BottomSheet visible={open && enabled} onClose={close} avoidKeyboard style={styles.sheet}>
        <View style={styles.heading}>
          <AppText variant="h3" accessibilityRole="header" style={styles.value}>{accessibilityLabel}</AppText>
          <Pressable accessibilityRole="button" accessibilityLabel="Close selection" onPress={close} style={styles.close}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>
        {options.length > 8 && (
          <TextField icon="search-outline" placeholder="Search options" accessibilityLabel={`Search ${accessibilityLabel.toLowerCase()}`} value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} returnKeyType="search" />
        )}
        <FlatList
          data={filtered}
          keyExtractor={(option) => `${typeof option.value}:${String(option.value)}`}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={<AppText variant="small" muted center style={styles.empty}>No matching options</AppText>}
          renderItem={({ item }) => {
            const checked = Object.is(item.value, selectedValue);
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityLabel={String(item.label)}
                accessibilityState={{ checked, disabled: !item.enabled }}
                disabled={!item.enabled}
                style={[styles.option, checked && styles.selected, !item.enabled && styles.disabled]}
                onPress={() => { close(); if (!checked) onValueChange?.(item.value, item.index); }}
              >
                <AppText variant="small" weight={checked ? 'semibold' : 'regular'} color={checked ? colors.primary : colors.text} style={[styles.value, styles.valueText]}>{item.label}</AppText>
                <Ionicons name={checked ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={checked ? colors.primary : colors.border} />
              </Pressable>
            );
          }}
        />
      </BottomSheet>
    </View>
  );
}

function SelectOption() { return null; }
SelectField.Item = SelectOption;

const styles = StyleSheet.create({
  field: { minHeight: 52, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.background },
  fieldOpen: { borderColor: colors.primary },
  value: { flex: 1, minWidth: 0 },
  valueText: { fontSize: 15, lineHeight: 22 },
  disabled: { opacity: 0.5 },
  sheet: { maxHeight: '80%' },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  close: { width: 44, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  list: { flexGrow: 0, flexShrink: 1 },
  option: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 14, borderRadius: radius.md },
  selected: { backgroundColor: colors.blueTint },
  separator: { height: spacing.xs },
  empty: { paddingVertical: spacing.lg },
});
