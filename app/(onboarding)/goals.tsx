// =============================================================================
// Goals â€” three multi-line text inputs that capture the user's
// goals / non-negotiables / current pain. Pressing SYNTHESIZE:
//   1. Scores the BFI-10 sliders into the five Big Five averages
//   2. POSTs scores + free-text to the generate_routine Edge Function
//   3. Stores the Gemini response in the onboarding store
//   4. Navigates to /routine-preview
//
// Field labels are intentional brand copy â€” do not soften them.
// =============================================================================

import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../../lib/auth-context";
import { scoreBfi } from "../../lib/bfi";
import {
  useOnboardingStore,
  type OrchestratorResponse,
} from "../../stores/onboarding-store";

export default function Goals() {
  const router = useRouter();
  const { session } = useAuth();
  const {
    responses,
    goals,
    nonNegotiables,
    currentPain,
    setGoals,
    setNonNegotiables,
    setCurrentPain,
    setOrchestratorResponse,
  } = useOnboardingStore();

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const onSynthesize = async () => {
    setServerError(null);

    if (!goals.trim() || !nonNegotiables.trim() || !currentPain.trim()) {
      setServerError("all three fields are required");
      return;
    }
    if (!session?.access_token) {
      setServerError("not signed in");
      return;
    }

    setSubmitting(true);
    try {
      const scores = scoreBfi(responses);
      const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate_routine`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personality_scores: scores,
          goals,
          non_negotiables: nonNegotiables,
          current_pain: currentPain,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `${res.status}`);
      }

      const data: OrchestratorResponse = await res.json();
      setOrchestratorResponse(data);
      router.push("/(onboarding)/routine-preview");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "something went wrong";
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-deep"
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 48, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
    >
      <Field
        label="WHAT YOU'RE CHASING"
        value={goals}
        onChange={setGoals}
      />
      <Field
        label="WHAT YOU REFUSE TO TRADE"
        value={nonNegotiables}
        onChange={setNonNegotiables}
      />
      <Field
        label="WHERE YOU'RE LEAKING"
        value={currentPain}
        onChange={setCurrentPain}
      />

      {serverError && (
        <Text className="text-ember font-mono text-micro mb-3">
          {serverError}
        </Text>
      )}

      <Pressable
        onPress={onSynthesize}
        disabled={submitting}
        className={`border border-ember py-4 active:opacity-60 ${submitting ? "opacity-50" : ""}`}
      >
        {submitting ? (
          <ActivityIndicator color="#F4EEE3" />
        ) : (
          <Text className="text-cream font-mono text-body text-center uppercase tracking-widest">
            synthesize
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View className="mb-6">
      <Text className="text-dim font-mono text-micro uppercase tracking-widest mb-2">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        multiline
        maxLength={500}
        className={`text-cream font-mono text-body bg-surface px-4 py-3 border ${focused ? "border-ember" : "border-hairline"}`}
        style={{ minHeight: 110, textAlignVertical: "top" }}
      />
    </View>
  );
}
