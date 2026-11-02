// OpenFreeMap "liberty": OpenStreetMap vector tiles with Google-like cartography, no API key.
// EXPO_PUBLIC_MAP_STYLE_URL overrides it once the fleet hosts its own style.
export const OPENFREEMAP_LIBERTY = 'https://tiles.openfreemap.org/styles/liberty';
export const mapStyleUrl = () => process.env.EXPO_PUBLIC_MAP_STYLE_URL || OPENFREEMAP_LIBERTY;
