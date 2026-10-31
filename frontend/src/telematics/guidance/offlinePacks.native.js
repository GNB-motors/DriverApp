import { OfflineManager } from '@maplibre/maplibre-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { corridorPackBounds, packReady } from './corridorPacks';
import { navigationCacheKey } from './navigationCoordinator';
function key(identity, bundle) { return `${navigationCacheKey(identity)}:maps:${bundle.routeId}:${bundle.geometryHash}`; }
export async function inspectOfflineMaps({ identity, bundle, mapStyle }) {
  const manifest = JSON.parse(await AsyncStorage.getItem(key(identity, bundle)) || 'null');
  if (!manifest || manifest.mapStyle !== mapStyle || !manifest.ids?.length || manifest.expected !== manifest.ids.length) return { ready: false, reason: 'Map download incomplete or unavailable for this route and style.' };
  try {
    const states = await Promise.all(manifest.ids.map(async id => (await OfflineManager.getPack(id)).status()));
    return { ready: states.every(packReady), completed: states.filter(packReady).length, total: states.length, bytes: states.reduce((n,s) => n + s.completedResourceSize, 0), minZoom: manifest.minZoom, maxZoom: manifest.maxZoom };
  } catch { return { ready: false, reason: 'A downloaded map region is missing. Download the route again.' }; }
}
export async function downloadOfflineMaps({ identity, bundle, coordinates, mapStyle, onProgress = () => {}, isActive = () => true }) {
  if (!mapStyle || !bundle.geometryHash) throw new Error('A versioned map style and route geometry hash are required for offline maps.');
  const bounds = corridorPackBounds(coordinates);
  const manifest = { routeId: bundle.routeId, geometryHash: bundle.geometryHash, mapStyle, ids: [], expected: bounds.length, minZoom: 10, maxZoom: 15, downloadedAt: null };
  const cacheKey = key(identity, bundle);
  const old = JSON.parse(await AsyncStorage.getItem(cacheKey) || 'null');
  try {
    for (let index = 0; index < bounds.length; index++) {
      if (!isActive()) throw new Error('Navigation identity changed. Map download cancelled.');
      await new Promise((resolve, reject) => {
      let current; let complete = false; let outcome = 'pending'; let timeout;
      const finish = error => { if (complete) return; complete = true; outcome = error ? 'error' : 'success'; clearTimeout(timeout); error ? reject(error) : resolve(); };
      const remember = pack => {
        current = pack;
        if (pack?.id && !manifest.ids.includes(pack.id)) manifest.ids.push(pack.id);
      };
      timeout = setTimeout(() => { current?.pause(); finish(new Error('Map download timed out. Partial maps remain unavailable.')); }, 180000);
      OfflineManager.createPack({ mapStyle, bounds: bounds[index], minZoom: manifest.minZoom, maxZoom: manifest.maxZoom, metadata: { routeId: bundle.routeId, geometryHash: bundle.geometryHash, identity: navigationCacheKey(identity) } }, (_pack, status) => {
        remember(_pack);
        if (!isActive()) { _pack.pause(); finish(new Error('Map download cancelled after identity change.')); return; }
        onProgress({ completed: index, total: bounds.length, percentage: status.percentage });
        if (packReady(status)) finish();
      }, (_pack, error) => finish(new Error(error.message))).then(async pack => {
        remember(pack);
        if (outcome === 'error' || !isActive()) { await OfflineManager.deletePack(pack.id).catch(() => {}); finish(new Error('Map download cancelled.')); return; }
        if (outcome === 'success') return;
        await AsyncStorage.setItem(`${cacheKey}:staging`, JSON.stringify(manifest.ids));
        if (!isActive()) { await pack.pause(); finish(new Error('Map download cancelled.')); } else await pack.resume();
      }).catch(finish);
      });
    }
    if (!isActive()) throw new Error('Navigation identity changed. Map download cancelled.');
    manifest.downloadedAt = new Date().toISOString();
    // One AsyncStorage write publishes the complete new generation. Keep the previous
    // installed generation intact until this point so interrupted downloads stay usable.
    await AsyncStorage.setItem(cacheKey, JSON.stringify(manifest));
  } catch (error) {
    await Promise.all(manifest.ids.map(id => OfflineManager.deletePack(id).catch(() => {})));
    await AsyncStorage.removeItem(`${cacheKey}:staging`).catch(() => {});
    throw error;
  }
  await AsyncStorage.removeItem(`${cacheKey}:staging`).catch(() => {});
  for (const id of old?.ids || []) if (!manifest.ids.includes(id)) await OfflineManager.deletePack(id).catch(() => {});
  const state = await inspectOfflineMaps({ identity, bundle, mapStyle }); onProgress(state); return state;
}
