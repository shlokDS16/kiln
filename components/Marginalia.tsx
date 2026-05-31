// =============================================================================
// Marginalia — italic literary-serif quote, prefixed with KilnGlyph, indented
// from the main content edge. Per CLAUDE.md §13.
//
// Rendered under a habit row's "next pending" expansion (HabitRow uses this
// when isNext === true and useVoiceProfileQuote returns a string).
// =============================================================================

import { Text, View } from "react-native";

import { KilnGlyph } from "./KilnGlyph";

type Props = {
  text: string;
  /** Left indent in points (default 24 per CLAUDE.md §13). */
  indent?: number;
};

export function Marginalia({ text, indent = 24 }: Props) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        paddingLeft: indent,
        paddingRight: 8,
      }}
    >
      <View style={{ paddingTop: 4, paddingRight: 8 }}>
        <KilnGlyph size={10} />
      </View>
      <Text
        className="text-dim font-body italic"
        style={{ fontSize: 14, lineHeight: 20, flex: 1 }}
      >
        {text}
      </Text>
    </View>
  );
}
