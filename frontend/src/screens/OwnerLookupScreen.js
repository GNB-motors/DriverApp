import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { fetchVehicles, fetchDrivers } from '../services/api';
import logger from '../utils/logger';
import { AppText, ScreenHeader, TextField, colors, spacing, radius } from '../components/ui';

const STATUS_COLOR = {
  ACTIVE: colors.validText,
  AVAILABLE: colors.validText,
  ON_TRIP: colors.primary,
  MAINTENANCE: colors.pendingText,
  PENDING: colors.pendingText,
  SUSPENDED: colors.expiredText,
};

export default function OwnerLookupScreen() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState('vehicles');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  const MODES = [
    { key: 'vehicles', label: t('owner', 'vehicles') || 'Vehicles' },
    { key: 'drivers', label: t('owner', 'drivers') || 'Drivers' },
  ];

  const load = useCallback(async (query) => {
    setLoading(true);
    try {
      const data = mode === 'vehicles'
        ? await fetchVehicles(token, { search: query })
        : await fetchDrivers(token, { search: query });
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      logger.error('OwnerLookup', `Error fetching ${mode}: ${err?.message}`);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [mode, token]);

  // Reset and reload whenever the segment changes
  useEffect(() => { setSearch(''); load(''); }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce search-as-you-type
  useEffect(() => {
    const handle = setTimeout(() => load(search), 350);
    return () => clearTimeout(handle);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderVehicle = ({ item }) => {
    const statusColor = STATUS_COLOR[item.status] || colors.textMuted;
    return (
      <View style={styles.card}>
        <View style={styles.iconTile}>
          <Ionicons name="car-sport" size={21} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText mono weight="bold" style={styles.cardMain}>{item.registrationNumber}</AppText>
          <AppText variant="caption" muted>{item.vehicleType || item.model || '—'}</AppText>
        </View>
        <AppText variant="small" weight="bold" color={statusColor} style={styles.cardStatus}>
          {item.status || '—'}
        </AppText>
      </View>
    );
  };

  const renderDriver = ({ item }) => {
    const statusColor = STATUS_COLOR[item.status] || colors.textMuted;
    const name = `${item.firstName || ''} ${item.lastName || ''}`.trim() || '—';
    return (
      <View style={styles.card}>
        <View style={styles.iconTile}>
          <Ionicons name="person" size={21} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText weight="bold" style={styles.cardMain}>{name}</AppText>
          <AppText mono variant="caption" muted>{item.mobileNumber || '—'}</AppText>
        </View>
        <AppText variant="small" weight="bold" color={statusColor} style={styles.cardStatus}>
          {item.status || '—'}
        </AppText>
      </View>
    );
  };

  const subtitle = loading ? '' : `${results.length} ${MODES.find((m) => m.key === mode)?.label.toLowerCase()} found`;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScreenHeader title={t('owner', 'lookupTitle') || 'Vehicle & Driver Lookup'} subtitle={subtitle} />

      <View style={styles.sheet}>
        {/* Mode chips */}
        <View style={styles.chips}>
          {MODES.map((m) => {
            const active = mode === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => setMode(m.key)}
                style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
              >
                <AppText variant="small" weight={active ? 'bold' : 'semibold'} color={active ? colors.white : '#566661'}>
                  {m.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <TextField
          icon="search"
          placeholder={mode === 'vehicles'
            ? (t('owner', 'searchVehiclePlaceholder') || 'Search by registration number')
            : (t('owner', 'searchDriverPlaceholder') || 'Search by driver name')}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="characters"
          style={styles.search}
        />

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => String(item._id)}
            renderItem={mode === 'vehicles' ? renderVehicle : renderDriver}
            contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name={mode === 'vehicles' ? 'car-outline' : 'people-outline'} size={56} color={colors.border} />
                <AppText muted center style={{ marginTop: spacing.md }}>{t('owner', 'noResults') || 'No results found'}</AppText>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  sheet: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 22,
    paddingTop: 20,
  },

  chips: { flexDirection: 'row', gap: 9, marginBottom: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.full },
  chipActive: { backgroundColor: colors.primary },
  chipIdle: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },

  search: { marginBottom: 16 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 13,
    marginBottom: 11,
    shadowColor: '#102824',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconTile: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.tealTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMain: { fontSize: 15 },
  cardStatus: { fontSize: 12, textTransform: 'capitalize' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  empty: { alignItems: 'center', paddingTop: 60 },
});
