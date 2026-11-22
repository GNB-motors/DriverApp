export function validCoordinate(point) {
  if (!point || point.latitude == null || point.longitude == null) return false;
  const lat = Number(point.latitude);
  const lng = Number(point.longitude);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}
export function mapPoints(vehicles) {
  return (vehicles || []).filter((vehicle) => validCoordinate(vehicle?.coordinates));
}
export function trailCoordinates(points = []) {
  return (points || [])
    .filter(validCoordinate)
    .map(({ latitude, longitude }) => ({ latitude: Number(latitude), longitude: Number(longitude) }));
}

export function trailSegments(points = []) {
  const segments = [];
  let current = [];
  for (const point of (points || [])) {
    if (!validCoordinate(point) || point.break || point.gap || point.gapType) {
      if (current.length > 1) segments.push(current);
      current = [];
    }
    if (validCoordinate(point))
      current.push({ latitude: Number(point.latitude), longitude: Number(point.longitude) });
  }
  if (current.length > 1) segments.push(current);
  return segments;
}
