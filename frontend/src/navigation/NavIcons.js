import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

/**
 * Bottom-tab icons drawn as the exact SVGs from the Nova design
 * (Driver Core SpiceKit.dc.html bottom nav) — viewBox 24, stroke 1.85, round caps.
 */
function Base({ size = 22, color = '#93939A', children }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  );
}

export function HomeIcon(props) {
  return <Base {...props}><Path d="M4 11l8-7 8 7v9H4z" /><Path d="M10 20v-5h4v5" /></Base>;
}

export function VehiclesIcon(props) {
  return (
    <Base {...props}>
      <Path d="M2 7h11v9H2zM13 10h4l3 3.5V16h-7" />
      <Circle cx="6.5" cy="18" r="1.7" />
      <Circle cx="16.5" cy="18" r="1.7" />
    </Base>
  );
}

export function TripsIcon(props) {
  return (
    <Base {...props}>
      <Circle cx="6" cy="6" r="2.4" />
      <Circle cx="18" cy="18" r="2.4" />
      <Path d="M8.4 6h5.1a3 3 0 0 1 0 6h-3a3 3 0 0 0 0 6h5.1" />
    </Base>
  );
}

export function AlertsIcon(props) {
  return (
    <Base {...props}>
      <Path d="M6 9.5a6 6 0 0 1 12 0c0 3.5 1 4.5 1.5 5.5H4.5C5 14 6 13 6 9.5" />
      <Path d="M10 19a2 2 0 0 0 4 0" />
    </Base>
  );
}

export function FuelIcon(props) {
  return (
    <Base {...props}>
      <Path d="M12 3C9 8 6 10.5 6 14a6 6 0 0 0 12 0c0-3.5-3-6-6-11z" />
    </Base>
  );
}

export function MenuIcon(props) {
  return <Base {...props}><Path d="M4 8h16M4 16h16" /></Base>;
}

// Kept for backward compat — points at MenuIcon.
export const MoreIcon = MenuIcon;

export function ProfileIcon(props) {
  return (
    <Base {...props}>
      <Circle cx="12" cy="8" r="3.5" />
      <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </Base>
  );
}

export const NAV_ICONS = {
  Home: HomeIcon,
  Vehicles: VehiclesIcon,
  Trips: TripsIcon,
  Alerts: AlertsIcon,
  Fuel: FuelIcon,
  More: MenuIcon,
  Profile: ProfileIcon,
};
