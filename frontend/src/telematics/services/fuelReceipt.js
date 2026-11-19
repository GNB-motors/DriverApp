// The receipt OCR contract returns Indian local time without an offset.
// Never interpret that string in the phone's timezone or accept rolled-over dates.
export function receiptRefuelTime(datetime, uploadedAt) {
  const match = typeof datetime === 'string' && datetime.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:\d{2})?$/);
  if (!match) return uploadedAt;
  const [, year, month, day, hour, minute, seconds = '00', zone = '+05:30'] = match;
  const local = `${year}-${month}-${day}T${hour}:${minute}:${seconds}`;
  const calendar = new Date(`${local}Z`);
  if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 19) !== local) return uploadedAt;
  const parsed = new Date(`${local}${zone}`);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : uploadedAt;
}

// OCR is a suggestion: retain manual values and ignore missing/invalid readings.
export function receiptFields(current, receipt) {
  const next = { ...current };
  const volume = Number(receipt?.volume);
  const rate = Number(receipt?.rate);
  if (!next.station && typeof receipt?.location === 'string') next.station = receipt.location.trim();
  if (!next.litres && Number.isFinite(volume) && volume > 0) next.litres = String(volume);
  if (!next.amountInr && Number.isFinite(volume * rate) && volume > 0 && rate > 0)
    next.amountInr = (volume * rate).toFixed(2);
  return next;
}
