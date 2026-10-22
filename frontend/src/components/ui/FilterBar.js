import React from 'react';
import { ScrollView, Pressable, StyleSheet } from 'react-native';
import AppText from './AppText';
import { colors, radius } from '../../theme/tokens';

export default function FilterBar({ filters, activeFilter, onSelectFilter, style }) {
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      contentContainerStyle={[styles.scroll, style]}
    >
      {filters.map((filter) => {
        const isActive = activeFilter === filter.value;
        return (
          <Pressable
            key={filter.value}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => onSelectFilter(filter.value)}
          >
            <AppText 
              variant="small" 
              weight={isActive ? "bold" : "semibold"} 
              color={isActive ? colors.white : colors.textMuted}
            >
              {filter.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 22, paddingVertical: 10, gap: 10 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
});
