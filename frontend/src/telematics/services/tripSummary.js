export const RECENT_TRIPS = 5;

// DISMISSED means "not a trip"; the full trips list still shows it.
export const recentTrips = (trips = [], limit = RECENT_TRIPS) =>
  trips.filter((trip) => trip.status !== "DISMISSED").slice(0, limit);

export const tripStatusLabel = (status) =>
  status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");

export const tripDetail = (trip, plate) =>
  [
    plate,
    trip.distanceKm == null
      ? "Distance unavailable"
      : `${Math.round(trip.distanceKm)} km`,
    trip.startedAt
      ? new Date(trip.startedAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        })
      : null,
    tripStatusLabel(trip.status),
  ]
    .filter(Boolean)
    .join(" · ");
