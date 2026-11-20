import { TRUCK_THEME, truckStatus } from "./liveMap";

// Authentic top-down commercial truck artwork matching web Live Tracking & Tata FleetEdge telematics standard.
export const TRUCK_VIEWBOX = 120;

const BODY_HIGHLIGHTS = {
  moving: "#4ade80",
  stopped: "#c084fc",
  idling: "#fb923c",
  offline: "#cbd5e1",
  breakdown: "#fca5a5",
};

/**
 * Top-down commercial truck with prominent, forward-projecting conical headlight flash beam
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
  // High radiant beam opacity for unmistakable direction visibility at all zoom levels
  const beamOpacity = statusKey === "moving" ? 0.95 : (theme.beamOpacity ?? 0.65) * 1.35;

  const halo = selected
    ? `<circle cx="60" cy="60" r="54" fill="${theme.primary}" fill-opacity="0.14"/><circle cx="60" cy="60" r="50" fill="none" stroke="${theme.primary}" stroke-width="3" stroke-dasharray="6 4" opacity="0.95"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TRUCK_VIEWBOX}" height="${TRUCK_VIEWBOX}" viewBox="0 0 ${TRUCK_VIEWBOX} ${TRUCK_VIEWBOX}" fill="none">
  <defs>
    <!-- Wide Forward Conical Beam Gradient -->
    <linearGradient id="t-beam-wide-${id}" x1="60" y1="24" x2="60" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#FEF08A" stop-opacity="${Math.min(1, beamOpacity * 0.9)}"/>
      <stop offset="0.3" stop-color="${theme.primary}" stop-opacity="${beamOpacity * 0.75}"/>
      <stop offset="0.7" stop-color="${theme.primary}" stop-opacity="${beamOpacity * 0.35}"/>
      <stop offset="1" stop-color="${theme.primary}" stop-opacity="0"/>
    </linearGradient>

    <!-- Intense Central High-Beam Spotlight Cone -->
    <linearGradient id="t-beam-core-${id}" x1="60" y1="24" x2="60" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.95"/>
      <stop offset="0.2" stop-color="#FEF08A" stop-opacity="0.85"/>
      <stop offset="0.6" stop-color="${theme.primary}" stop-opacity="0.4"/>
      <stop offset="1" stop-color="${theme.primary}" stop-opacity="0"/>
    </linearGradient>

    <!-- Cab Body Gradient -->
    <linearGradient id="t-cab-${id}" x1="46" y1="24" x2="74" y2="24" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${theme.dark}"/>
      <stop offset="0.45" stop-color="${theme.primary}"/>
      <stop offset="1" stop-color="${theme.dark}"/>
    </linearGradient>

    <!-- Container Body Gradient -->
    <linearGradient id="t-box-${id}" x1="45" y1="48" x2="75" y2="48" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${theme.dark}"/>
      <stop offset="0.2" stop-color="${theme.primary}"/>
      <stop offset="0.5" stop-color="${bodyHighlight}"/>
      <stop offset="0.8" stop-color="${theme.primary}"/>
      <stop offset="1" stop-color="${theme.dark}"/>
    </linearGradient>

    <!-- Windshield Tint -->
    <linearGradient id="t-glass" x1="60" y1="31" x2="60" y2="38" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#5B6B85"/>
      <stop offset="1" stop-color="#1B2433"/>
    </linearGradient>
  </defs>
  ${halo}
  <g transform="rotate(${rot}, 60, 60)">
    <!-- 1. Wide Ambient Conical Flashlight Beam (Tata FleetEdge telematics standard) -->
    <polygon points="48,24 6,0 114,0 72,24" fill="url(#t-beam-wide-${id})"/>

    <!-- 2. Intense Central Spotlight Flash Cone -->
    <polygon points="52,24 24,0 96,0 68,24" fill="url(#t-beam-core-${id})"/>

    <!-- 3. Dual Headlight Laser Focal Projection Rays -->
    <polygon points="50,24 26,0 36,0 54,24" fill="#FFFBEB" fill-opacity="0.9"/>
    <polygon points="66,24 84,0 94,0 70,24" fill="#FFFBEB" fill-opacity="0.9"/>

    <!-- 4. Luminous Headlight Lens Glare Flares -->
    <circle cx="52" cy="24" r="3.5" fill="#FEF08A" stroke="#FFFFFF" stroke-width="1"/>
    <circle cx="68" cy="24" r="3.5" fill="#FEF08A" stroke="#FFFFFF" stroke-width="1"/>

    <!-- Chassis Ground Shadow -->
    <rect x="45" y="28" width="30" height="68" rx="7" fill="#0B1B3F" fill-opacity="0.32"/>

    <!-- Side Mirrors -->
    <rect x="43.5" y="33" width="3" height="5" rx="1.2" fill="${theme.dark}"/>
    <rect x="73.5" y="33" width="3" height="5" rx="1.2" fill="${theme.dark}"/>

    <!-- Cab Body -->
    <path d="M48 32 Q48 24 60 24 Q72 24 72 32 L72 47 L48 47 Z" fill="url(#t-cab-${id})"/>

    <!-- Headlight Lamps -->
    <rect x="49.5" y="24" width="5.5" height="2" rx="1" fill="#FEF08A" stroke="#FFFFFF" stroke-width="0.5"/>
    <rect x="65" y="24" width="5.5" height="2" rx="1" fill="#FEF08A" stroke="#FFFFFF" stroke-width="0.5"/>

    <!-- Windshield & Glass Reflection -->
    <path d="M50.5 33 Q60 30 69.5 33 L68.5 40 Q60 38.5 51.5 40 Z" fill="url(#t-glass)"/>
    <path d="M52 33.2 Q56 32 59 31.8 L58 34 Q55 34.2 52.4 35 Z" fill="#FFFFFF" fill-opacity="0.4"/>

    <!-- Roof Vent & Coupling -->
    <rect x="52" y="41.5" width="16" height="4" rx="2" fill="#FFFFFF" fill-opacity="0.22"/>
    <rect x="56" y="46.5" width="8" height="3" fill="#2B3445"/>

    <!-- Cargo Container Body with Status Theme Gradient -->
    <rect x="46.5" y="49" width="27" height="45" rx="2.5" fill="url(#t-box-${id})" stroke="${theme.dark}" stroke-width="1.2"/>
    <rect x="49.5" y="52" width="21" height="39" rx="1.5" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.8"/>
    <path d="M60 52 L60 91" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.8"/>

    <!-- Rear Taillights -->
    <rect x="46.5" y="92" width="27" height="2" rx="1" fill="#E5484D"/>
  </g>
</svg>`;
}
