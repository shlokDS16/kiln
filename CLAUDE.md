# KILN

A personality-aware routine tracker for iOS. Built by Shlok Goenka.

This file is the constitution of the project. Every Claude Code session reads it on startup. Treat it as source of truth; if a request conflicts with this file, surface the conflict before acting.

---

## 1. Tone and posture

KILN is not a habit tracker. It is a transformation system. The aesthetic is editorial neo-brutalist. The voice is direct, never apologetic, never preachy. The user (Shlok) is rebuilding focus discipline and pursuing a serious long-term trajectory. Every design decision should reinforce gravity, not gamification.

No emojis in production copy. No exclamation marks in nudges. No badges, no streaks-with-fire-icons, no "Great job!" toasts. Streaks are tracked but presented as bare numerals in brutal type. Achievement is shown through visual weight, not animation flourishes.

KILN's visual identity is cinematic editorial, not corporate brutalist. Reference: warm dark cinematography, editorial magazine layouts, Apple Design Award winners. The app contains a signature visual element — the Kiln Scene — which lives on the Today screen and reflects the user's behavioral state through heat, embers, and clay form. The aesthetic should feel like opening a leather-bound journal in firelight, not a productivity dashboard.

---

## 2. Architecture at a glance

KILN runs on three AI agents, each with a distinct role and model tier:

1. **Orchestrator (Claude Sonnet 4.5)** — one-shot during onboarding. Takes a BFI-10 personality profile + user goals + non-negotiables and outputs (a) a generated 7-day routine and (b) a personalized voice profile that all subsequent nudges adopt.

2. **Nudge Agent (Groq Llama 3.3 70B)** — fires 5 minutes before each scheduled task. Generates a 1–2 sentence push notification calibrated to the user's voice profile, current streak, and recent adherence. Cheap and fast. Never produces shame language.

3. **Reflector (Claude Sonnet 4.5)** — runs nightly at 11 PM via Supabase pg_cron. Reads the day's logs, generates a 3-paragraph reflection plus calibrated targets for tomorrow. On Sundays, runs in weekly mode and produces the "who you became this week" report.

All three agents run inside Supabase Edge Functions. API keys never touch the client.

---

## 3. Stack (version pins)

| Layer | Choice | Notes |
|---|---|---|
| Mobile | Expo SDK 55+ / React Native 0.79+ / TypeScript strict | Expo Router for navigation |
| Animation | Reanimated 3, Moti, React Native Skia 2.6.x | **Phase 3 implementation** for Living Kiln scene + streak chart. Skia for charts and custom graphics; Moti for declarative micro-interactions |
| 3D | @react-three/fiber-native + expo-gl | **Phase 8 planned** — upgrades the Kiln Scene from 2D Skia to volumetric 3D. Also onboarding intro, weekly report ritual |
| State | Zustand for client state, React Query for server state | No Redux |
| Backend | Supabase (Postgres, Auth, Edge Functions, Realtime, pg_cron) | Singapore region |
| AI — heavy | Anthropic Claude Sonnet 4.5 | Orchestrator + Reflector |
| AI — light | Groq Llama 3.3 70B (or Gemini 2.5 Flash) | Nudge Agent |
| Notifications | expo-notifications + expo-background-task | Local notifications scheduled via background task |
| Build/Deploy | EAS Build + TestFlight | Cloud builds, no Xcode required |
| Haptics | expo-haptics | On every meaningful interaction |

---

## 4. Project structure

