// Transport/lifecycle policy only. All maneuver and progress calculations belong to Ferrostar.
export function validateFix(fix, now = Date.now()) {
  const age = now - Number(fix?.timestamp);
  if (!fix || fix.mocked || !Number.isFinite(fix.latitude) || Math.abs(fix.latitude) > 90 ||
      !Number.isFinite(fix.longitude) || Math.abs(fix.longitude) > 180 ||
      !Number.isFinite(fix.accuracy) || fix.accuracy < 0 || fix.accuracy > 50 || !Number.isFinite(age) || age < -5000 || age > 15000)
    throw new Error('A fresh GPS fix accurate to 50 metres is required. Try outdoors.');
  return fix;
}
export function validateBundle(bundle) {
  if (bundle?.schemaVersion !== 1 || bundle.format !== 'valhalla-osrm' || !bundle.routeId ||
      !Array.isArray(bundle.payload?.routes) || bundle.payload.routes.length !== 1 ||
      !bundle.payload.routes[0]?.legs?.length)
    throw new Error('The server did not supply a compatible navigation route.');
  return bundle;
}
export const navigationCacheKey = ({ orgId, userId, vehicleId }) =>
  `gnb-navigation:v1:${encodeURIComponent(orgId)}:${encodeURIComponent(userId)}:${encodeURIComponent(vehicleId)}`;
