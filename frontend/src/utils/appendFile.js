// Browsers require actual bytes; React Native resolves the URI file part itself.
export async function appendFile(form, field, asset) {
  if (!asset) return;
  const name = asset.name || asset.fileName || 'photo.jpg';
  if (typeof document !== 'undefined') {
    const blob = asset.file || await (await fetch(asset.uri)).blob();
    form.append(field, blob, name);
  } else {
    form.append(field, {
      uri: asset.uri,
      name,
      type: asset.type || asset.mimeType || 'image/jpeg',
    });
  }
}
