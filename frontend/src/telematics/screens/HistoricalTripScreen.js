import React from 'react';
import { AppText, Button, Card } from '../../components/ui';
import { useManagerData } from '../context/ManagerDataContext';
import { Screen, useRequest, RequestState } from '../components/FormControls';
import FleetMap from '../components/FleetMap';
import { useAuth } from '../../context/AuthContext';
import { validCoordinate } from '../components/mapGeometry';

export default function HistoricalTripScreen({ navigation, route }) {
  const { user } = useAuth();
  const { service, branchId } = useManagerData();
  const branch = branchId === 'all' ? undefined : branchId;
  const request = useRequest(async () => {
    const [trip, track] = await Promise.all([service.getTrip(route.params.id, branch), service.getTripTrack(route.params.id, branch)]);
    return { trip, track };
  }, [service, route.params.id, branch]);
  const trip = request.data?.trip;
  const points = request.data?.track.points.filter(validCoordinate) || [];
  const markers = points.length ? [{ id: 'start', plate: 'Trip start', coordinates: points[0] }, { id: 'end', plate: 'Last recorded point', coordinates: points.at(-1) }] : [];
  const stops = [...new Map([...(trip?.stops || []), ...(trip?.routeStops || [])].map((stop) => [stop._id, stop])).values()];
  return <Screen navigation={navigation} title="Trip details"><RequestState request={request} />{trip && <>
    <Card><AppText variant="h3">{trip.from} → {trip.to}</AppText><AppText>{trip.distanceKm ?? 'Unknown'} km · {trip.status}</AppText></Card>
    {points.length ? <FleetMap vehicles={markers} trailPoints={request.data.track.points} caption="Recorded trip route" /> : <AppText>No recorded route coordinates are available.</AppText>}
    {request.data.track.sampled && <AppText muted>Route points were sampled by the server.</AppText>}
    {stops.map((stop) => <Card key={stop._id}><AppText>{stop.place?.name || 'Recorded stop'}</AppText><AppText>{stop.dwellMinutes ?? 'Unknown'} min · {stop.startAt ? new Date(stop.startAt).toLocaleString() : 'Time unavailable'}</AppText><AppText>{stop.humanReason?.note || stop.humanReason?.purpose || ''}</AppText></Card>)}
    {user.role === 'OWNER' && <Button label="Arrival promise and history" onPress={() => navigation.navigate('Arrival promise', { id: route.params.id })} />}
    {user.role === 'OWNER' && trip.erpTripId && <Button label="Trip costs and closure" onPress={() => navigation.navigate('Trip costs', { id: route.params.id })} />}
    {trip.erpTripId && <AppText>ERP trip: {typeof trip.erpTripId === 'object' ? trip.erpTripId.tripNumber || trip.erpTripId._id : trip.erpTripId}</AppText>}
  </>}</Screen>;
}
