import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';
import { AppText, Button, Card, colors } from '../../components/ui';
import { useTelematicsApi } from '../context/TelematicsApiContext';
import { useDriverData } from '../context/DriverDataContext';
import { Screen, RequestState, useRequest } from '../components/FormControls';
import { pickFromCamera, pickFromGallery } from '../../utils/pickImage';
import AttachmentPicker from '../workflows/AttachmentPicker';
import { recordId, collectPages } from '../services/telematicsApi';
import {
  startDuty,
  endDuty,
  fetchDutyStatus,
} from '../../services/driverDutyService';
import { capturePairingFix } from '../tracking/useDriverLocationSharing';

export function DriverDutyControl({ navigation }) {
  const { refresh, tracking } = useDriverData();
  const request = useRequest(fetchDutyStatus, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const onDuty = Boolean(request.data?.session || request.data?.trip);
  async function change() {
    if (busy || !request.data) return;
    setBusy(true);
    setError('');
    try {
      if (onDuty) {
        await tracking.stop();
        await endDuty();
      } else await startDuty(await capturePairingFix());
      request.reload();
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card style={{ gap: 8 }}>
      <AppText variant="h3">My working day</AppText>
      <RequestState request={request} />
      {request.data && (
        <>
          <AppText>{onDuty ? 'On duty' : 'Off duty'}</AppText>
          <Button
            label={onDuty ? 'End duty' : 'Start duty & find my truck'}
            loading={busy}
            disabled={busy}
            onPress={change}
          />
        </>
      )}
      {error ? <AppText color={colors.error}>{error}</AppText> : null}
      <Button
        label="Rest & hours"
        variant="secondary"
        onPress={() => navigation.navigate('Rest & hours')}
      />
    </Card>
  );
}

const minutes = (ms) =>
  ms == null ? 'Unknown' : `${Math.max(0, Math.round(ms / 60000))} min`;
export function BreakPlanner({ navigation }) {
  const service = useTelematicsApi();
  const request = useRequest(() => service.dutyBreakPlan(), [service]);
  const plan = request.data;
  return (
    <Screen navigation={navigation} title="Plan a break">
      <RequestState request={request} />
      {plan && (
        <>
          <Card>
            <AppText variant="h3">{plan.line}</AppText>
            <AppText>
              Driving: {minutes(plan.drivingMs)} · Limit:{' '}
              {minutes(plan.limitMs)}
            </AppText>
            <AppText muted>
              {plan.basis?.citation || 'Plan based on available duty evidence.'}
            </AppText>
          </Card>
          {(plan.warnings || []).map((w) => (
            <AppText key={w.code}>{w.message}</AppText>
          ))}
          {!plan.options?.length && (
            <AppText>
              No parking options available. Stop at a safe permitted place.
            </AppText>
          )}
          {(plan.options || []).map((p, i) => (
            <Card key={p.id || i}>
              <AppText weight="bold">{p.label || 'Parking option'}</AppText>
              <AppText>
                {p.distanceKm == null
                  ? 'Distance unknown'
                  : `${p.distanceKm} km`}
                {p.etaMinutes != null ? ` · ${p.etaMinutes} min` : ''}
              </AppText>
              <AppText>
                {p.reachable
                  ? 'Within remaining driving time'
                  : 'Not reachable within remaining time'}
              </AppText>
              <AppText muted>{p.basis}</AppText>
            </Card>
          ))}
          <Button
            label="Rest & hours"
            variant="secondary"
            onPress={() => navigation.navigate('Rest & hours')}
          />
        </>
      )}
    </Screen>
  );
}

export function NearbyReports({ navigation }) {
  const service = useTelematicsApi();
  const { data } = useDriverData();
  const request = useRequest(() => service.nearbyRoadReports(), [service]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const attempts = useRef({});
  const moving = data?.vehicle?.speed > 0;
  async function check(id) {
    if (busy || moving) return;
    setBusy(id);
    setError('');
    const clientId =
      attempts.current[id] || (attempts.current[id] = Crypto.randomUUID());
    try {
      const result = await service.roadReportStillThere(
        id,
        { clientId },
        clientId,
      );
      if (result.asked) navigation.navigate('Driver questions');
      else
        setError(
          result.reason || 'There is no question to answer for this report.',
        );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }
  return (
    <Screen navigation={navigation} title="Nearby road reports">
      <RequestState request={request} />
      {moving && (
        <AppText>Stop safely before answering road questions.</AppText>
      )}
      {request.data && (
        <>
          {!request.data.reports?.length && (
            <AppText>No nearby reports.</AppText>
          )}
          {(request.data.reports || []).map((r) => (
            <Card key={r.id} style={{ gap: 8 }}>
              <AppText weight="bold">{r.label || r.type}</AppText>
              <AppText>
                {r.placeName || 'Location reported'} · {r.status || 'Reported'}
              </AppText>
              <AppText muted>
                {r.expiresAt
                  ? `Valid until ${new Date(r.expiresAt).toLocaleString()}`
                  : 'Expiry unknown'}
              </AppText>
              <Button
                label="Still there?"
                variant="secondary"
                disabled={
                  moving ||
                  !!busy ||
                  (r.expiresAt && new Date(r.expiresAt).getTime() <= Date.now())
                }
                loading={busy === r.id}
                onPress={() => check(r.id)}
              />
            </Card>
          ))}
        </>
      )}
      {error ? <AppText accessibilityRole="alert">{error}</AppText> : null}
    </Screen>
  );
}

export function DriverQuestions({ navigation, compact = false }) {
  const insets = useSafeAreaInsets();
  const service = useTelematicsApi();
  const { data, lastPush } = useDriverData();
  const request = useRequest(() => service.prompts(), [service, lastPush?.at]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hidden, setHidden] = useState(null);
  const [now, setNow] = useState(Date.now());
  const attempt = useRef(null);
  const prompt = request.data?.prompt;
  const promptId = prompt?.id;
  const moving = data?.vehicle?.speed > 0;
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!compact || !promptId) return;
    const timer = setTimeout(() => setHidden(promptId), 10000);
    return () => clearTimeout(timer);
  }, [compact, promptId]);
  const expired =
    prompt?.expiresAt && new Date(prompt.expiresAt).getTime() <= now;
  async function answer(value) {
    if (busy || moving || expired) return;
    if (
      !attempt.current ||
      attempt.current.id !== prompt.id ||
      attempt.current.answer !== value
    )
      attempt.current = {
        id: prompt.id,
        answer: value,
        clientId: Crypto.randomUUID(),
        answeredAt: new Date().toISOString(),
      };
    const draft = attempt.current;
    setBusy(true);
    setError('');
    try {
      await service.answerPrompt(
        draft.id,
        {
          answer: draft.answer,
          clientId: draft.clientId,
          answeredAt: draft.answeredAt,
        },
        draft.clientId,
      );
      attempt.current = null;
      request.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const content = (
    <>
      {!compact && <RequestState request={request} />}
      {prompt && !(compact && (hidden === prompt.id || moving || expired)) ? (
        <Card style={{ gap: 8 }}>
          <AppText variant="h3">
            {prompt.subject?.label ||
              prompt.type ||
              'Question from your office'}
          </AppText>
          {moving && <AppText>Answer when safely stopped.</AppText>}
          {expired ? (
            <AppText>This question has expired.</AppText>
          ) : (
            prompt.answers.map((value) => (
              <Button
                key={value}
                label={value.replaceAll('_', ' ')}
                variant="secondary"
                disabled={moving || busy}
                loading={busy && attempt.current?.answer === value}
                onPress={() => answer(value)}
              />
            ))
          )}
          {compact && (
            <Button
              label="Later"
              variant="ghost"
              onPress={() => setHidden(prompt.id)}
            />
          )}
        </Card>
      ) : !compact && request.data ? (
        <AppText>No pending questions.</AppText>
      ) : null}
      {error ? <AppText color={colors.error}>{error}</AppText> : null}
    </>
  );
  return compact ? (
    prompt && hidden !== prompt.id && !moving && !expired ? (
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        {content}
      </View>
    ) : null
  ) : (
    <Screen navigation={navigation} title="Questions from the office">
      {content}
      <Button label="Refresh" variant="secondary" onPress={request.reload} />
    </Screen>
  );
}

async function appendPhoto(form, photo) {
  if (Platform.OS === 'web')
    form.append('pages', await (await fetch(photo.uri)).blob(), photo.name);
  else form.append('pages', photo);
}
export function CapturePages({ navigation, route }) {
  const service = useTelematicsApi();
  const { data } = useDriverData();
  const [pages, setPages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false);
  const draft = useRef(null);
  const selecting = useRef(false);
  const inFlight = useRef(false);
  const retakeId = route.params?.captureId;
  const moving = data?.vehicle?.speed > 0;
  const add = useCallback(
    async (camera, index = null) => {
      if (selecting.current || locked || moving) return;
      selecting.current = true;
      setError('');
      try {
        const photo = await (camera ? pickFromCamera() : pickFromGallery());
        if (photo)
          setPages((old) =>
            index == null
              ? [...old, photo]
              : old.map((p, i) => (i === index ? photo : p)),
          );
      } catch (e) {
        setError(e.message);
      } finally {
        selecting.current = false;
      }
    },
    [locked, moving],
  );
  const cameraOpened = useRef(false);
  useEffect(() => {
    if (route.params?.cameraFirst && !moving && !cameraOpened.current) {
      cameraOpened.current = true;
      add(true);
    }
  }, [route.params?.cameraFirst, moving, add]);
  async function send() {
    if (!pages.length || inFlight.current || moving) return;
    inFlight.current = true;
    setBusy(true);
    setLocked(true);
    setError('');
    try {
      const clientId = draft.current || (draft.current = Crypto.randomUUID());
      const form = new FormData();
      form.append('clientId', clientId);
      for (const photo of pages) await appendPhoto(form, photo);
      const result = retakeId
        ? await service.captureRetake(retakeId, form, clientId)
        : await service.captureCreate(form, clientId);
      navigation.replace('Capture detail', { id: result.capture.id });
    } catch (e) {
      setError(e.message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <Screen
      navigation={navigation}
      title={retakeId ? 'Retake paper' : 'Photo any paper'}
    >
      <AppText muted>
        Add clear photos in page order. Review or retake each page before
        sending. Captures go for review and do not create a payment.
      </AppText>
      {moving && (
        <AppText>Stop safely before taking or sending photos.</AppText>
      )}
      {pages.map((photo, i) => (
        <AttachmentPicker
          key={i}
          title={`Page ${i + 1}`}
          asset={photo}
          imagesOnly
          locked={locked}
          disabled={busy || moving}
          onCamera={() => add(true, i)}
          onGallery={() => add(false, i)}
          onRemove={() => setPages((old) => old.filter((_, n) => n !== i))}
        />
      ))}
      {!locked && pages.length < 8 && (
        <>
          <Button
            label="Photograph a page"
            disabled={moving}
            onPress={() => add(true)}
          />
          <Button
            label="Choose page photo"
            variant="secondary"
            disabled={moving}
            onPress={() => add(false)}
          />
        </>
      )}
      {error ? (
        <AppText color={colors.error} accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
      <Button
        label={
          locked
            ? 'Retry sending these pages'
            : `Send ${pages.length} pages for review`
        }
        loading={busy}
        disabled={!pages.length || busy || moving}
        onPress={send}
      />
      <Button
        label="My captured papers"
        variant="secondary"
        onPress={() => navigation.navigate('My captures')}
      />
    </Screen>
  );
}
export function MyCaptures({ navigation }) {
  const service = useTelematicsApi();
  const request = useRequest(() => service.driverCaptures(), [service]);
  return (
    <Screen navigation={navigation} title="My captured papers">
      <RequestState request={request} />
      {request.data && (
        <>
          {!request.data.captures?.length && (
            <AppText>No captured papers yet.</AppText>
          )}
          {(request.data.captures || []).map((p) => (
            <Card key={p.id}>
              <AppText>
                {p.docType || 'Paper'} · {p.status}
              </AppText>
              <Button
                label="Review details"
                variant="secondary"
                onPress={() =>
                  navigation.navigate('Capture detail', { id: p.id })
                }
              />
            </Card>
          ))}
        </>
      )}
      <Button label="Refresh" variant="secondary" onPress={request.reload} />
      <Button
        label="Photograph paper"
        onPress={() =>
          navigation.navigate('Photo any paper', { cameraFirst: true })
        }
      />
    </Screen>
  );
}
export function CaptureDetail({ navigation, route }) {
  const service = useTelematicsApi();
  const request = useRequest(
    () => service.captureDetail(route.params?.id),
    [service, route.params?.id],
  );
  const paper = request.data?.capture;
  return (
    <Screen navigation={navigation} title="Captured paper">
      <RequestState request={request} />
      {paper && (
        <>
          <Card>
            <AppText variant="h3">
              {paper.docType || 'Unidentified paper'}
            </AppText>
            <AppText>
              {paper.status} · {paper.pages?.length || 0} pages
            </AppText>
            <AppText muted>
              Review status is separate from expense approval or payment.
            </AppText>
            {Object.entries(paper.extraction?.fields || {})
              .filter(([, value]) => value != null && typeof value !== 'object')
              .map(([key, value]) => (
                <AppText key={key}>
                  {key.replaceAll('_', ' ')}: {String(value)}
                </AppText>
              ))}
          </Card>
          <Button
            label="Take clearer photos"
            variant="secondary"
            onPress={() =>
              navigation.navigate('Photo any paper', {
                captureId: paper.id,
                cameraFirst: true,
              })
            }
          />
        </>
      )}
      <Button
        label="Refresh status"
        variant="secondary"
        onPress={request.reload}
      />
    </Screen>
  );
}
export function DocumentReminders({ navigation }) {
  const { service } = useDriverData();
  const request = useRequest(
    async () => ({
      items: await collectPages(
        (page) => service.workflowList('documents', page, 'personal'),
        30,
      ),
    }),
    [service],
  );
  const reminders = (request.data?.items || []).filter(
    (d) =>
      d.expiryDate &&
      new Date(d.expiryDate).getTime() <= Date.now() + 30 * 86400000,
  );
  return (
    <Screen navigation={navigation} title="Document reminders">
      <RequestState request={request} />
      {request.data && (
        <>
          {!reminders.length && (
            <AppText>No documents expiring in the next 30 days.</AppText>
          )}
          {reminders.map((d) => (
            <Card key={recordId(d)}>
              <AppText weight="bold">{d.docType}</AppText>
              <AppText>
                {new Date(d.expiryDate).getTime() < Date.now()
                  ? 'Expired'
                  : 'Expiring'}{' '}
                · {new Date(d.expiryDate).toLocaleDateString()}
              </AppText>
              <Button
                label="Open document"
                variant="secondary"
                onPress={() =>
                  navigation.navigate('Document detail', {
                    id: recordId(d),
                    kind: 'documents',
                  })
                }
              />
              <Button
                label="Upload renewed document"
                onPress={() =>
                  navigation.navigate('Upload document', { scope: 'personal' })
                }
              />
            </Card>
          ))}
        </>
      )}
      <Button
        label="All documents"
        variant="secondary"
        onPress={() => navigation.navigate('Documents')}
      />
    </Screen>
  );
}
