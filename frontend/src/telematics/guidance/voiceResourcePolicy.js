const LANGUAGES = new Set(['en', 'hi', 'bn']);
const PLATFORMS = new Set(['android', 'ios']);
const MAX_POLICY_LEASE_MS = 62 * 60 * 1000;

export function voicePolicyCacheKey({ orgId, userId, platform, language }) {
  return `gnb-nav-voice:v1:${[orgId, userId, platform, language].map(value => encodeURIComponent(String(value || ''))).join(':')}`;
}

export function validVoicePolicy(policy, { language, platform, now = Date.now() } = {}) {
  const seen = new Set();
  const uniqueResources = Array.isArray(policy?.resources) && policy.resources.every(resource => {
    if (!resource || !LANGUAGES.has(resource.language) || !PLATFORMS.has(resource.platform) ||
        typeof resource.resourceVersion !== 'string' || resource.resourceVersion.length === 0 ||
        revisionValue(resource.revision) === null || typeof resource.voiceIdentifier !== 'string' || resource.voiceIdentifier.length === 0 ||
        !['VALID', 'SUSPENDED'].includes(resource.status) || typeof resource.offlineVerified !== 'boolean') return false;
    const key = `${resource.language}:${resource.platform}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  return policy?.schemaVersion === 1 && LANGUAGES.has(language) && PLATFORMS.has(platform) &&
    policy.language === language && policy.platform === platform &&
    policy.fallbackLanguage === 'en' && uniqueResources && Number.isFinite(Date.parse(policy.expiresAt)) &&
    Date.parse(policy.expiresAt) > now && Date.parse(policy.expiresAt) <= now + MAX_POLICY_LEASE_MS;
}

function revisionValue(value) {
  if (Number.isSafeInteger(value) && value > 0) return value;
  return null;
}

function revisionCompare(left, right) {
  return Math.sign(left - right);
}

// A policy must match the request, be within its server lease, and name the
// exact installed voice identifier. Installed voices alone never authorize speech.
export function selectReviewedVoice(policy, installedVoices, { language, platform, offline = false, now = Date.now() } = {}) {
  if (!validVoicePolicy(policy, { language, platform, now })) return null;
  const resources = policy.resources.filter(resource =>
    resource && PLATFORMS.has(resource.platform) && resource.platform === platform &&
    LANGUAGES.has(resource.language) && typeof resource.resourceVersion === 'string' && resource.resourceVersion.length > 0 &&
    revisionValue(resource.revision) !== null && typeof resource.voiceIdentifier === 'string' && resource.voiceIdentifier.length > 0 &&
    ['VALID', 'SUSPENDED'].includes(resource.status) && typeof resource.offlineVerified === 'boolean');
  const candidates = language === 'en' ? ['en'] : [language, 'en'];
  for (const candidate of candidates) {
    const resource = resources.find(row => row.language === candidate && row.status === 'VALID' && (!offline || row.offlineVerified));
    if (!resource) continue;
    const installed = installedVoices.find(voice =>
      voice?.identifier === resource.voiceIdentifier && (voice.language?.toLowerCase() === candidate || voice.language?.toLowerCase().startsWith(`${candidate}-`)));
    if (installed) return {
      language: candidate,
      requestedLanguage: language,
      voiceIdentifier: resource.voiceIdentifier,
      resourceVersion: resource.resourceVersion,
      revision: resource.revision,
      offlineVerified: resource.offlineVerified,
      offlinePolicy: offline,
      usingFallback: candidate !== language,
      expiresAt: policy.expiresAt,
    };
  }
  return null;
}

function olderResourceRevision(incoming, current, languages) {
  const incomingRows = new Map((incoming?.resources || []).filter(row => languages.includes(row?.language)).map(row => [row.language, row]));
  const currentRows = new Map((current?.resources || []).filter(row => languages.includes(row?.language)).map(row => [row.language, row]));
  for (const [resourceLanguage, row] of currentRows) {
    const next = incomingRows.get(resourceLanguage);
    const a = revisionValue(next?.revision); const b = revisionValue(row.revision);
    if (next && a !== null && b !== null && revisionCompare(a, b) < 0) return true;
  }
  return false;
}

export function voiceSelectionLabel(selection) {
  if (!selection) return 'Visual guidance only. No reviewed compatible voice is available.';
  const languageName = { en: 'English', hi: 'Hindi', bn: 'Bengali' }[selection.language];
  const fallback = selection.usingFallback ? ` ${languageName} fallback` : ` ${languageName}`;
  const offline = selection.offlineVerified ? ' Offline voice verified.' : ' Offline voice unverified.';
  return `${fallback} voice is active.${offline}`;
}

export function createVoicePolicyController({ api, storage, identity, language, platform, installedVoices, onSelection = () => {}, now = Date.now, refreshMs = 60000 }) {
  const cacheKey = voicePolicyCacheKey({ ...identity, language, platform });
  let generation = 0; let disposed = false; let policy = null; let selection = null; let policyFromCache = false; let offlineMode = false;
  let refreshTimer = null; let expiryTimer = null;
  let storageOperations = Promise.resolve();

  function savePolicy(nextPolicy, ticket) {
    const operation = storageOperations.catch(() => {}).then(async () => {
      if (disposed || ticket !== generation) return false;
      const cachedRaw = await storage.getItem(cacheKey);
      if (disposed || ticket !== generation) return false;
      if (cachedRaw) {
        try { if (olderResourceRevision(nextPolicy, JSON.parse(cachedRaw), [language, 'en'])) return false; } catch { /* Replace corrupt cache with the fresh server response. */ }
      }
      await storage.setItem(cacheKey, JSON.stringify(nextPolicy));
      return !disposed && ticket === generation;
    });
    storageOperations = operation;
    return operation;
  }

  function apply(nextPolicy, offline) {
    const next = selectReviewedVoice(nextPolicy, installedVoices, { language, platform, offline, now: now() });
    const changed = selection?.voiceIdentifier !== next?.voiceIdentifier || selection?.revision !== next?.revision || selection?.resourceVersion !== next?.resourceVersion || selection?.expiresAt !== next?.expiresAt || selection?.offlinePolicy !== next?.offlinePolicy || selection?.offlineVerified !== next?.offlineVerified;
    policy = nextPolicy; selection = next;
    if (changed) onSelection(selection, { offline, expiresAt: nextPolicy?.expiresAt });
    if (expiryTimer) clearTimeout(expiryTimer);
    const expiresAt = Date.parse(nextPolicy?.expiresAt);
    if (Number.isFinite(expiresAt) && expiresAt > now()) expiryTimer = setTimeout(() => {
      if (disposed || Date.parse(policy?.expiresAt) > now()) return;
      selection = null; onSelection(null, { expired: true });
    }, expiresAt - now());
    return selection;
  }

  async function initialize({ offline = false } = {}) {
    const ticket = ++generation;
    offlineMode = offline;
    if (offline) {
      try {
        const raw = await storage.getItem(cacheKey);
        if (disposed || ticket !== generation || !raw) return null;
        const cached = JSON.parse(raw);
        if (!validVoicePolicy(cached, { language, platform, now: now() })) return apply(null, true);
        policyFromCache = true;
        return apply(cached, true);
      } catch { if (!disposed && ticket === generation) return apply(null, true); return null; }
    }
    try {
      const fetched = await api.navVoiceResources(language, platform);
      if (disposed || ticket !== generation) return null;
      if (!validVoicePolicy(fetched, { language, platform, now: now() })) throw new Error('Invalid or expired voice policy.');
      if (olderResourceRevision(fetched, policy, [language, 'en'])) return selection;
      const saved = await savePolicy(fetched, ticket);
      if (disposed || ticket !== generation || !saved) return selection;
      policyFromCache = false;
      return apply(fetched, false);
    } catch {
      // Online failures never consult cache: a cached VALID policy could hide a
      // newer server suspension. Visual guidance remains available.
      if (!disposed && ticket === generation) apply(null, false);
      return null;
    }
  }

  async function refresh() {
    if (offlineMode) return null;
    const ticket = ++generation;
    try {
      const fetched = await api.navVoiceResources(language, platform);
      if (disposed || ticket !== generation) return null;
      if (!validVoicePolicy(fetched, { language, platform, now: now() })) {
        policy = null; policyFromCache = false; apply(null, false); return null;
      }
      if (olderResourceRevision(fetched, policy, [language, 'en'])) return null;
      const saved = await savePolicy(fetched, ticket);
      if (disposed || ticket !== generation || !saved) return null;
      policyFromCache = false;
      return apply(fetched, false);
    } catch {
      // A connected refresh failure cannot extend prior authorization or hide
      // a server suspension. Offline use is handled separately by setOffline.
      if (!disposed && ticket === generation) {
        policyFromCache = false; policy = null; apply(null, false);
      }
      return null;
    }
  }

  function setOffline(offline) {
    const nextOffline = offline === true;
    if (offlineMode === nextOffline) return null;
    offlineMode = nextOffline; generation++;
    if (offlineMode) {
      if (policy && validVoicePolicy(policy, { language, platform, now: now() })) return apply(policy, true);
      selection = null; onSelection(null, { offline: true }); return null;
    }
    if (policyFromCache) { policy = null; selection = null; policyFromCache = false; onSelection(null, { offline: false }); }
    return refresh();
  }

  function startRefresh() {
    if (disposed || refreshTimer) return;
    refreshTimer = setInterval(() => { refresh(); }, refreshMs);
  }
  function stopRefresh() { if (refreshTimer) clearInterval(refreshTimer); refreshTimer = null; }
  function dispose() {
    disposed = true; generation++;
    stopRefresh();
    if (expiryTimer) clearTimeout(expiryTimer);
    expiryTimer = null; policy = null; selection = null;
  }
  return { initialize, refresh, setOffline, startRefresh, stopRefresh, dispose, get selection() { return selection; } };
}
