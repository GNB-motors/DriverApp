export function fuelPayload(fields, vehicleId, driverId, previous) {
  if (!vehicleId || !driverId) throw new Error('Select a vehicle and driver.');
  const litres = Number(fields.litres);
  const rate = Number(fields.rate);
  if (!(litres > 0) || !(rate > 0) || !Number.isFinite(litres * rate))
    throw new Error('Enter positive litres and rate per litre.');
  const odometer = fields.odometerReading === '' ? undefined : Number(fields.odometerReading);
  if (odometer !== undefined && (!Number.isFinite(odometer) || odometer < 0))
    throw new Error('Enter a valid odometer reading.');
  if (fields.fillingType === 'FULL_TANK' && odometer !== undefined && previous?.odometerReading && odometer <= previous.odometerReading)
    throw new Error(`Odometer must be greater than the previous reading (${previous.odometerReading} km).`);
  return {
    vehicleId, driverId, fuelType: 'DIESEL', fillingType: fields.fillingType,
    litres, rate, ...(odometer !== undefined && { odometerReading: odometer }),
    ...(fields.location.trim() && { location: fields.location.trim() }),
    ...(fields.routeSource && { routeSource: fields.routeSource }),
    ...(fields.routeDestination && { routeDestination: fields.routeDestination }),
    refuelTime: fields.refuelTime,
  };
}

// Persist document IDs before saving fuel, so retries reuse the same receipt.
// The shared backend uses documentId to recognize an already-saved fuel entry.
export async function saveFuelEntry(api, draft, checkpoint, progress) {
  let state = { ...draft };
  for (const [slot, key, type] of [['fuel', 'documentId', 'FUEL_SLIP'], ['odometer', 'odometerDocId', 'ODOMETER']]) {
    if (!state[slot] || state[key]) continue;
    const document = await api.fuelUploadDocument(state.payload.vehicleId, state[slot].asset, type, state[slot].ocr, progress);
    const id = document._id || document.id;
    if (!id) throw new Error('The uploaded document was not confirmed by the server.');
    state = { ...state, [key]: id };
    await checkpoint(state);
  }
  return api.fuelSave({ ...state.payload, documentId: state.documentId, ...(state.odometerDocId && { odometerDocId: state.odometerDocId }) });
}
