const MAX_RESOURCE_BYTES = 16 * 1024 * 1024;
const MAX_PACK_BYTES = 128 * 1024 * 1024;
export function validateResourceManifest(manifest, { routeId, allowedOrigins, mapStyle, now = Date.now() }) {
  if (manifest?.schemaVersion !== 1 || manifest.readiness !== 'READY') throw new Error(manifest?.reasons?.join('; ') || 'Offline source resources are unavailable.');
  if (manifest.routeId !== routeId || !/^[A-Za-z0-9_-]{1,160}$/.test(manifest.packId || '') || !manifest.mapVersion || !Array.isArray(manifest.resources) || !manifest.resources.length || manifest.resources.length > 512) throw new Error('Invalid offline resource manifest.');
  if (!mapStyle || typeof manifest.mapStyle !== 'string' || manifest.mapStyle !== mapStyle) throw new Error('Offline resource manifest does not match the configured map style.');
  if (!Number.isFinite(Date.parse(manifest.expiresAt)) || Date.parse(manifest.expiresAt) <= now) throw new Error('The offline resource manifest expired. Reconnect to renew it.');
  const ids = new Set(); let bytes = 0;
  for (const resource of manifest.resources) {
    const url = new URL(resource.url);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !allowedOrigins.includes(url.origin)) throw new Error('Offline resource origin is not configured for this app.');
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(resource.id || '') || ids.has(resource.id) || !/^[a-f0-9]{64}$/i.test(resource.sha256 || '') || !Number.isInteger(resource.bytes) || resource.bytes < 1 || resource.bytes > MAX_RESOURCE_BYTES || !['style','glyphs','sprite','tiles','route'].includes(resource.kind)) throw new Error('Invalid offline resource checksum, size or identity.');
    // A server path is metadata, never permission to escape the application sandbox.
    if (resource.localPath && (resource.localPath.startsWith('/') || resource.localPath.split('/').includes('..') || resource.localPath.includes('\\'))) throw new Error('Invalid offline resource path.');
    ids.add(resource.id); bytes += resource.bytes;
  }
  if (bytes > MAX_PACK_BYTES) throw new Error('Offline source resource pack exceeds the device download limit.');
  return { bytes };
}
export async function installResources({ manifest, routeId, allowedOrigins, mapStyle, files, storage, identityKey, now = Date.now, isActive = () => true, onProgress = () => {} }) {
  const { bytes } = validateResourceManifest(manifest, { routeId, allowedOrigins, mapStyle, now: now() });
  if (await files.freeBytes() < bytes + 32 * 1024 * 1024) throw new Error('Not enough free space for this offline download.');
  const scope = `${identityKey}:resources:${manifest.packId}`;
  const staging = await files.directory(manifest.packId, identityKey);
  const verified = [];
  for (const resource of manifest.resources) {
    if (!isActive()) throw new Error('Offline download cancelled after navigation identity changed.');
    const path = `${staging}${resource.id}`;
    let info = await files.info(path);
    if (!info.exists || info.size !== resource.bytes || await files.sha256(path) !== resource.sha256.toLowerCase()) {
      const resume = JSON.parse(await storage.getItem(`${scope}:resume:${resource.id}`) || 'null');
      await files.download(resource.url, path, { resume, isActive, checkpoint: value => storage.setItem(`${scope}:resume:${resource.id}`, JSON.stringify(value)) });
      info = await files.info(path);
      if (!info.exists || info.size !== resource.bytes || await files.sha256(path) !== resource.sha256.toLowerCase()) { await files.remove(path); throw new Error(`Offline resource ${resource.id} failed checksum validation.`); }
    }
    if (!isActive()) throw new Error('Offline download cancelled after navigation identity changed.');
    await storage.removeItem(`${scope}:resume:${resource.id}`);
    verified.push({ ...resource, path }); onProgress({ completed: verified.length, total: manifest.resources.length });
  }
  const index = { schemaVersion: 1, packId: manifest.packId, routeId, mapStyle: manifest.mapStyle, mapVersion: manifest.mapVersion, expiresAt: manifest.expiresAt, resources: verified, resourcesVerified: true, nativePackComplete: false, voiceVerified: false, verifiedAt: new Date(now()).toISOString() };
  if (!isActive()) throw new Error('Offline download cancelled.');
  // One final index publication makes partial downloads invisible to readers.
  await storage.setItem(`${identityKey}:resource-index:${routeId}`, JSON.stringify(index));
  if (!isActive()) { await storage.removeItem(`${identityKey}:resource-index:${routeId}`); throw new Error('Offline download cancelled.'); }
  return index;
}
