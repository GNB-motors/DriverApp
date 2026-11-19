import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
// Hash picked bytes before this app performs any compression or upload.
// The picker/OS may already have converted the camera original.
export async function fingerprintPickedAsset(asset) {
  const bytes = asset.file?.arrayBuffer ? await asset.file.arrayBuffer() : await new File(asset.uri).arrayBuffer();
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}
