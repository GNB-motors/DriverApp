import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/**
 * Compress an image before uploading to AWS or sending to OCR.
 *
 * @param {string} uri           Local file URI of the source image
 * @param {number} [quality=0.75] JPEG quality 0–1 (0.75 = good quality, ~60–70% smaller)
 * @param {number} [maxWidth=1920] Max width in pixels; taller images are scaled proportionally
 * @returns {Promise<string>}    URI of the compressed image
 */
export async function compressImage(uri, quality = 0.75, maxWidth = 1920) {
  try {
    const result = await manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      { compress: quality, format: SaveFormat.JPEG },
    );
    return result.uri;
  } catch (e) {
    // If compression fails for any reason, fall back to the original
    console.warn('[imageUtils] compression failed, using original URI', e);
    return uri;
  }
}
