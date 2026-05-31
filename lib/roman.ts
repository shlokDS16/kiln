// =============================================================================
// roman — integer to Roman numeral (greedy). Used by KilnHero marginalia
// ("fornax · day III · 67% heat").
// =============================================================================

const TABLE: ReadonlyArray<readonly [number, string]> = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
  [100, "C"],  [90, "XC"],  [50, "L"],  [40, "XL"],
  [10, "X"],   [9, "IX"],   [5, "V"],   [4, "IV"], [1, "I"],
];

export function toRoman(n: number): string {
  if (n <= 0) return "";
  let result = "";
  let rest = n;
  for (const [value, sym] of TABLE) {
    while (rest >= value) {
      result += sym;
      rest -= value;
    }
  }
  return result;
}
