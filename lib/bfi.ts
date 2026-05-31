// =============================================================================
// BFI-10 — the 10 questions + the scoring function.
//
// Each question's `reverse: true` means a high slider score (close to "exactly
// me") indicates a LOW score on that Big Five dimension (so we subtract from
// 100 before averaging). This matches Rammstedt & John (2007) BFI-10 keying.
//
// Order interleaves reverse-coded ↔ forward-coded items to suppress
// straight-line response bias.
// =============================================================================

export type BigFiveDimension = "O" | "C" | "E" | "A" | "N";

export type BfiQuestion = {
  idx: number;
  statement: string;
  dimension: BigFiveDimension;
  reverse: boolean;
};

export const QUESTIONS: ReadonlyArray<BfiQuestion> = [
  { idx: 0, statement: "Quiet rooms feel better to me than loud ones.",                                 dimension: "E", reverse: true  },
  { idx: 1, statement: "I assume people mean what they say.",                                            dimension: "A", reverse: false },
  { idx: 2, statement: "When no one's watching, the work slips.",                                        dimension: "C", reverse: true  },
  { idx: 3, statement: "Under pressure, I stay even.",                                                   dimension: "N", reverse: true  },
  { idx: 4, statement: "Art and music aren't where I put my time.",                                      dimension: "O", reverse: true  },
  { idx: 5, statement: "I leave a crowded night with more energy than I came in with.",                  dimension: "E", reverse: false },
  { idx: 6, statement: "What's wrong with people stands out to me before what's right.",                 dimension: "A", reverse: true  },
  { idx: 7, statement: "I finish what I start, and I finish it clean.",                                  dimension: "C", reverse: false },
  { idx: 8, statement: "Small things knock me sideways for hours.",                                      dimension: "N", reverse: false },
  { idx: 9, statement: "My mind wanders into ideas that don't have a use yet.",                          dimension: "O", reverse: false },
];

export type BigFiveScores = {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
};

/**
 * Convert raw 0-100 slider responses (keyed by question index) into the five
 * Big Five averages (0-100 each).
 * Missing responses default to 50 (neutral midpoint).
 */
export function scoreBfi(responses: Record<number, number>): BigFiveScores {
  const adjusted = QUESTIONS.map((q) => {
    const raw = responses[q.idx] ?? 50;
    const value = q.reverse ? 100 - raw : raw;
    return { dimension: q.dimension, value };
  });

  const avg = (dim: BigFiveDimension) => {
    const items = adjusted.filter((a) => a.dimension === dim);
    return Math.round(items.reduce((s, a) => s + a.value, 0) / items.length);
  };

  return {
    openness:          avg("O"),
    conscientiousness: avg("C"),
    extraversion:      avg("E"),
    agreeableness:     avg("A"),
    neuroticism:       avg("N"),
  };
}
