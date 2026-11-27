import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

// Icon paths copied from the design so the app matches it stroke for stroke.
const stroke = (color, width = 2) => ({ fill: 'none', stroke: color, strokeWidth: width, strokeLinecap: 'round', strokeLinejoin: 'round' });

export const TruckIcon = ({ size = 60, color = '#213EA7', hub = '#fff', width = 3 }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" {...stroke(color, width)}>
    <Path d="M4 14h22v18H4z" /><Path d="M26 20h9l7 7v5H26z" />
    <Circle cx="12" cy="35" r="4" fill={hub} /><Circle cx="34" cy="35" r="4" fill={hub} /><Path d="M9 22h10" />
  </Svg>
);
export const BackIcon = ({ size = 20, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, 2.2)}><Path d="M15 5l-7 7 7 7" /></Svg>
);
export const ChevronIcon = ({ color = '#555E74' }) => (
  <Svg width={10} height={14} viewBox="0 0 10 14" {...stroke(color, 2)}><Path d="M3 2l5 5-5 5" /></Svg>
);
export const LanguageIcon = ({ size = 28, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, 2)}>
    <Path d="M4 5h9M8.5 3v2M6 5c.5 3.5 3 6 6 7.5M11 5c-.8 3.6-3.4 6.6-7 8" /><Path d="M13 21l4-9 4 9M14.5 18h5" />
  </Svg>
);
export const CheckIcon = ({ size = 16, color, width = 2.6 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, width)}><Path d="M5 12l5 5 9-10" /></Svg>
);
export const WarnIcon = ({ size = 20, color, width = 2.2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, width)}><Path d="M12 3l10 18H2z" /><Path d="M12 10v5M12 18h.01" /></Svg>
);
export const PinIcon = ({ size = 18, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 2c-4 0-7 3-7 7 0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
  </Svg>
);
export const PinOffIcon = ({ size = 36, color, width = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, width)}>
    <Path d="M12 2c-4 0-7 3-7 7 0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z" /><Path d="M3 3l18 18" />
  </Svg>
);
export const ExternalIcon = ({ size = 18, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, 2.2)}>
    <Path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Svg>
);
export const MailIcon = ({ size = 18, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, 2)}><Rect x="3" y="5" width="18" height="14" rx="2" /><Path d="M3 7l9 6 9-6" /></Svg>
);
export const HomeIcon = ({ size = 24, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, 2.2)}><Path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></Svg>
);
export const NavArrowIcon = ({ size = 24, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}><Path d="M12 2l7 19-7-4-7 4z" /></Svg>
);
export const GridIcon = ({ size = 24, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2}>
    <Rect x="4" y="4" width="6" height="6" rx="1.5" /><Rect x="14" y="4" width="6" height="6" rx="1.5" />
    <Rect x="4" y="14" width="6" height="6" rx="1.5" /><Rect x="14" y="14" width="6" height="6" rx="1.5" />
  </Svg>
);
export const DocIcon = ({ size = 20, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, 2)}><Rect x="5" y="3" width="14" height="18" rx="2" /><Path d="M9 9h6M9 13h6" /></Svg>
);
export const IssueIcon = ({ size = 20, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, 2)}><Circle cx="12" cy="12" r="9" /><Path d="M12 7v6M12 16.5h.01" /></Svg>
);
export const CameraIcon = ({ size = 28, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, 2)}><Path d="M4 8h3l2-3h6l2 3h3v11H4z" /><Circle cx="12" cy="13" r="3.5" /></Svg>
);
export const FolderIcon = ({ size = 28, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, 2)}><Path d="M4 6h6l2 2h8v11H4z" /></Svg>
);
export const ClockIcon = ({ size = 20, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, 2.2)}><Circle cx="12" cy="12" r="9" /><Path d="M12 7v5l3 2" /></Svg>
);
export const PhoneIcon = ({ size = 18, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, 2.2)}>
    <Path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1" />
  </Svg>
);
export const PlusIcon = ({ size = 20, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, 2.4)}><Path d="M12 5v14M5 12h14" /></Svg>
);
export const ArrowUpIcon = ({ size = 18, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, 2.4)}><Path d="M12 19V5M5 12l7-7 7 7" /></Svg>
);
export const GpsOffIcon = ({ size = 20, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, 2.2)}>
    <Circle cx="12" cy="12" r="3" /><Path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><Path d="M4 4l16 16" />
  </Svg>
);
