/**
 * TripListScreen.js — the trip board.
 *
 * GET /api/erp/trips with a `state` filter. The filter values come from
 * TRIP_FILTERS, which only contains states the backend's listTrips validator
 * accepts — the previous version sent 'ACTIVE'/'CLOSED', which are not
 * ERP_TRIP_STATES and produced a hard 400 on every filter tap.
 *
 * Accepts an initial `state` via route params so the manager home's queue tiles
 * can deep-link straight to, say, everything in transit.
 */

import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import useList from '../../hooks/useList';
import { fetchErpTrips } from '../../services/erpApi';
import ListScreen from '../../components/ListScreen';
import TripCard from '../../components/TripCard';
import { TRIP_FILTERS } from '../../domain/tripState';

export default function TripListScreen({ route, navigation }) {
  const { user } = useAuth();
  const initialState = route?.params?.state ?? '';
  const list = useList(fetchErpTrips, { initial: { state: initialState } });

  // Re-focusing the tab with a new state param (from a home queue tile) should
  // move the filter rather than being ignored.
  useEffect(() => {
    if (route?.params?.state !== undefined) {
      list.setFilter('state', route.params.state);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.state]);

  return (
    <ListScreen
      title="Trips"
      subtitle={list.meta?.total ? `${list.meta.total} trips` : undefined}
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      list={list}
      filters={TRIP_FILTERS}
      filterKey="state"
      renderItem={({ item }) => (
        <TripCard
          trip={item}
          role={user?.role}
          onPress={() => navigation.navigate('TripDetail', { tripId: item._id })}
        />
      )}
      empty={{
        icon: 'map-outline',
        title: 'No trips here',
        message: 'Nothing matches this filter right now.',
      }}
    />
  );
}
