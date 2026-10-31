import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../src/telematics/services/approvedDriverContracts.js', import.meta.url), 'utf8');
const { crewActionPayload, crewCard, conversationView, messageSendPayload, messageView } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
test('approved crew envelope preserves membership acceptance and unconfirmed evidence', () => {
  const card = crewCard({ vehicle: { vehicleId: 'v' }, crew: { acceptedIds: ['d'], status: 'DRIVING', version: 7 }, members: [{ driverId: 'd', name: 'Driver', status: 'ACTIVE' }, { driverId: 'e' }], atWheel: { intervals: [{ driverId: 'd', start: '2026-10-31', status: 'INFERRED', evidence: [] }] } });
  assert.equal(card.vehicle._id, 'v'); assert.equal(card.version, 7); assert.equal(card.members[0].accepted, true); assert.equal(card.members[1].accepted, false);
  assert.equal(card.intervals[0].status, 'INFERRED'); assert.equal(card.historyUnavailable, true);
});
test('message adapter preserves server delivery and sequence without claiming acknowledgement', () => {
  const delivery = [{ userId: 'd', state: 'HELD', heldUntil: 'later' }];
  const message = messageView({ id: 'm', seq: 4, body: 'Wait', delivery });
  assert.equal(message.seq, 4); assert.equal(message.text, 'Wait'); assert.deepEqual(message.recipients, delivery); assert.equal(message.acknowledgementUnavailable, true);
});
test('conversation details use approved participants and identify unsupported membership editing', () => {
  const c = conversationView({ id: 'c', kind: 'GROUP_AUTO' }, [{ userId: 'a' }, { userId: 'b' }]);
  assert.equal(c.type, 'GROUP'); assert.deepEqual(c.members, ['a','b']); assert.equal(c.createdBy, null); assert.equal(c.membershipUnavailable, true);
});
test('crew action request drops local-only fields and retains approved idempotency data', () => {
  assert.deepEqual(crewActionPayload({ action: 'ACCEPT', proposalId: 'p', clientRequestId: 'r', expectedVersion: 8, safelyStopped: true }), { action: 'ACCEPT', proposalId: 'p', clientRequestId: 'r' });
});
test('message send uses the approved clientId/body contract and location representation', () => {
  assert.deepEqual(messageSendPayload({ kind: 'TEXT', text: 'Wait', clientRequestId: 'c', unsupported: true }), { kind: 'TEXT', clientId: 'c', body: 'Wait' });
  const payload = messageSendPayload({ kind: 'LOCATION', location: { lat: 22.5, lng: 88.3 }, clientRequestId: 'l' });
  assert.deepEqual(payload, { kind: 'LOCATION', clientId: 'l', body: '{"lat":22.5,"lng":88.3}' });
  assert.deepEqual(messageView({ id: 'm', kind: 'LOCATION', body: payload.body }).location, { lat: 22.5, lng: 88.3 });
});
