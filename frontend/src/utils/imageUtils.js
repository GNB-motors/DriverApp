import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import logger from './logger';

export async function compressImage(uri, quality = 0.75, maxWidth = 1920) {
  try {
    const result = await manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      { compress: quality, format: SaveFormat.JPEG },
    );
    return result.uri;
  } catch (e) {
    logger.warn('imageUtils', `compression failed, using original URI: ${e?.message}`);
    return uri;
  }
}
