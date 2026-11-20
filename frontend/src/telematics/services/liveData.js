// A missing/malformed response is an error, never an empty success or sample list.
export function managerCardsFromResponse(payload) {
  const cards = payload?.cards || payload?.data?.cards || (Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : null);
  if (!Array.isArray(cards) || cards.some(card => !card || typeof (card.id || card._id) !== 'string')) {
    throw new Error('Action cards are unavailable. Please retry.');
  }
  return cards.map(c => ({ ...c, id: c.id || c._id }));
}

export function vehicleOptionsFromResponse(payload) {
  const items = payload?.data ?? payload;
  if (!Array.isArray(items) || items.some(item => !item || typeof (item._id || item.id) !== 'string')) {
    throw new Error('Truck list is unavailable. Please retry.');
  }
  return items;
}
