// =============================================================================
// Onboarding store — in-memory state for the personality → goals → preview flow.
//
// Lives only in RAM; we deliberately do NOT persist this (MMKV is reserved for
// auth session). If the user backgrounds/kills the app mid-onboarding they
// restart the flow. Once goals.tsx fires the Edge Function and writes to
// Postgres, the routing decision in app/index.tsx will send them to (tabs)/today
// and this store can reset.
// =============================================================================

import { create } from "zustand";

// Mirror of the Gemini-validated response shape (see supabase/functions/generate_routine).
export type OrchestratorResponse = {
  voice_profile: {
    tone: string;
    vocabulary: string[];
    sentence_pattern: string;
    example_nudges: string[];
  };
  routine: {
    wake_time: string;
    sleep_time: string;
    habits: Array<{
      name: string;
      dimension:
        | "habit"
        | "deep_work"
        | "focus_discipline"
        | "energy"
        | "mood"
        | "diet"
        | "sleep";
      scheduled_time: string;
      duration_min: number;
      days: Array<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun">;
      rationale: string;
    }>;
  };
  synthesis: string;
};

type OnboardingState = {
  // BFI-10 slider responses, indexed by question index 0..9 (each 0-100).
  responses: Record<number, number>;

  // Free-text inputs from goals.tsx
  goals: string;
  nonNegotiables: string;
  currentPain: string;

  // Server response from generate_routine, consumed by routine-preview.tsx
  orchestratorResponse: OrchestratorResponse | null;

  setResponse: (questionIndex: number, score: number) => void;
  setGoals: (text: string) => void;
  setNonNegotiables: (text: string) => void;
  setCurrentPain: (text: string) => void;
  setOrchestratorResponse: (resp: OrchestratorResponse | null) => void;
  reset: () => void;
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  responses: {},
  goals: "",
  nonNegotiables: "",
  currentPain: "",
  orchestratorResponse: null,

  setResponse: (q, s) =>
    set((state) => ({ responses: { ...state.responses, [q]: s } })),
  setGoals: (text) => set({ goals: text }),
  setNonNegotiables: (text) => set({ nonNegotiables: text }),
  setCurrentPain: (text) => set({ currentPain: text }),
  setOrchestratorResponse: (resp) => set({ orchestratorResponse: resp }),

  reset: () =>
    set({
      responses: {},
      goals: "",
      nonNegotiables: "",
      currentPain: "",
      orchestratorResponse: null,
    }),
}));
