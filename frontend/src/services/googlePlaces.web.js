import { Loader } from '@googlemaps/js-api-loader';
const key = () => process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
export const placesConfigured = () => !!key();
async function places() {
  if (!key()) throw new Error('Google place search is not configured.');
  const loader = new Loader({ id: 'driver-app-google-maps', apiKey: key(), version: 'weekly', libraries: ['maps'], language: 'en', region: 'US', mapIds: [], nonce: '', authReferrerPolicy: 'origin' });
  return loader.importLibrary('places');
}
const sessions = new Map();
export async function searchGooglePlaces(input, token) {
  if (input.trim().length < 3) return [];
  const library = await places();
  if (!sessions.has(token)) sessions.set(token, new library.AutocompleteSessionToken());
  return new Promise((resolve, reject) => new library.AutocompleteService().getPlacePredictions({ input, sessionToken: sessions.get(token) }, (rows, status) => {
    if (status === 'OK' || status === 'ZERO_RESULTS') resolve(rows || []);
    else reject(new Error('Google place search is unavailable.'));
  }));
}
export async function getGooglePlace(placeId, token) {
  const library = await places();
  return new Promise((resolve, reject) => new library.PlacesService(globalThis.document.createElement('div')).getDetails({ placeId, sessionToken: sessions.get(token), fields: ['name', 'formatted_address', 'geometry', 'address_components'] }, (details, status) => {
    sessions.delete(token);
    if (status === 'OK' && details) resolve(details);
    else reject(new Error('Google place details are unavailable.'));
  }));
}
