// A missing/malformed response is an error, never an empty success or sample list.
export function managerCardsFromResponse(payload) {
  if (!Array.isArray(payload?.cards) || payload.cards.some(card => !card || typeof card.id !== 'string')) {
    throw new Error('Action cards are unavailable. Please retry.');
  }
  return payload.cards;
}

export function vehicleOptionsFromResponse(payload) {
  const items = payload?.data ?? payload;
  if (!Array.isArray(items) || items.some(item => !item || typeof (item._id || item.id) !== 'string')) {
    throw new Error('Truck list is unavailable. Please retry.');
  }
  return items;
}
