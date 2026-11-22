import { colors } from "../../components/ui";

/**
 * Determines the dominant or representative accent color for a cluster
 * based on vehicle statuses.
 */
export function getClusterColor(vehicles = []) {
  let moving = 0;
  let idling = 0;
  let stopped = 0;
  let offline = 0;

  for (const v of vehicles) {
    const s = String(v.status || "offline").toLowerCase();
    if (s === "moving") moving++;
    else if (s === "idling") idling++;
    else if (s === "stopped") stopped++;
    else offline++;
  }

  // If there are moving trucks, give it the lively green indicator
  if (moving > 0 && moving >= stopped) return "#0C9F41";
  if (stopped > 0 && stopped >= idling) return "#9333EA";
  if (idling > 0) return "#F97316";
  if (offline === vehicles.length) return "#64748B";
  return colors.primary;
}

/**
 * Fast, pure spatial clustering for map vehicles based on the current viewport delta.
 * When zoomed out (high delta), nearby vehicles merge into count circles.
 * When zoomed in (low delta), clusters break down into individual truck markers.
 */
export function clusterVehicles(vehicles = [], region = null) {
  if (!vehicles || vehicles.length === 0) return [];

  const latDelta = region?.latitudeDelta ?? 10;
  const lngDelta = region?.longitudeDelta ?? 10;

  // Zoom threshold: below this (city block / street level ~ 0.035 deg),
  // only cluster vehicles that literally share the same parking depot / yard.
  const isFarOut = latDelta > 0.035;
  const clusterRadiusLat = isFarOut ? (latDelta / 550) * 46 : 0.00035;
  const clusterRadiusLng = isFarOut ? (lngDelta / 360) * 46 : 0.00035;

  const rawClusters = [];

  for (const v of vehicles) {
    const coords = v.coordinates;
    if (
      !coords ||
      typeof coords.latitude !== "number" ||
      typeof coords.longitude !== "number"
    ) {
      continue;
    }

    const lat = coords.latitude;
    const lng = coords.longitude;

    let matched = null;
    for (const c of rawClusters) {
      const dLat = Math.abs(c.coordinates.latitude - lat);
      const dLng = Math.abs(c.coordinates.longitude - lng);
      if (dLat <= clusterRadiusLat && dLng <= clusterRadiusLng) {
        matched = c;
        break;
      }
    }

    if (matched) {
      matched.vehicles.push(v);
      const n = matched.vehicles.length;
      matched.coordinates.latitude =
        matched.coordinates.latitude + (lat - matched.coordinates.latitude) / n;
      matched.coordinates.longitude =
        matched.coordinates.longitude + (lng - matched.coordinates.longitude) / n;
    } else {
      rawClusters.push({
        id: `cluster-${v.id}`,
        coordinates: { latitude: lat, longitude: lng },
        vehicles: [v],
      });
    }
  }

  return rawClusters.map((c) => {
    if (c.vehicles.length === 1) {
      return {
        isCluster: false,
        vehicle: c.vehicles[0],
        coordinates: c.vehicles[0].coordinates,
      };
    }
    return {
      isCluster: true,
      id: c.id,
      coordinates: c.coordinates,
      count: c.vehicles.length,
      vehicles: c.vehicles,
      statusColor: getClusterColor(c.vehicles),
    };
  });
}
