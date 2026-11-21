import React from 'react';
import { AppText, Card } from '../../components/ui';
import { ActionButton, ExperiencePage, useExperienceCopy } from './ExperienceUI';
import { useDriverData } from '../context/DriverDataContext';

export function NavigateScreen({ navigation }) {
  const c = useExperienceCopy();
  return <ExperiencePage title={c('navigationLabel')} navigation={navigation}>
    <Card style={{ gap: 12 }}><AppText variant="h3">{c('notConnected')}</AppText><AppText muted>{c('navigationUnavailable')}</AppText></Card>
    <ActionButton label={c('myTruck')} onPress={() => navigation.navigate('My truck')} />
    <ActionButton label="My working day" tone="secondary" onPress={() => navigation.navigate('Home')} />
    <ActionButton label={c('recordedTrips')} tone="secondary" onPress={() => navigation.navigate('Recorded trips')} />
    <ActionButton label={c('sos')} tone="secondary" onPress={() => navigation.navigate('SOS')} />
  </ExperiencePage>;
}
export function CaptureScreen({ navigation }) {
  const c = useExperienceCopy();
  const { data } = useDriverData();
  const moving = data?.vehicle?.speed > 0;
  const actions = [["Photo any paper", "Photo any paper"], [c('uploadDocument'), 'Upload document'], [c('addFuel'), 'Add fuel'], ["Add expense bill", "AddBill"], [c('reportIssue'), 'Report issue'], [c('workshopBill'), 'Workshop bill'], ["Road report", "Road report"], ["Explain a stop", "Explain a stop"], [c('sos'), 'SOS']];
  return <ExperiencePage title={c('captureLabel')} navigation={navigation}>{moving && <AppText>{c('stopToCapture')}</AppText>}{actions.map(([label, route]) => <ActionButton key={route} label={label} disabled={moving && route !== 'SOS'} onPress={() => navigation.navigate(route, route === 'Photo any paper' ? { cameraFirst: true } : undefined)} />)}</ExperiencePage>;
}
