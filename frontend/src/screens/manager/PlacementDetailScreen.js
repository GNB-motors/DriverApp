/**
 * PlacementDetailScreen.js
 *
 * Detailed view of a Placement for managers/owners.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { fetchErpTrips } from '../../services/erpApi'; // Use trip fetch logic if placement detail relies on trip, or custom fetch if separate
import { AppText, Card, colors, spacing } from '../../components/ui';

export default function PlacementDetailScreen({ route, navigation }) {
  const { placementId } = route.params || {};
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  
  // Dummy placeholder logic for detail view
  return (
    <View style={styles.flex}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <AppText variant="h2" weight="extrabold">Placement Detail</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Card padding={20}>
          <AppText variant="body" muted>Placement specifics will appear here.</AppText>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 22, paddingBottom: 16, backgroundColor: colors.surface },
  backBtn: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 22 },
});
