/**
 * MyTripsScreen.js — the driver's own trip history.
 *
 * GET /api/erp/trips/my — driver-scoped server-side, so there is no driver
 * filter to pass and no way to see anyone else's trips.
 */

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import useList from '../../hooks/useList';
import { fetchMyTrips } from '../../services/erpApi';
import ListScreen from '../../components/ListScreen';
import TripCard from '../../components/TripCard';
import { TRIP_FILTERS } from '../../domain/tripState';

export default function MyTripsScreen({ navigation }) {
  const { user } = useAuth();
  const list = useList(fetchMyTrips, { initial: { state: '' } });

  return (
    <ListScreen
      title="My Trips"
      subtitle={list.meta?.total ? `${list.meta.total} trips` : undefined}
      onBack={() => navigation.goBack()}
      list={list}
      filters={TRIP_FILTERS}
      filterKey="state"
      renderItem={({ item }) => (
        <TripCard
          trip={item}
          role={user?.role}
          showTrack
          onPress={() => navigation.navigate('ActiveTrip', { trip: item })}
        />
      )}
      empty={{
        icon: 'map-outline',
        title: 'No trips yet',
        message: 'Trips assigned to you will appear here once they are placed.',
      }}
    />
  );
}