```
kiln/
├── app/                       # Expo Router screens
│   ├── (onboarding)/          # Pre-routine flow
│   ├── (tabs)/                # Main tab navigation
│   │   ├── today.tsx
│   │   ├── dashboard.tsx
│   │   └── routines.tsx
│   └── reflection/[date].tsx  # Daily and weekly reflections
├── components/                # Reusable UI
│   ├── primitives/            # Button, Text, Card — atomic
│   ├── skia/                  # Skia-drawn visuals (charts, streak chains)
│   └── three/                 # 3D scenes
├── lib/                       # Non-UI logic
│   ├── supabase.ts            # Client init
│   ├── notifications.ts       # Schedule + permissions
│   ├── personality.ts         # BFI-10 scoring
│   └── voice.ts               # Helpers for applying voice profile
├── stores/                    # Zustand stores
├── theme/                     # Design tokens
│   ├── colors.ts
│   ├── typography.ts
│   └── spacing.ts
├── supabase/                  # Backend code
│   ├── functions/             # Edge Functions
│   │   ├── generate_routine/
│   │   ├── generate_nudge/
│   │   └── nightly_reflection/
│   └── migrations/            # SQL migrations
├── CLAUDE.md                  # This file
└── DESIGN.md                  # Design system spec
```

---

## 5. Design tokens

```ts
// theme/colors.ts — Living Kiln palette (warm dark, ember-toned)
export const colors = {
  bg: {
    deep: '#0E0906',      // true background — warm near-black, brown undertone
    surface: '#1A1310',   // raised cards, modals
    hot: '#2A1A12',       // surfaces near the kiln glow / hover states
  },
  text: {
    cream: '#F4EEE3',     // primary — warm off-white, never pure white
    dim: '#8A7A6E',       // secondary, metadata
  },
  accent: {
    ember: '#E85D2A',     // primary accent — molten orange, alive
    crimson: '#C73A2D',   // deep accent for emphasis, warnings
    gold: '#E8B14E',      // rare highlight — achievements, weekly synthesis
  },
  border: {
    hairline: '#2A1F18',  // warm hairlines, never gray
  },
  // Time-of-day ember shifts (applied via useTimeOfDay hook)
  ember: {
    morning: '#E85D2A',   // 5 AM – 10 AM
    midday:  '#FF6B2C',   // 10 AM – 4 PM
    evening: '#C73A2D',   // 4 PM – 9 PM
    late:    '#8B2419',   // 9 PM – 5 AM
  },
} as const;

// theme/typography.ts — three-tier serif system
export const type = {
  display: { fontFamily: 'Georgia', fontWeight: '900' as const },
  // ↑ placeholder. Phase 3.5 swaps to PP Editorial New / Tiempos Headline via expo-font
  body: { fontFamily: 'Georgia', fontWeight: '400' as const },
  // ↑ literary serif for habit names, reflection content. Italic by default in habit rows.
  mono: { fontFamily: 'Menlo', fontWeight: '500' as const },
  // ↑ metadata, time labels, micro-text, data digits
  sizes: {
    hero: 96, h1: 56, h2: 32, h3: 22, body: 16, label: 12, micro: 10,
  },
} as const;

// theme/spacing.ts
export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64 } as const;
```

No rounded corners on data containers. `borderRadius: 0` is the default. Buttons may use `borderRadius: 2` max. Hairlines (1px dividers) use `colors.border.hairline` (warm dark), never gray.

---

## 6. Tracked dimensions (the data model lives in supabase/migrations)

KILN tracks more than habits. It tracks the user as a system. The dimensions are:

- **Habits** — discrete actions (gym, study block, sleep window). Boolean + timestamp.
- **DeepWorkHours** — measured focus time, logged via in-app focus session timer.
- **FocusDiscipline** — abstinence streak from chosen distraction patterns. Days since last slip, current streak, time-of-day pattern. Presented numerically, never moralized.
- **Energy** — 1–5 self-report, logged 3x/day.
- **Mood** — single word, free text, logged once per evening.
- **DietAdherence** — boolean per planned meal.
- **SleepWindow** — bedtime + wake time, measured against target window.
- **Reflections** — Reflector output, one per day plus weekly synthesis.

Schema source of truth: supabase/migrations/

---

## 7. Architectural rules (non-negotiable)

1. **No AI API keys on the client.** Ever. Every model call goes through a Supabase Edge Function. The client only knows its Supabase anon key.

2. **Row-level security on every table from day one.** No table ships without an RLS policy. The user can only read/write their own rows.

3. **Edge Functions are stateless.** Persist everything to Postgres. No in-memory caches across invocations.

