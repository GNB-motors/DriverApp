// Litres arrive from OCR (amount ÷ rate) and from summed records, so raw values
// carry floating-point noise like 182.52000000000001.
export function formatLitres(value) {
  if (value == null || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return number.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}
