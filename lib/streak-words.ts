// =============================================================================
// streak-words — convert an integer 0–999 to its spelled-out English form
// in UPPERCASE. Used by DayPhrase ("DAY FORTY-SEVEN IN / THE FIRING").
//
// 0 returns "ZERO" but DayPhrase clamps to min(1) — there's no "day zero".
// 999 is the practical ceiling (a streak past that is bragging-rights only).
// =============================================================================

const ONES = [
  "ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
  "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN",
  "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN",
];
const TENS = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];

export function streakWords(n: number): string {
  if (n < 0) return "ZERO";
  if (n < 20) return ONES[n];
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return ones === 0 ? TENS[tens] : `${TENS[tens]}-${ONES[ones]}`;
  }
  if (n < 1000) {
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    return rest === 0
      ? `${ONES[hundreds]} HUNDRED`
      : `${ONES[hundreds]} HUNDRED ${streakWords(rest)}`;
  }
  return String(n); // ≥1000 — bail out, render numerals
}
