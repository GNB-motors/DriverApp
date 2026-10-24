export function validCoordinate(point) {
  return (
    Number.isFinite(point?.latitude) &&
    Number.isFinite(point?.longitude) &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180
  );
}
export function mapPoints(vehicles) {
  return vehicles.filter((vehicle) => validCoordinate(vehicle.coordinates));
}
export function trailCoordinates(points = []) {
  return points
    .filter(validCoordinate)
    .map(({ latitude, longitude }) => ({ latitude, longitude }));
}

export function trailSegments(points = []) {
  const segments = [];
  let current = [];
  for (const point of points) {
    if (!validCoordinate(point) || point.break || point.gap || point.gapType) {
      if (current.length > 1) segments.push(current);
      current = [];
    }
    if (validCoordinate(point))
      current.push({ latitude: point.latitude, longitude: point.longitude });
  }
  if (current.length > 1) segments.push(current);
  return segments;
}
