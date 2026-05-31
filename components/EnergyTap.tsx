// =============================================================================
// EnergyTap — one-tap energy log (1..5).
//
// Visual rules:
//   - "ENERGY" label in mono micro caps tracked-wide, padded left, dim
//   - 5 equal-width cells, height 56pt
//   - 1px hairline divider between cells (right edge of each except last)
//   - Tapped cell flashes ember for 600ms with deep-color digit
//   - Fires useLogEnergy mutation immediately on tap (no confirmation)
// =============================================================================

import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useLogEnergy } from "../lib/hooks/use-log-energy";

const VALUES: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];

export function EnergyTap() {
  const logEnergy = useLogEnergy();
  const [justTapped, setJustTapped] = useState<number | null>(null);

  const handleTap = (value: 1 | 2 | 3 | 4 | 5) => {
    setJustTapped(value);
    logEnergy.mutate({ value });
    setTimeout(() => setJustTapped(null), 600);
  };

  return (
    <View>
      <Text
        className="text-dim font-mono uppercase tracking-widest px-5 pt-6 pb-3"
        style={{ fontSize: 10 }}
      >
        energy
      </Text>
      <View className="flex-row">
        {VALUES.map((v, i) => {
          const tapped = justTapped === v;
          return (
            <Pressable
              key={v}
              onPress={() => handleTap(v)}
              className={`flex-1 items-center justify-center ${tapped ? "bg-ember" : ""} ${
                i < VALUES.length - 1 ? "border-r border-hairline" : ""
              }`}
              style={{ height: 56 }}
            >
              <Text
                className={`${tapped ? "text-deep" : "text-cream"} font-mono`}
                style={{ fontSize: 18 }}
              >
                {v}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
