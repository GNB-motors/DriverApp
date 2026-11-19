const configuredKey = () => process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
export const placesConfigured = () => !!configuredKey();
async function request(endpoint, params, fetcher = fetch) {
  const key = configuredKey();
  if (!key) throw new Error('Google place search is not configured.');
  const url = `https://maps.googleapis.com/maps/api/place/${endpoint}/json?${new URLSearchParams({ ...params, key })}`;
  const response = await fetcher(url);
  const result = await response.json();
  if (result.status === 'ZERO_RESULTS') return result;
  if (!response.ok || result.status !== 'OK') throw new Error('Google place search is unavailable. Try saved locations or retry.');
  return result;
}
export async function searchGooglePlaces(input, sessionToken) {
  if (input.trim().length < 3) return [];
  return (await request('autocomplete', { input, sessiontoken: sessionToken })).predictions || [];
}
export async function getGooglePlace(placeId, sessionToken) {
  return (await request('details', { place_id: placeId, sessiontoken: sessionToken, fields: 'name,formatted_address,geometry,address_components' })).result;
}
