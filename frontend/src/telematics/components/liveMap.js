export const INDIA_BOUNDS = {
  south: 6.5,
  west: 68.1,
  north: 35.7,
  east: 97.4,
};
export const INDIA_CORNERS = [
  { latitude: INDIA_BOUNDS.south, longitude: INDIA_BOUNDS.west },
  { latitude: INDIA_BOUNDS.north, longitude: INDIA_BOUNDS.east },
];
export const INDIA_REGION = {
  latitude: (INDIA_BOUNDS.south + INDIA_BOUNDS.north) / 2,
  longitude: (INDIA_BOUNDS.west + INDIA_BOUNDS.east) / 2,
  latitudeDelta: 31,
  longitudeDelta: 31,
};

// One zoom level in from the all-India frame, widened when the fleet is spread out.
export function fleetOverview(coordinates) {
  if (!coordinates.length) return null;
  const lats = coordinates.map((point) => point.latitude);
  const lngs = coordinates.map((point) => point.longitude);
  const south = Math.min(...lats);
  const north = Math.max(...lats);
  const west = Math.min(...lngs);
  const east = Math.max(...lngs);
  const delta = Math.max(
    INDIA_REGION.latitudeDelta / 2,
    (north - south) * 1.5,
    (east - west) * 1.5,
  );
  if (delta >= INDIA_REGION.latitudeDelta) return null;
  return {
    latitude: (south + north) / 2,
    longitude: (west + east) / 2,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

export const MARKER_SIZE = 52;

// Status palette of the web Live Tracking page (main-frontend vehicleMarkerIcon.js).
export const TRUCK_THEME = {
  moving: { primary: "#0C9F41", dark: "#088B36", mid: "#07A33E", beamOpacity: 0.55 },
  stopped: { primary: "#9333EA", dark: "#7E22CE", mid: "#9333EA", beamOpacity: 0.35 },
  idling: { primary: "#F97316", dark: "#C2410C", mid: "#EA580C", beamOpacity: 0.5 },
  offline: { primary: "#9CA3AF", dark: "#6B7280", mid: "#9CA3AF", beamOpacity: 0.25 },
};
export const truckStatus = (status) => (TRUCK_THEME[status] ? status : "offline");
export const statusColor = (status) => TRUCK_THEME[truckStatus(status)].primary;
export const markerHeading = (vehicle) =>
  Number.isFinite(vehicle.courseDegrees) ? Math.round(vehicle.courseDegrees) : null;

// Same muted cartography as the web Live Tracking page (main-frontend mapStyles.js).
export const LIVE_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#f0f3f6" }] },
  {
    featureType: "administrative.country",
    elementType: "geometry.stroke",
    stylers: [{ visibility: "on" }, { color: "#7b8794" }, { weight: 1.5 }],
  },
  {
    featureType: "administrative.country",
    elementType: "labels.text.fill",
    stylers: [{ visibility: "on" }, { color: "#475569" }],
  },
  {
    featureType: "administrative.country",
    elementType: "labels.text.stroke",
    stylers: [{ visibility: "on" }, { color: "#ffffff" }, { weight: 2 }],
  },
  {
    featureType: "administrative.province",
    elementType: "geometry.stroke",
    stylers: [{ visibility: "on" }, { color: "#9daab8" }, { weight: 1.2 }],
  },
  {
    featureType: "administrative.province",
    elementType: "labels.text.fill",
    stylers: [{ visibility: "on" }, { color: "#64748b" }],
  },
  {
    featureType: "administrative.province",
    elementType: "labels.text.stroke",
    stylers: [{ visibility: "on" }, { color: "#ffffff" }, { weight: 2 }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ visibility: "on" }, { color: "#1e293b" }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.stroke",
    stylers: [{ visibility: "on" }, { color: "#ffffff" }, { weight: 2 }],
  },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#e2e8f0" }, { weight: 1 }],
  },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#edf2f7" }] },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#cbd5e1" }, { weight: 1 }],
  },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#d8dee4" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
];
