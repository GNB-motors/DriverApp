import React from 'react';
import NavigateExperience from '../guidance/NavigateExperience';
import { ActionButton, ExperiencePage, useExperienceCopy } from './ExperienceUI';

// Full-screen map like any navigation app; quick links live in the planning sheet.
export function NavigateScreen({ navigation }) {
  return <NavigateExperience navigation={navigation} />;
}
export function CaptureScreen({ navigation }) {
  const c = useExperienceCopy();
  const actions = [['uploadDocument', 'Upload document'], ['addFuel', 'Add fuel'], ['reportIssue', 'Report issue'], ['workshopBill', 'Workshop bill'], ['sos', 'SOS']];
  return <ExperiencePage title={c('captureLabel')} navigation={navigation}>{actions.map(([key, route]) => <ActionButton key={route} label={c(key)} onPress={() => navigation.navigate(route)} />)}</ExperiencePage>;
}
