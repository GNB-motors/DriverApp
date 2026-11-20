import { TRUCK_THEME, truckStatus } from "./liveMap";

// Authentic top-down commercial truck artwork matching web Live Tracking & Tata FleetEdge telematics standard.
export const TRUCK_VIEWBOX = 96;

const BODY_HIGHLIGHTS = {
  moving: "#4ade80",
  stopped: "#c084fc",
  idling: "#fb923c",
  offline: "#cbd5e1",
  breakdown: "#fca5a5",
};

/**
 * Top-down commercial truck with forward-projecting conical headlight flash beam
 * (Tata FleetEdge / WheelsEye telematics standard), cab, windshield, headlights,
 * status-highlighted container body, and taillights.
 */
export function truckSvg({ status, heading = 0, selected = false, shadow = true }) {
  const statusKey = truckStatus(status);
  const theme = TRUCK_THEME[statusKey] || TRUCK_THEME.offline;
  const bodyHighlight = BODY_HIGHLIGHTS[statusKey] || theme.primary;
  const course = Number(heading ?? 0);
  const rot = Number.isFinite(course) ? ((course % 360) + 360) % 360 : 0;
  const id = statusKey;
  const beamOpacity = theme.beamOpacity ?? 0.55;

  const halo = selected
    ? `<circle cx="48" cy="48" r="41" fill="${theme.primary}" fill-opacity="0.12"/><circle cx="48" cy="48" r="37" fill="none" stroke="${theme.primary}" stroke-width="2.5" stroke-dasharray="5 3" opacity="0.9"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TRUCK_VIEWBOX}" height="${TRUCK_VIEWBOX}" viewBox="0 0 ${TRUCK_VIEWBOX} ${TRUCK_VIEWBOX}" fill="none">
  <defs>
    <linearGradient id="t-beam-${id}" x1="48" y1="14" x2="48" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#FEF08A" stop-opacity="${beamOpacity}"/>
      <stop offset="0.35" stop-color="${theme.primary}" stop-opacity="${beamOpacity * 0.75}"/>
      <stop offset="1" stop-color="${theme.primary}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="t-cab-${id}" x1="34" y1="0" x2="62" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${theme.dark}"/>
      <stop offset="0.45" stop-color="${theme.primary}"/>
      <stop offset="1" stop-color="${theme.dark}"/>
    </linearGradient>
    <linearGradient id="t-box-${id}" x1="33" y1="0" x2="63" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${theme.dark}"/>
      <stop offset="0.2" stop-color="${theme.primary}"/>
      <stop offset="0.5" stop-color="${bodyHighlight}"/>
      <stop offset="0.8" stop-color="${theme.primary}"/>
      <stop offset="1" stop-color="${theme.dark}"/>
    </linearGradient>
    <linearGradient id="t-glass" x1="48" y1="22" x2="48" y2="30" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#5B6B85"/>
      <stop offset="1" stop-color="#1B2433"/>
    </linearGradient>
  </defs>
  ${halo}
  <g transform="rotate(${rot}, 48, 48)">
    <!-- Forward Headlight Conical Flash Beam (Tata FleetEdge telematics standard) -->
    <path d="M40 13.5 L24 1.5 C31 -0.5 65 -0.5 72 1.5 L56 13.5 Z" fill="url(#t-beam-${id})"/>
    <!-- Dual Headlight Focal Flash Rays -->
    <polygon points="38,13.5 28,1.5 34,1.5 41,13.5" fill="#FFFBEB" fill-opacity="0.8"/>
    <polygon points="55,13.5 62,1.5 68,1.5 58,13.5" fill="#FFFBEB" fill-opacity="0.8"/>

    <!-- Chassis Ground Shadow -->
    <rect x="33" y="17" width="31" height="66" rx="7" fill="#0B1B3F" fill-opacity="0.28"/>

    <!-- Side Mirrors -->
    <rect x="31.5" y="22" width="3" height="5" rx="1.2" fill="${theme.dark}"/>
    <rect x="61.5" y="22" width="3" height="5" rx="1.2" fill="${theme.dark}"/>

    <!-- Cab Body -->
    <path d="M36 21 Q36 13 48 13 Q60 13 60 21 L60 36 L36 36 Z" fill="url(#t-cab-${id})"/>

    <!-- Headlight Lamps -->
    <rect x="37.5" y="13" width="5.5" height="2" rx="1" fill="#FEF08A" stroke="#FFFFFF" stroke-width="0.5"/>
    <rect x="53" y="13" width="5.5" height="2" rx="1" fill="#FEF08A" stroke="#FFFFFF" stroke-width="0.5"/>

    <!-- Windshield & Glass Reflection -->
    <path d="M38.5 22 Q48 19 57.5 22 L56.5 29 Q48 27.5 39.5 29 Z" fill="url(#t-glass)"/>
    <path d="M40 22.2 Q44 21 47 20.8 L46 23 Q43 23.2 40.4 24 Z" fill="#FFFFFF" fill-opacity="0.35"/>

    <!-- Roof Vent & Coupling -->
    <rect x="40" y="30.5" width="16" height="4" rx="2" fill="#FFFFFF" fill-opacity="0.22"/>
    <rect x="44" y="35.5" width="8" height="3" fill="#2B3445"/>

    <!-- Cargo Container Body with Status Theme Gradient -->
    <rect x="34.5" y="38" width="27" height="44" rx="2.5" fill="url(#t-box-${id})" stroke="${theme.dark}" stroke-width="1.2"/>
    <rect x="37.5" y="41" width="21" height="38" rx="1.5" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.8"/>
    <path d="M48 41 L48 79" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.8"/>

    <!-- Rear Taillights -->
    <rect x="34.5" y="80" width="27" height="2" rx="1" fill="#E5484D"/>
  </g>
</svg>`;
}
