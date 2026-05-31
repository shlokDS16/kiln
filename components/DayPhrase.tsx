// =============================================================================
// DayPhrase — "DAY [WORD] IN / THE FIRING" italic display serif 56pt, ragged
// right, color cream. Sits below the KilnHero on the Today screen.
//
// streakDays clamps to min 1 ("DAY ONE IN / THE FIRING" — the first day counts).
// =============================================================================

import { Text, View } from "react-native";

import { streakWords } from "../lib/streak-words";

type Props = {
  streakDays: number;
};

export function DayPhrase({ streakDays }: Props) {
  const dayWord = streakWords(Math.max(1, streakDays));
  return (
    <View className="px-5 pt-6">
      <Text
        className="text-cream font-display font-black italic"
        style={{ fontSize: 56, lineHeight: 60 }}
      >
        {`DAY ${dayWord} IN`}
      </Text>
      <Text
        className="text-cream font-display font-black italic"
        style={{ fontSize: 56, lineHeight: 60 }}
      >
        THE FIRING
      </Text>
    </View>
  );
}
