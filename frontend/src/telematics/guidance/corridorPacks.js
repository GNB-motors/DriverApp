// Small overlapping rectangles bound download cost instead of downloading a whole lane's bounding box.
export function corridorPackBounds(coordinates, { span = 0.1, padding = 0.006, maxPacks = 64 } = {}) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) throw new Error('A complete route geometry is required.');
  const packs = []; let points = [];
  const bounds = rows => [Math.min(...rows.map(p => p[0])) - padding, Math.min(...rows.map(p => p[1])) - padding, Math.max(...rows.map(p => p[0])) + padding, Math.max(...rows.map(p => p[1])) + padding];
  for (const point of coordinates) {
    if (!Array.isArray(point) || !Number.isFinite(point[0]) || !Number.isFinite(point[1]) || Math.abs(point[0]) > 179.9 || Math.abs(point[1]) > 85) throw new Error('This route geometry cannot be downloaded safely.');
    const previous = points[points.length - 1];
    if (previous && (Math.abs(previous[0] - point[0]) > span || Math.abs(previous[1] - point[1]) > span)) throw new Error('A gap in the route exceeds the offline corridor limit.');
    const next = [...points, point]; const box = bounds(next);
    if (points.length > 1 && (box[2] - box[0] > span + padding * 2 || box[3] - box[1] > span + padding * 2)) {
      packs.push(bounds(points)); points = [previous, point];
    } else points = next;
    if (packs.length >= maxPacks) throw new Error('This route is too large for one offline download.');
  }
  packs.push(bounds(points)); return packs;
}
export function packReady(status) {
  return status?.state === 'complete' && status.requiredResourceCount > 0 && status.completedResourceCount >= status.requiredResourceCount;
}
