import * as ImagePicker from 'expo-image-picker';

/** Normalize a picked asset to an RN file part { uri, name, type }. */
function toFile(asset) {
  if (!asset) return null;
  const uri = asset.uri;
  const name = asset.fileName || uri.split('/').pop() || `photo_${Date.now()}.jpg`;
  const type = asset.mimeType || 'image/jpeg';
  return { uri, name, type };
}

/** Launch the camera; returns { uri, name, type } or null (cancelled/denied). */
export async function pickFromCamera() {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
  if (res.canceled || !res.assets?.length) return null;
  return toFile(res.assets[0]);
}

/** Launch the gallery; returns { uri, name, type } or null. */
export async function pickFromGallery() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
  if (res.canceled || !res.assets?.length) return null;
  return toFile(res.assets[0]);
}

export default { pickFromCamera, pickFromGallery };