export class NavigationCoordinator {
  constructor({ api, engine, storage, identity, onState = () => {}, now = Date.now }) {
    if (!identity?.orgId || !identity?.userId || !identity?.vehicleId) throw new Error('Sign in and confirm your truck before navigating.');
    Object.assign(this, { api, engine, storage, identity, onState, now });
    this.epoch = 0; this.session = null; this.fix = null; this.rerouting = false; this.storageOperations = Promise.resolve();
  }
  publish(status, extra = {}) { this.onState({ status, session: this.session, ...extra }); }
  location(fix) {
    validateFix(fix, this.now());
    if (this.fix && Number(fix.timestamp) < Number(this.fix.timestamp)) return false;
    this.fix = fix;
    // Device fixes flow directly to the engine; this never waits for network upload.
    this.engine.location(fix);
    return true;
  }
  async activate({ bundle, startBody, consent }) {
    if (consent !== true) throw new Error('Navigation location consent is required.');
    validateFix(this.fix, this.now()); validateBundle(bundle);
    const epoch = ++this.epoch;
    const parsed = await this.engine.parse(bundle);
    if (epoch !== this.epoch) return;
    const response = await this.api.navSessionStart({ ...startBody, routeId: bundle.routeId });
    const session = response.session || response;
    if (epoch !== this.epoch) return;
    if (!session?.sessionId && !session?.id && !session?._id) throw new Error('The server did not confirm the navigation session.');
    if (!Number.isInteger(session.routeVersion)) throw new Error('The server did not confirm the route version.');
    if (session.route?.navigation?.routeId !== bundle.routeId) throw new Error('The server confirmed a different route. Refresh the active session.');
    this.session = { ...session, navigation: bundle };
    validateFix(this.fix, this.now());
    this.engine.location(this.fix); this.engine.start(parsed);
    await this.persist(epoch); if (epoch === this.epoch) this.publish('navigating');
    return this.session;
  }
  async replace(bundle, { reason = 'USER_SELECTION' } = {}) {
    validateBundle(bundle); validateFix(this.fix, this.now());
    if (!this.session || this.rerouting) return;
    const epoch = this.epoch; const previous = this.session;
    this.rerouting = true; this.publish('rerouting');
    try {
      const parsed = await this.engine.parse(bundle);
      if (epoch !== this.epoch || this.session !== previous) return;
      const response = await this.api.navSessionPatch(previous.sessionId || previous.id || previous._id, {
        action: 'ACTIVATE_ROUTE', reason, routeId: bundle.routeId, expectedRouteVersion: previous.routeVersion, observedAt: new Date(this.now()).toISOString(),
        operationId: `activate:${previous.sessionId || previous.id || previous._id}:${previous.routeVersion}:${bundle.routeId}`,
      });
      const session = response.session || response;
      if (epoch !== this.epoch || this.session !== previous) return;
      if (session.routeVersion !== previous.routeVersion + 1) throw new Error('The route changed on another device. Refresh the session.');
      validateFix(this.fix, this.now());
      if (session.route?.navigation?.routeId !== bundle.routeId) throw new Error('The server confirmed a different route. Refresh the active session.');
      this.session = { ...session, navigation: bundle };
      this.engine.replace(parsed); await this.persist(epoch); if (epoch === this.epoch) this.publish('navigating');
    } catch (error) {
      if (epoch === this.epoch) this.publish('route-change-failed', { error: error.message });
      throw error;
    } finally { if (epoch === this.epoch) this.rerouting = false; }
  }
  async lifecycle(action) {
    if (!['PAUSE', 'RESUME', 'ARRIVE', 'END', 'ABANDON'].includes(action) || !this.session) throw new Error('No active navigation session.');
    const epoch = this.epoch; const previous = this.session;
    if (action === 'RESUME') validateFix(this.fix, this.now());
    const response = await this.api.navSessionPatch(previous.sessionId || previous.id || previous._id, { action, expectedRouteVersion: previous.routeVersion, observedAt: new Date(this.now()).toISOString() });
    if (epoch !== this.epoch || previous !== this.session) return;
    this.session = { ...(response.session || response), navigation: previous.navigation };
    if (action === 'RESUME') { const route = await this.engine.parse(previous.navigation); if (epoch !== this.epoch) return; validateFix(this.fix, this.now()); this.engine.location(this.fix); this.engine.start(route); await this.persist(epoch); this.publish('navigating'); }
    else if (action === 'PAUSE') { this.engine.stop(); await this.persist(epoch); this.publish('paused'); }
    else await this.forget();
  }
  async persist(epoch) {
    const value = JSON.stringify({ identity: this.identity, session: this.session, savedAt: this.now(), recoveryLeaseUntil: Date.parse(this.session?.recoveryLeaseUntil) });
    const key = navigationCacheKey(this.identity);
    const operation = this.storageOperations.catch(() => {}).then(async () => {
      if (epoch !== this.epoch) return;
      await this.storage.setItem(key, value);
      if (epoch !== this.epoch) await this.storage.removeItem(key);
    });
    this.storageOperations = operation;
    await operation;
  }
  async recover({ consent, online = true }) {
    if (consent !== true) throw new Error('Navigation location consent is required.');
    validateFix(this.fix, this.now());
    const epoch = ++this.epoch;
    const raw = await this.storage.getItem(navigationCacheKey(this.identity));
    if (!raw || epoch !== this.epoch) return;
    const cached = JSON.parse(raw);
    if (!online && (!Number.isFinite(cached.recoveryLeaseUntil) || cached.recoveryLeaseUntil <= this.now() || cached.recoveryLeaseUntil > this.now() + 86400000 || !Number.isFinite(cached.savedAt) || cached.savedAt > this.now())) throw new Error('The cached navigation recovery lease expired. Reconnect to confirm the active route.');
    if (JSON.stringify(cached.identity) !== JSON.stringify(this.identity)) throw new Error('Cached route belongs to another assignment.');
    const active = online ? await this.api.navSessionActive() : cached.session;
    if (epoch !== this.epoch) return;
    const server = active?.session || active;
    if (!server || server.state === 'PAUSED' || (server.sessionId || server.id || server._id) !== (cached.session.sessionId || cached.session.id || cached.session._id) || server.routeVersion !== cached.session.routeVersion || ['ENDED', 'ABANDONED', 'ARRIVED'].includes(server.state))
      throw new Error('The cached route is no longer the active session.');
    const bundle = validateBundle(cached.session.navigation);
    const route = await this.engine.parse(bundle);
    if (epoch !== this.epoch) return;
    validateFix(this.fix, this.now()); this.session = cached.session;
    this.engine.location(this.fix); this.engine.start(route);
    if (online) { this.session = { ...this.session, recoveryLeaseUntil: server.recoveryLeaseUntil }; await this.persist(epoch); }
    this.publish(online ? 'navigating' : 'offline-continuation', { offline: !online, mapsVerified: false });
    return this.session;
  }
  stop() { ++this.epoch; this.session = null; this.rerouting = false; this.engine.stop(); this.publish('stopped'); }
  async forget() { this.stop(); await this.storageOperations.catch(() => {}); await this.storage.removeItem(navigationCacheKey(this.identity)); }
}
