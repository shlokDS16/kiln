// =============================================================================
// Tailwind config — mirrors CLAUDE.md §5 design tokens.
//
// Intentional choices:
//   * `theme.spacing`   REPLACED (not extended) with the 9-value brutalist scale.
//     This removes Tailwind's default p-0.5, p-1.5, p-2.5 etc. — by design, so
//     the only spacing values the app can express are CLAUDE.md's tokens.
//   * `theme.borderRadius` REPLACED so `rounded`/`rounded-*` always resolves
//     to 0px. Buttons that need 2px (CLAUDE.md §5) use an inline style.
//   * `theme.extend.colors` ADDED — keeps Tailwind defaults available too.
//   * fontFamily is extended; weight is applied separately via `font-black`
//     (which maps to font-weight: 900) since RN treats family + weight as
//     independent style props.
// =============================================================================

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    // brutalist scale — replaces Tailwind defaults
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
    // brutalist rule — every `rounded*` resolves to 0
    borderRadius: {
      none: "0px",
      DEFAULT: "0px",
    },
    extend: {
      colors: {
        bg:       "#0A0A0A", // near-black, slight warmth
        surface:  "#141414", // raised cards
        border:   "#1F1F1F", // hairline dividers
        text:     "#F5F5F5", // primary text
        textDim:  "#737373", // metadata, labels
        accent:   "#E63946", // KILN red — single accent, sparingly
        // CLAUDE.md aliases — pointing at existing colors, not new hues
        success:  "#F5F5F5",
        warning:  "#E63946",
        error:    "#E63946",
      },
      fontFamily: {
        // pair `font-display font-black` for Georgia 900
        display: ["Georgia"],
        body:    ["System"],
        mono:    ["Menlo"],
      },
      fontSize: {
        hero:  "96px",
        h1:    "48px",
        h2:    "32px",
        h3:    "24px",
        body:  "16px",
        label: "12px",
        micro: "10px",
      },
    },
  },
  plugins: [],
};
