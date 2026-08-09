/**
 * FinanceScreen.js
 *
 * Owner's view of financial ratios, freight vs advances, unbilled trips.
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card, colors, spacing } from '../../components/ui';
import VehicleLoader from '../../components/ui/VehicleLoader';

export default function FinanceScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading finance data
    setTimeout(() => setLoading(false), 800);
  }, []);

  return (
    <View style={styles.flex}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <AppText variant="h2" weight="extrabold">Finance & Accounts</AppText>
      </View>

      {loading ? (
        <VehicleLoader visible={true} overlay={false} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          
          <Card padding={20} style={{ marginBottom: 16 }}>
            <AppText variant="caption" muted>TOTAL REVENUE YTD</AppText>
            <AppText variant="h1" weight="extrabold" color={colors.primaryDeep} style={{ marginVertical: 6 }}>
              ₹24,50,000
            </AppText>
            <AppText variant="small" color={colors.success}>+12% from last month</AppText>
          </Card>

          <View style={{ flexDirection: 'row', gap: 14, marginBottom: 16 }}>
            <Card padding={16} style={{ flex: 1 }}>
              <AppText variant="caption" muted>UNBILLED LRs</AppText>
              <AppText variant="h2" weight="extrabold" color={colors.warning} style={{ marginVertical: 4 }}>18</AppText>
              <AppText variant="small" muted>Awaiting pod</AppText>
            </Card>
            <Card padding={16} style={{ flex: 1 }}>
              <AppText variant="caption" muted>PENDING DUES</AppText>
              <AppText variant="h2" weight="extrabold" color={colors.danger} style={{ marginVertical: 4 }}>₹4.2L</AppText>
              <AppText variant="small" muted>From parties</AppText>
            </Card>
          </View>

          <AppText variant="label" muted style={styles.sectionTitle}>ADVANCE VS FREIGHT RATIO</AppText>
          <Card padding={20}>
            {/* Placeholder for chart/bars */}
            <View style={styles.barWrap}>
              <View style={[styles.barFill, { width: '65%', backgroundColor: colors.primary }]} />
              <View style={[styles.barFill, { width: '35%', backgroundColor: colors.warning }]} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />
                <AppText variant="small" weight="medium">Freight Received</AppText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.warning }} />
                <AppText variant="small" weight="medium">Driver Advances</AppText>
              </View>
            </View>
          </Card>

        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 22, paddingBottom: 16, backgroundColor: colors.surface },
  backBtn: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 22 },
  sectionTitle: { marginBottom: 14, marginTop: 10, letterSpacing: 1 },
  barWrap: { height: 16, borderRadius: 8, flexDirection: 'row', overflow: 'hidden' },
  barFill: { height: '100%' },
});
