import React from 'react';
import { View, FlatList, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  AppText, Card, SubHeader, FilterBar, EmptyState, colors, radius,
} from './ui';

/**
 * ListScreen — the shell every ERP list screen shares: header, optional filter
 * bar, loading / error / empty states, pull-to-refresh, and infinite scroll.
 *
 * Pair it with `useList`:
 *
 *   const list = useList(fetchErpTrips, { initial: { state: '' } });
 *   return (
 *     <ListScreen
 *       title="Trips"
 *       list={list}
 *       filters={TRIP_FILTERS}
 *       filterKey="state"
 *       renderItem={({ item }) => <TripCard trip={item} … />}
 *       empty={{ icon: 'map-outline', title: 'No trips' }}
 *       onBack={nav.goBack}
 *     />
 *   );
 *
 * Errors render as a banner ABOVE any rows already loaded rather than replacing
 * them — losing a page of results to a failed refresh is worse than a warning.
 */
export default function ListScreen({
  title,
  subtitle,
  onBack,
  right,
  list,
  filters,
  filterKey = 'status',
  renderItem,
  keyExtractor,
  empty = {},
  header,
  footer,
  contentPadding = 22,
}) {
  const {
    items, loading, refreshing, loadingMore, error, refresh, loadMore, filters: active,
  } = list;

  const showSkeleton = loading && items.length === 0;

  return (
    <View style={styles.flex}>
      <StatusBar style="dark" />
      <SubHeader title={title} subtitle={subtitle} onBack={onBack} right={right} />

      {filters?.length ? (
        <View style={styles.filterWrap}>
          <FilterBar
            filters={filters}
            activeFilter={active?.[filterKey] ?? ''}
            onSelectFilter={(value) => list.setFilter(filterKey, value)}
          />
        </View>
      ) : null}

      {showSkeleton ? (
        <View style={styles.centre}>
          <ActivityIndicator color={colors.primary} />
          <AppText variant="small" muted style={styles.centreText}>Loading…</AppText>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor || ((item, i) => String(item?._id ?? i))}
          renderItem={renderItem}
          contentContainerStyle={[
            { padding: contentPadding, paddingBottom: 48 },
            items.length === 0 && styles.flexGrow,
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            <>
              {error ? (
                <Card variant="outline" padding={13} style={styles.errorCard}>
                  <AppText variant="small" weight="semibold" color={colors.error}>
                    {error}
                  </AppText>
                  <AppText variant="caption" muted style={styles.errorHint}>
                    Pull down to retry.
                  </AppText>
                </Card>
              ) : null}
              {header ?? null}
            </>
          }
          ListEmptyComponent={
            <EmptyState
              icon={empty.icon || 'folder-open-outline'}
              title={empty.title || 'Nothing here yet'}
              message={empty.message}
            />
          }
          ListFooterComponent={
            <>
              {loadingMore ? (
                <ActivityIndicator color={colors.primary} style={styles.more} />
              ) : null}
              {footer ?? null}
            </>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  flexGrow: { flexGrow: 1 },
  filterWrap: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  centreText: {},
  errorCard: {
    borderColor: colors.error,
    backgroundColor: colors.expiredBg,
    borderRadius: radius.md,
    marginBottom: 14,
  },
  errorHint: { marginTop: 3 },
  more: { marginVertical: 18 },
});
