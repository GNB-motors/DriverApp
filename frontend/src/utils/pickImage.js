import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';
import { compressImage } from './imageUtils';

/**
 * Camera / gallery pickers for photo uploads (bills, receipts, CN, POD, repairs).
 * Every capture is downscaled + re-encoded to JPEG (compressImage) so we never
 * upload 5–12MB camera originals over mobile data. Returns an RN file part
 * { uri, name, type } on success, or null on cancel/denied. A denied permission
 * shows an actionable "Open Settings" alert (instead of failing silently).
 */
async function toFile(asset) {
  if (!asset?.uri) return null;
  const uri = await compressImage(asset.uri); // resized JPEG uri (falls back to original on error)
  const base = (asset.fileName || '').replace(/\.[^.]+$/, '');
  const name = (base ? `${base}.jpg` : `photo_${Date.now()}.jpg`);
  return { uri, name, type: 'image/jpeg' };
}

function permissionDenied(kind) {
  Alert.alert(
    `${kind} access needed`,
    `GNBEdge needs ${kind.toLowerCase()} access to attach photos. You can enable it in Settings.`,
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ],
  );
}

/** Launch the camera; returns { uri, name, type } or null (cancelled/denied). */
export async function pickFromCamera() {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) { permissionDenied('Camera'); return null; }
  const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
  if (res.canceled || !res.assets?.length) return null;
  return toFile(res.assets[0]);
}

/** Launch the gallery; returns { uri, name, type } or null. */
export async function pickFromGallery() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) { permissionDenied('Photo'); return null; }
  const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
  if (res.canceled || !res.assets?.length) return null;
  return toFile(res.assets[0]);
}

export default { pickFromCamera, pickFromGallery };
