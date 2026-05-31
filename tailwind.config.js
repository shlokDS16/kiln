// =============================================================================
// Tailwind config — mirrors CLAUDE.md §5 (cinematic editorial Living Kiln palette).
//
// Tailwind uses flat color keys so class names are clean (`bg-deep`,
// `text-cream`, `border-hairline`, `text-ember`). The grouped TypeScript
// shape in CLAUDE.md §5 (`colors.bg.deep`, `colors.accent.ember`) is for
// code that imports a theme object — Tailwind's class naming is an
// implementation detail of the design system, not part of the constitution.
//
// Time-of-day ember shifts (consumed by useTimeOfDay) live as `time-{period}`.
//
// Spacing + borderRadius unchanged from prior config — still brutalist.
// =============================================================================

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    spacing: {
      0: "0px",
      1: "4px",
      2: "8px",
      3: "12px",
      4: "16px",
      5: "24px",
      6: "32px",
      7: "48px",
      8: "64px",
    },
    borderRadius: {
      none: "0px",
      DEFAULT: "0px",
    },
    extend: {
      colors: {
        // backgrounds (warm dark)
        deep:     "#0E0906",
        surface:  "#1A1310",
        hot:      "#2A1A12",
        // text
        cream:    "#F4EEE3",
        dim:      "#8A7A6E",
        // accents
        ember:    "#E85D2A",
        crimson:  "#C73A2D",
        gold:     "#E8B14E",
        // borders
        hairline: "#2A1F18",
        // time-of-day ember shifts (consumed by useTimeOfDay paletteShift)
        "time-morning": "#E85D2A",
        "time-midday":  "#FF6B2C",
        "time-evening": "#C73A2D",
        "time-late":    "#8B2419",
      },
      fontFamily: {
        // Three-tier serif system per CLAUDE.md §5
        // (placeholders — Phase 3.5 swaps display/body to PP Editorial New, mono to JetBrains Mono via expo-font)
        display: ["Georgia"],
        body:    ["Georgia"],
        mono:    ["Menlo"],
      },
      fontSize: {
        hero:  "96px",
        h1:    "56px",
        h2:    "32px",
        h3:    "22px",
        body:  "16px",
        label: "12px",
        micro: "10px",
      },
    },
  },
  plugins: [],
};
