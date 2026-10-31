import * as FS from 'expo-file-system/legacy';
import { File } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { installResources } from './resourceInstaller';
export async function downloadSourceResources(options) {
  const files = {
    freeBytes: () => FS.getFreeDiskStorageAsync(),
    async directory(packId, identityKey) {
      const scope = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, identityKey);
      const path = `${FS.documentDirectory}navigation-resources/${scope}/${packId}/`;
      await FS.makeDirectoryAsync(path, { intermediates: true }); return path;
    },
    info: path => FS.getInfoAsync(path),
    remove: path => FS.deleteAsync(path, { idempotent: true }),
    async sha256(path) { return [...new Uint8Array(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, await new File(path).bytes()))].map(n => n.toString(16).padStart(2,'0')).join(''); },
    async download(url, path, { resume, checkpoint, isActive }) {
      let paused = false; let task;
      task = FS.createDownloadResumable(url, path, {}, async progress => {
        options.onProgress?.({ bytesWritten: progress.totalBytesWritten, bytesExpected: progress.totalBytesExpectedToWrite });
        if (!isActive() && !paused) { paused = true; const snapshot = await task.pauseAsync(); await checkpoint(snapshot); }
      }, resume?.resumeData);
      try {
        const result = resume?.resumeData ? await task.resumeAsync() : await task.downloadAsync();
        if (paused || !isActive()) throw new Error('Offline download paused after identity change.');
        if (!result || result.status !== 200 && result.status !== 206) throw new Error(`Offline resource download failed (${result?.status || 'no response'}).`);
      } catch (error) { if (!paused) await checkpoint(task.savable()); throw error; }
    },
  };
  return installResources({ ...options, files, storage: AsyncStorage });
}
