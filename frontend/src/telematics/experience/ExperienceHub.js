import React from 'react';
import { AppText, Card, colors } from '../../components/ui';
import { ExperiencePage, ActionButton, useExperienceCopy } from './ExperienceUI';
import { useExperience } from './ExperienceContext';
export function DriverMoreExperience({ navigation }) {
 const c = useExperienceCopy(); const links = [['help','Helpful cards'],['truckCrew','Crew & driving'],['dvir','Pre-trip check'],['podTitle','Confirm delivery'],['restHours','Rest & hours'],['earnings','My earnings'],['fuelEntry','Log diesel'],['documents','Document reminders'],['money','Papers & money'],['settings','Experience settings'],['crewMessages','Crew messages'],['help','Driver help'],['profile','Profile'],['existingTools','Existing tools']];
 return <ExperiencePage title={c('moreLabel')} navigation={navigation}>{links.map(([key, route]) => <Card key={key} onPress={() => navigation.navigate(route)} accessibilityLabel={c(key)}><AppText weight="semibold" color={colors.primaryDeep}>{c(key)} →</AppText></Card>)}</ExperiencePage>;
}
export function DriverTripsExperience({ navigation }) {
 const c = useExperienceCopy(); const { preview } = useExperience();
 return <ExperiencePage title={c('trips')} navigation={navigation}>{preview && <Card style={{ gap: 12 }}><AppText variant="h3">{c('sampleRoute')}</AppText><AppText>{`${c('sample')} · 29 Oct · 176 km`}</AppText><AppText color={colors.warning}>{c('unconfirmed')}</AppText><ActionButton label={c('tripSummary')} onPress={() => navigation.navigate('Journey summary')} /></Card>}<ActionButton label={c('tripRecords')} tone="secondary" onPress={() => navigation.navigate('Recorded trips')} /><ActionButton label={c('money')} tone="secondary" onPress={() => navigation.navigate('Papers & money')} /></ExperiencePage>;
}
export function ManagerMoreExperience({ navigation }) { const c = useExperienceCopy(); return <ExperiencePage title={c('moreLabel')} navigation={navigation}>{[['fleet','Fleet essentials'],['reviewPapers','Driver papers review'],['crewMessages','Crew messages'],['broadcasts','New preview broadcast'],['settings','Experience settings'],['existingTools','Fleet essentials']].map(([key, route]) => <Card key={key} onPress={() => navigation.navigate(route)} accessibilityLabel={c(key)}><AppText weight="semibold" color={colors.primaryDeep}>{c(key)} →</AppText></Card>)}</ExperiencePage>; }
