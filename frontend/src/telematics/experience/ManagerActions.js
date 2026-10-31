import React, { useEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { AppText, Card } from '../../components/ui';
import { useManagerData } from '../context/ManagerDataContext';
import useOwnerRequest from '../hooks/useOwnerRequest';
import { RequestState } from '../components/FormControls';
import { managerCardsFromResponse } from '../services/liveData';
import { DriverDetail, ManagerLive } from '../screens/ManagerScreens';
import { ActionButton, ExperiencePage, UnavailableScreen, useExperienceCopy } from './ExperienceUI';

function useCards() {
  const { service, branchId, lastPush } = useManagerData();
  const focused = useIsFocused();
  const branch = branchId === 'all' ? undefined : branchId;
  const request = useOwnerRequest(`manager-cards:${branchId}`, async () => managerCardsFromResponse(await service.managerCards(branch)), 60000);
  const reload = request.reload;
  useEffect(() => { if (focused && lastPush?.event === 'card') reload(); }, [focused, lastPush, reload]);
  return request;
}
export function ManagerActionHome({ navigation }) {
  const c = useExperienceCopy();
  const request = useCards();
  return <ExperiencePage navigation={navigation} title={c('managerCards')}>
    <RequestState request={request} />
    {request.data?.map(card => <Card key={card.id} onPress={() => navigation.navigate('Manager action detail', { actionId: card.id })} accessibilityLabel={card.fact || c('managerCards')} style={{ gap: 8 }}>
      <AppText variant="h3">{card.fact || c('unknown')}</AppText>
      <AppText muted>{card.subject?.plate || card.subject?.label || c('unknown')}</AppText>
      {card.state ? <AppText variant="small">{card.state}</AppText> : null}
    </Card>)}
    {request.data?.length === 0 ? <AppText muted>{c('noCards')}</AppText> : null}
    <ActionButton label={c('fleet')} tone="secondary" onPress={() => navigation.navigate('Fleet overview')} />
  </ExperiencePage>;
}
export function ActionDetail({ navigation, route }) {
  const c = useExperienceCopy();
  const request = useCards();
  const card = request.data?.find(item => item.id === route.params?.actionId);
  return <ExperiencePage title={c('managerCards')} navigation={navigation}>
    <RequestState request={request} />
    {card ? <>
      <Card style={{ gap: 12 }}><AppText variant="h3">{card.fact || c('unknown')}</AppText><AppText>{card.subject?.plate || c('unknown')}</AppText><AppText>{card.subject?.driverName || c('unknown')}</AppText></Card>
      <AppText variant="h3">{c('evidence')}</AppText>
      {(card.evidence || []).map((item, index) => <Card key={`${item.source}:${index}`}><AppText>{item.source || c('unknown')}</AppText>{item.detail ? <AppText muted>{item.detail}</AppText> : null}</Card>)}
      {card.subject?.vehicleId ? <ActionButton label={c('vehicle')} onPress={() => navigation.navigate('Vehicle detail', { id: card.subject.vehicleId })} /> : null}
      {card.subject?.driverId ? <ActionButton label={c('driver')} tone="secondary" onPress={() => navigation.navigate('Driver detail', { id: card.subject.driverId })} /> : null}
      {card.actions?.messageConversationId ? <ActionButton label={c('crewMessages')} tone="secondary" onPress={() => navigation.navigate('Conversation', { id: card.actions.messageConversationId })} /> : null}
    </> : !request.loading && !request.error ? <AppText muted>{c('unknown')}</AppText> : null}
  </ExperiencePage>;
}
export const ManagerLiveSurface = ManagerLive;
export const DriverTimeline = UnavailableScreen;
export const DriverHelpfulCards = UnavailableScreen;
export function ManagerReviews({ navigation }) {
  const c = useExperienceCopy();
  return <ExperiencePage title={c('approvals')} navigation={navigation}>
    <ActionButton label={c('addFuel')} onPress={() => navigation.navigate('Fuel review')} />
    <ActionButton label={c('reviewPapers')} tone="secondary" onPress={() => navigation.navigate('Fleet documents')} />
    <ActionButton label={c('workshopBill')} tone="secondary" onPress={() => navigation.navigate('Maintenance')} />
  </ExperiencePage>;
}
export function ManagerDriverDetail(props) {
  return <DriverDetail {...props} route={{ ...props.route, params: { ...props.route?.params, id: props.route?.params?.driverId || props.route?.params?.id } }} />;
}
