import { useCallback, useState } from 'react';
import { Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDriverData } from '../telematics/context/DriverDataContext';
import { istDayKey, istMonthKey } from './kit';

// ── Mileage ──────────────────────────────────────────────────────────────
/**
 * The design grades mileage as Good ≥ 5, Watch 4.5–5 and Low < 4.5 km/L for a
 * truck expected to do 5 km/L. Expected mileage differs a lot by model (a 55T
 * tractor is ~3 km/L), so the bands scale with each truck's own expected value:
 * Good at or above it, Watch within 10 % below it, Low further below.
 */
export const WATCH_RATIO = 0.9;
export function gradeMileage(kmPerL, expected) {
  if (!Number.isFinite(kmPerL) || !Number.isFinite(expected) || expected <= 0) return null;
  if (kmPerL >= expected) return 'good';
  if (kmPerL >= expected * WATCH_RATIO) return 'watch';
  return 'low';
}
export const roundKmpl = (value) => Math.round(value * 10) / 10;

function useFocusedRequest(load, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [revision, setRevision] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setState((old) => ({ ...old, loading: true }));
    load().then((data) => { if (active) setState({ data, error: null, loading: false }); })
      .catch((error) => { if (active) setState((old) => ({ data: old.data, error: error.message || 'error', loading: false })); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, revision]));
  return { ...state, reload: () => setRevision((value) => value + 1) };
}

export function useDriverMileage() {
  const { service } = useDriverData();
  return useFocusedRequest(() => service.myMileage(), [service]);
}

// ── Today and this month (IST) ───────────────────────────────────────────
const HIDDEN_TRIPS = new Set(['DISMISSED', 'SUPERSEDED']);
export const tripDone = (trip) => trip.status === 'COMPLETE' || trip.status === 'CONFIRMED';
export const visibleTrips = (trips = []) => trips.filter((trip) => !HIDDEN_TRIPS.has(trip.status));
const newestFirst = (a, b) => new Date(b.startedAt || 0) - new Date(a.startedAt || 0);

export function todaySummary(data, now = new Date()) {
  const today = istDayKey(now);
  const fuel = (data?.fuel || []).filter((row) => istDayKey(row.refuelTime || row.createdAt) === today && Number(row.litres) > 0);
  const trips = visibleTrips(data?.trips).filter((trip) => istDayKey(trip.startedAt) === today);
  const distances = trips.map((trip) => Number(trip.distanceKm)).filter(Number.isFinite);
  return {
    litres: fuel.reduce((sum, row) => sum + Number(row.litres), 0),
    refills: fuel.length,
    distanceKm: distances.length ? distances.reduce((sum, km) => sum + km, 0) : null,
    completedTrips: trips.filter(tripDone).length,
  };
}

export function monthTrips(data, now = new Date()) {
  const month = istMonthKey(now);
  const rows = visibleTrips(data?.trips).filter((trip) => istMonthKey(trip.startedAt) === month).sort(newestFirst);
  return { rows, total: rows.length, completed: rows.filter(tripDone).length };
}

// ── Documents ────────────────────────────────────────────────────────────
/**
 * The papers a driver is asked for, in the design's order. National permit is
 * not in the list: the backend accepts only these document types today.
 */
export const DOC_SLOTS = [
  { type: 'DRIVER_LICENSE', scope: 'personal', label: 'docDL' },
  { type: 'AADHAAR', scope: 'personal', label: 'docAadhaar' },
  { type: 'RC', scope: 'vehicle', label: 'docRC' },
  { type: 'PUC', scope: 'vehicle', label: 'docPUC' },
  { type: 'FITNESS_CERTIFICATE', scope: 'vehicle', label: 'docFitness' },
];
const OPTIONAL_SLOTS = [{ type: 'PAN', scope: 'personal', label: 'docPan' }];
export const EXPIRING_DAYS = 30;
const DAY_MS = 86400000;

export function docState(doc, now = new Date()) {
  if (!doc) return { kind: 'missing' };
  const expiry = doc.expiryDate ? new Date(doc.expiryDate) : null;
  if (!expiry || !Number.isFinite(expiry.getTime())) return { kind: 'valid', expiry: null };
  const days = Math.ceil((expiry.getTime() - now.getTime()) / DAY_MS);
  if (days < 0) return { kind: 'expired', expiry, days };
  if (days <= EXPIRING_DAYS) return { kind: 'expiring', expiry, days };
  return { kind: 'valid', expiry, days };
}

const newestDoc = (rows, type) => rows
  .filter((row) => row.docType === type)
  .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0] || null;

export function documentChecklist(personal = [], vehicle = []) {
  const pick = (slot) => newestDoc(slot.scope === 'personal' ? personal : vehicle, slot.type);
  const rows = DOC_SLOTS.map((slot) => ({ ...slot, doc: pick(slot) }));
  for (const slot of OPTIONAL_SLOTS) { const doc = pick(slot); if (doc) rows.push({ ...slot, doc }); }
  return rows.map((row) => ({ ...row, state: docState(row.doc) }));
}

export function useDriverDocuments() {
  const { service, data } = useDriverData();
  const hasTruck = !!data?.vehicle;
  return useFocusedRequest(async () => {
    const [personal, vehicle] = await Promise.all([
      service.workflowList('documents', 1, 'personal'),
      hasTruck ? service.workflowList('documents', 1, 'vehicle') : Promise.resolve({ items: [] }),
    ]);
    return documentChecklist(personal.items, vehicle.items);
  }, [service, hasTruck]);
}

export const attentionDocs = (rows = []) => rows
  .filter((row) => row.state.kind === 'expiring' || row.state.kind === 'expired')
  .sort((a, b) => a.state.days - b.state.days);

// ── Calling the owner ────────────────────────────────────────────────────
/** The owner's number comes from the driver Help menu (CALL_OWNER action). */
export async function callOwner(service) {
  const menu = await service.helpMenu();
  const action = (menu?.actions || []).find((row) => row.id === 'CALL_OWNER' && row.available && row.target?.mobile);
  if (!action) return false;
  await Linking.openURL(`tel:${action.target.mobile}`);
  return true;
}
