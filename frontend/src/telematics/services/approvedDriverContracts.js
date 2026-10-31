// Translate the approved #313 DTOs into the existing driver surfaces.
export function crewCard(data) {
  if (!data?.vehicle) return null;
  const crew = data.crew || {};
  const members = (data.members || []).map(m => ({ ...m, _id: m.driverId, firstName: m.name, accepted: (crew.acceptedIds || []).includes(m.driverId) }));
  const intervals = (data.atWheel?.intervals || []).map((i, index) => ({ ...i, _id: `${i.driverId}:${i.start}:${index}`, startAt: i.start, endAt: i.end, confirmedBy: (i.evidence || []).map(e => e.driverId).filter(Boolean) }));
  return { ...crew, vehicle: { ...data.vehicle, _id: data.vehicle.vehicleId }, members,
    intervals, intervalTotal: intervals.length, events: [], eventTotal: 0, historyUnavailable: true,
    pending: crew.pending ? { ...crew.pending, expired: Date.parse(crew.pending.expiresAt) < Date.now() } : null };
}
export function conversationView(c, participants = []) {
  return { ...c, _id: c.id, type: c.kind.startsWith('GROUP') ? 'GROUP' : c.kind,
    members: participants.map(p => p.userId), state: 'ACTIVE', createdBy: null, membershipUnavailable: true };
}
export function messageView(m) {
  let location;
  if (m.kind === 'LOCATION' && typeof m.body === 'string') {
    try {
      const parsed = JSON.parse(m.body);
      if (Number.isFinite(parsed?.lat) && Number.isFinite(parsed?.lng)) location = { lat: parsed.lat, lng: parsed.lng };
    } catch { /* Preserve the raw body when an older message has no location payload. */ }
  }
  return { ...m, _id: m.id, text: m.body, ...(location && { location }), recipients: m.delivery || [], acknowledgementUnavailable: true };
}

// Keep only fields in #313's strict action schema. Local safety/version hints
// are UI policy and are not accepted by the server contract.
export function crewActionPayload(body) {
  const out = {};
  for (const key of ['action', 'targetDriverId', 'proposalId', 'clientRequestId', 'note', 'memberIds']) {
    if (body?.[key] !== undefined) out[key] = body[key];
  }
  return out;
}

// #313 carries location coordinates in the nullable string `body` field.
export function messageSendPayload(payload) {
  const { clientRequestId, text, location, ...input } = payload || {};
  const body = location ? JSON.stringify({ lat: location.lat, lng: location.lng }) : text;
  const out = { kind: input.kind, clientId: clientRequestId };
  for (const key of ['mediaKey', 'durationMs', 'card', 'priority', 'needsAck', 'sentAt']) {
    if (input[key] !== undefined) out[key] = input[key];
  }
  if (body !== undefined) out.body = body;
  return out;
}