4. **The Nudge Agent never sees PII beyond the voice profile and current task name.** Don't pipe medical-style details (FocusDiscipline streak) into nudge generation. That's not what cheap nudges are for. Reflector handles sensitive synthesis.

5. **No shame language in any AI output.** The Nudge Agent's system prompt enforces this explicitly. The Reflector observes patterns without judging them.

6. **Local-first for the day view.** The Today screen must render and function offline using AsyncStorage. Sync happens when connection returns. Notifications must fire offline (local notifications, not push).

7. **Every database write is idempotent.** A retry must not double-log a habit completion. Use client-generated UUIDs and `INSERT ... ON CONFLICT DO NOTHING`.

---

## 8. Code conventions

- TypeScript strict mode. No `any`. If you need an escape hatch, use `unknown` and narrow.
- Filenames: `kebab-case.ts` for utilities, `PascalCase.tsx` for components.
- One component per file. Co-locate styles in the file via StyleSheet.create.
- Async functions: explicit return type annotations.
- Imports order: react/react-native → expo → third-party → @/ aliases → relative.
- No default exports for utilities. Default exports allowed for screen components only (Expo Router requires it).

---

## 9. Workflow rules for Claude Code

1. **Plan before acting.** For any request involving more than one file change, output the plan as a numbered list and wait for approval before writing code. Use Claude Code plan mode (`/plan`) for non-trivial work.

2. **Never modify `supabase/migrations/` files that have been applied.** Add a new migration instead.

3. **No new dependencies without surfacing the reason.** When proposing `npm install <package>`, state what it does, why a smaller alternative wasn't picked, and confirm the package is actively maintained.

4. **No SQL changes without a migration file.** All schema changes live in `supabase/migrations/NNNN_description.sql`.

5. **No silent prompt engineering.** Edge Function prompts live in `supabase/functions/<name>/prompt.ts` as a clearly labeled string. Changes to a prompt require a commit message explaining the behavioral diff.

6. **When uncertain about the user's intent, ask one clarifying question before writing code.** Not three. One.

---

## 10. Forbidden patterns

- Streak emoji 🔥. Use a numeric counter only.
- Confetti, fireworks, or any celebration animation. Achievement is shown through restraint.
- Inline AI keys, even temporarily for testing. Use `.env` and Edge Functions.
- Synchronous calls to AI from the client. All AI calls go through Edge Functions with a defined timeout.
- Generic toasts ("Habit completed!"). Use haptic feedback + a numeric update on the source widget.
- Any copy that reads as motivational quote material ("You got this!", "One step at a time"). Direct observation only.

---

## 11. Open decisions (not yet committed)

- Custom font for display type (currently system Georgia placeholder). Candidates: Editorial New, PP Editorial, Times Now.
- Whether to add a "ritual" sound when opening the weekly reflection.
- Whether to expose the Reflector's raw output or a curated subset.

---

## 12. State vocabulary

UI never uses "completed / skipped." Always use the kiln metaphor:

- **FIRED** — habit completed. Display color: ember. Glyph: ✓
- **BANKED** — habit intentionally skipped. No shame. Display color: dim. Glyph: —
- **PENDING** — not yet due or in progress. Display color: cream.
- **COOLED** — missed without action (passed scheduled time, no log). Display color: dim with strikethrough.

---

## 13. Visual patterns

- **Marginalia**: small italic literary-serif text in margins, prefixed with a kiln glyph (small SVG). Used for voice-profile quotes under the next-pending habit. Indent 24pt from main content edge.
- **Period grouping**: habits group by MORNING / MIDDAY / EVENING / LATE. Section header is mono uppercase, left-aligned, with right-aligned mono hour range. 1px hairline below header.
- **Hairlines**: 1px, color `colors.border.hairline`. Never `#333` or any gray.
- **No rounded corners on data containers.** Buttons may use `borderRadius: 2` max. Cards, modal bodies, habit rows: `borderRadius: 0`.

End of CLAUDE.md.
