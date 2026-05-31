// =============================================================================
// KilnGlyph — small SVG icon (an arched kiln mouth with a faint flame) used
// to prefix marginalia text per CLAUDE.md §13 visual patterns.
// =============================================================================

import Svg, { Path } from "react-native-svg";

type Props = {
  size?: number;
  color?: string;
};

export function KilnGlyph({ size = 10, color = "#8A7A6E" }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* The kiln mouth — arch + floor */}
      <Path
        d="M3 21 L3 13 A9 9 0 0 1 21 13 L21 21"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M3 21 L21 21"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      {/* A faint flame tip inside */}
      <Path
        d="M12 18 C10.8 16.6 10.8 15 12 13.5 C13.2 15 13.2 16.6 12 18 Z"
        fill={color}
        opacity={0.6}
      />
    </Svg>
  );
}
