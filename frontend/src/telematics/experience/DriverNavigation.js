import React from 'react';
import NavigateExperience from '../guidance/NavigateExperience';
import { AppText, Card } from '../../components/ui';
import { ActionButton, ExperiencePage, useExperienceCopy } from './ExperienceUI';

export function NavigateScreen({ navigation }) {
  const c = useExperienceCopy();
  return <ExperiencePage title={c('navigationLabel')} navigation={navigation}>
    <NavigateExperience />
    <ActionButton label={c('myTruck')} onPress={() => navigation.navigate('My truck')} />
    <ActionButton label={c('recordedTrips')} tone="secondary" onPress={() => navigation.navigate('Recorded trips')} />
    <ActionButton label={c('sos')} tone="secondary" onPress={() => navigation.navigate('SOS')} />
  </ExperiencePage>;
}
export function CaptureScreen({ navigation }) {
  const c = useExperienceCopy();
  const actions = [['uploadDocument', 'Upload document'], ['addFuel', 'Add fuel'], ['reportIssue', 'Report issue'], ['workshopBill', 'Workshop bill'], ['sos', 'SOS']];
  return <ExperiencePage title={c('captureLabel')} navigation={navigation}>{actions.map(([key, route]) => <ActionButton key={route} label={c(key)} onPress={() => navigation.navigate(route)} />)}</ExperiencePage>;
}
