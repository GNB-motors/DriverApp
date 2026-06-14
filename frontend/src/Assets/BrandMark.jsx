import React from 'react';
import Svg, { G, Path, Circle, Line } from 'react-native-svg';

/**
 * Highway Sahayak white mark — faithful RN port of
 * src/Assets/highway-sahayak-mark-white.svg.
 *
 * A fleet truck (lucide "truck") stroked over a dashed highway line. Single
 * `color` drives both (defaults white for the teal splash). viewBox 512×512.
 *
 *   <BrandMark size={58} color="#FFFFFF" />
 *
 * Props: size (or width/height), color.
 */
export default function BrandMark({ size, width, height, color = '#FFFFFF' }) {
  const w = width || size || 64;
  const h = height || size || 64;
  return (
    <Svg width={w} height={h} viewBox="0 0 512 512" fill="none">
      {/* dashed highway line */}
      <Line
        x1="120"
        y1="372"
        x2="392"
        y2="372"
        stroke={color}
        strokeOpacity={0.9}
        strokeWidth={13}
        strokeLinecap="round"
        strokeDasharray={[1.5, 46]}
      />
      {/* truck — lucide glyph, scaled into place */}
      <G
        transform="translate(101, 92) scale(12.9)"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <Path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
        <Path d="M15 18H9" />
        <Path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 18.52 8H14" />
        <Circle cx="7" cy="18" r="2" />
        <Circle cx="17" cy="18" r="2" />
      </G>
    </Svg>
  );
}
