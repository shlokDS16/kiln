// =============================================================================
// Personality — 10 BFI-10 questions, one per full-screen page.
//
// Implementation: horizontal pagingEnabled FlatList. Swipe to advance, or tap
// NEXT (enabled only after the slider for the current question has been
// touched at least once). On the final page NEXT navigates to /goals.
// Responses go into the Zustand onboarding store, scored later in goals.tsx.
//
// The 10 questions live in lib/bfi.ts (see scoring notes there).
// =============================================================================

import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { BrutalSlider } from "../../components/BrutalSlider";
import { QUESTIONS } from "../../lib/bfi";
import { useOnboardingStore } from "../../stores/onboarding-store";

export default function Personality() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
  const [touched, setTouched] = useState<Set<number>>(new Set());

  const responses = useOnboardingStore((s) => s.responses);
  const setResponse = useOnboardingStore((s) => s.setResponse);

  const goNext = () => {
    if (index < QUESTIONS.length - 1) {
      const next = index + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setIndex(next);
    } else {
      router.push("/(onboarding)/goals");
    }
  };

  return (
    <FlatList
      ref={flatListRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      data={QUESTIONS}
      keyExtractor={(item) => String(item.idx)}
      onMomentumScrollEnd={(e) => {
        const i = Math.round(e.nativeEvent.contentOffset.x / width);
        setIndex(i);
      }}
      getItemLayout={(_data, i) => ({ length: width, offset: width * i, index: i })}
      renderItem={({ item }) => {
        const enabled = touched.has(item.idx);
        const isLast = item.idx === QUESTIONS.length - 1;
        return (
          <View style={{ width }} className="bg-bg px-5 pt-7 pb-7">
            <View className="flex-1">
              {/* counter — top-left */}
              <Text className="text-textDim font-mono text-micro uppercase tracking-widest">
                {String(item.idx + 1).padStart(2, "0")} / {String(QUESTIONS.length).padStart(2, "0")}
              </Text>

              {/* question + slider */}
              <View className="flex-1 justify-center">
                <Text
                  className="text-text font-display font-black mb-7"
                  style={{ fontSize: 28, lineHeight: 34 }}
                >
                  {item.statement}
                </Text>

                <BrutalSlider
                  value={responses[item.idx] ?? 50}
                  onChange={(v) => setResponse(item.idx, v)}
                  onFirstTouch={() =>
                    setTouched((prev) => {
                      const next = new Set(prev);
                      next.add(item.idx);
                      return next;
                    })
                  }
                />
                <View className="flex-row justify-between mt-2">
                  <Text className="text-textDim font-mono text-micro uppercase tracking-widest">
                    not me
                  </Text>
                  <Text className="text-textDim font-mono text-micro uppercase tracking-widest">
                    exactly me
                  </Text>
                </View>
              </View>

              {/* NEXT */}
              <Pressable
                onPress={goNext}
                disabled={!enabled}
                className={`border border-accent py-4 active:opacity-60 ${enabled ? "" : "opacity-30"}`}
              >
                <Text className="text-text font-mono text-body text-center uppercase tracking-widest">
                  {isLast ? "continue" : "next"}
                </Text>
              </Pressable>
            </View>
          </View>
        );
      }}
    />
  );
}
