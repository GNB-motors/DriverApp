import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

/**
 * Bottom-tab icons drawn as clean line SVGs in the Nova design style
 * (viewBox 24, stroke 1.85, round caps/joins) — matching the Nova SpiceKit
 * bottom nav. Used across the driver tab bar + center FAB.
 */
function Base({ size = 22, color = '#93939A', children }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.85}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  );
}

export function HomeIcon(props) {
  return (
    <Base {...props}>
      <Path d="M4 11l8-7 8 7v9H4z" />
      <Path d="M10 20v-5h4v5" />
    </Base>
  );
}

// Wrench / tool — Repairs
export function RepairsIcon(props) {
  return (
    <Base {...props}>
      <Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </Base>
  );
}

// File with text lines — Documents
export function DocumentsIcon(props) {
  return (
    <Base {...props}>
      <Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <Path d="M14 3v5h5" />
      <Path d="M9 13h6" />
      <Path d="M9 17h6" />
    </Base>
  );
}

// Person — Profile
export function ProfileIcon(props) {
  return (
    <Base {...props}>
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <Circle cx="12" cy="7" r="4" />
    </Base>
  );
}

// Droplet — Refuel (center FAB)
export function FuelIcon(props) {
  return (
    <Base {...props}>
      <Path d="M12 2.7l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </Base>
  );
}

export const NAV_ICONS = {
  Home: HomeIcon,
  Repairs: RepairsIcon,
  Documents: DocumentsIcon,
  Profile: ProfileIcon,
};
