export function savedLocationFromGoogle(details, fallbackName) {
  const component = (type) => details.address_components?.find((row) => row.types?.includes(type))?.long_name || '';
  const point = details.geometry?.location;
  const lat = typeof point?.lat === 'function' ? point.lat() : point?.lat;
  const lng = typeof point?.lng === 'function' ? point.lng() : point?.lng;
  return { name: details.name || fallbackName, address: details.formatted_address || '', city: component('locality'), state: component('administrative_area_level_1'), pincode: component('postal_code'), ...(Number.isFinite(lat) && { lat }), ...(Number.isFinite(lng) && { lng }) };
}
