// =============================================================================
// HabitRow — single habit line.
//   Today mode: swipe right -> FIRED, swipe left -> BANKED (tap = FIRE,
//     long-press = BANK still work). Pulses + Marginalia when isNext.
//   Read-only (Routines): tap calls onPress (edit). No swipe.
//
// Swipe: Gesture.Pan() translates the row with the finger over an opaque bg;
// behind it an ember (FIRE) / dim (BANK) layer fades in. Past 40% of row width
// -> medium haptic; on release past 40% the row slides off and the mutation
// fires, otherwise it springs back. activeOffsetX lets taps + vertical scroll
// pass straight through to the Pressable.
// =============================================================================

import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useLogHabit } from "../lib/hooks/use-log-habit";
import { useVoiceProfileQuote } from "../lib/hooks/use-voice-profile-quote";
import type { HabitDimension, HabitStatus } from "../lib/hooks/types";
import { Marginalia } from "./Marginalia";

type Props = {
  habit: {
    habit_id: string;
    name: string;
    dimension: HabitDimension;
    scheduled_time: string;
    duration_min: number;
    status?: HabitStatus;
  };
  isNext?: boolean;
  readOnly?: boolean;
  onPress?: () => void;
};

const THRESHOLD = 0.4; // fraction of row width that commits a swipe

export function HabitRow({ habit, isNext = false, readOnly = false, onPress }: Props) {
  const logHabit = useLogHabit();
  const quote = useVoiceProfileQuote(isNext && !readOnly ? habit.habit_id : undefined);

  // isNext time-pulse (unchanged)
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (isNext && !readOnly) {
      pulse.value = 1;
      pulse.value = withRepeat(withTiming(0.55, { duration: 1000 }), -1, true);
    } else {
      pulse.value = 1;
    }
  }, [isNext, readOnly, pulse]);
  const timeStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  // Swipe state
  const translateX = useSharedValue(0);
  const rowWidth = useSharedValue(0);
  const crossed = useSharedValue(false);

  const fire = () => {
    if (habit.status === "PENDING" || habit.status === "COOLED") {
      logHabit.mutate({ habit_id: habit.habit_id, status: "FIRED" });
    }
  };
  const bank = () => {
    logHabit.mutate({ habit_id: habit.habit_id, status: "BANKED" });
  };
  const tick = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const handleTap = () => {
    if (readOnly) { onPress?.(); return; }
    if (habit.status === "PENDING" || habit.status === "COOLED") {
      logHabit.mutate({ habit_id: habit.habit_id, status: "FIRED" });
    }
  };
  const handleLongPress = () => {
    if (readOnly) { onPress?.(); return; }
    logHabit.mutate({ habit_id: habit.habit_id, status: "BANKED" });
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12]) // only horizontal drags activate; taps/scroll pass through
    .onUpdate((e) => {
      translateX.value = e.translationX;
      const w = rowWidth.value || 1;
      const past = Math.abs(e.translationX) >= w * THRESHOLD;
      if (past && !crossed.value) {
        crossed.value = true;
        runOnJS(tick)();
      } else if (!past && crossed.value) {
        crossed.value = false;
      }
    })
    .onEnd((e) => {
      const w = rowWidth.value || 1;
      if (e.translationX >= w * THRESHOLD) {
        translateX.value = withTiming(w, { duration: 160 }, (done) => {
          if (done) { runOnJS(fire)(); translateX.value = 0; }
        });
      } else if (e.translationX <= -w * THRESHOLD) {
        translateX.value = withTiming(-w, { duration: 160 }, (done) => {
          if (done) { runOnJS(bank)(); translateX.value = 0; }
        });
      } else {
        translateX.value = withSpring(0, { damping: 18, stiffness: 200 });
      }
      crossed.value = false;
    });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  const fireReveal = useAnimatedStyle(() => {
    const w = rowWidth.value || 1;
    return { opacity: Math.min(Math.max(translateX.value / (w * THRESHOLD), 0), 1) };
  });
  const bankReveal = useAnimatedStyle(() => {
    const w = rowWidth.value || 1;
    return { opacity: Math.min(Math.max(-translateX.value / (w * THRESHOLD), 0), 1) };
  });

  const rightContent = habit.status
    ? <Text className="font-mono" style={{ fontSize: 14, color: STATUS_GLYPH_COLOR[habit.status], width: 20, textAlign: "right" }}>{STATUS_GLYPH[habit.status]}</Text>
    : <Text className="text-dim font-mono" style={{ fontSize: 11, textAlign: "right", minWidth: 32 }}>{habit.duration_min}m</Text>;

  const rowInner = (
    <Pressable
      onPress={handleTap}
      onLongPress={handleLongPress}
      delayLongPress={350}
      className="flex-row items-center py-3 active:opacity-70"
    >
      <Animated.Text
        className="text-ember font-mono"
        style={[{ fontSize: 13, width: 56 }, isNext && !readOnly ? timeStyle : undefined]}
      >
        {habit.scheduled_time}
      </Animated.Text>
      <View className="flex-1 mr-3">
        <Text className="font-body italic" style={nameStyleFor(habit.status)}>{habit.name}</Text>
      </View>
      {rightContent}
    </Pressable>
  );

  return (
    <View>
      {readOnly ? (
        rowInner
      ) : (
        <View
          style={{ overflow: "hidden" }}
          onLayout={(e) => { rowWidth.value = e.nativeEvent.layout.width; }}
        >
          {/* reveal layers behind the translating row */}
          <Animated.View pointerEvents="none" style={[REVEAL, { backgroundColor: "#E85D2A", alignItems: "flex-start" }, fireReveal]}>
            <Text style={REVEAL_LABEL}>FIRE</Text>
          </Animated.View>
          <Animated.View pointerEvents="none" style={[REVEAL, { backgroundColor: "#8A7A6E", alignItems: "flex-end" }, bankReveal]}>
            <Text style={REVEAL_LABEL}>BANK</Text>
          </Animated.View>
          <GestureDetector gesture={pan}>
            <Animated.View style={[{ backgroundColor: "#0E0906" }, rowStyle]}>
              {rowInner}
            </Animated.View>
          </GestureDetector>
        </View>
      )}

      {isNext && !readOnly && quote.data ? (
        <View className="pb-3">
          <Marginalia text={quote.data} />
        </View>
      ) : null}
    </View>
  );
}

const REVEAL = {
  position: "absolute" as const,
  top: 0, left: 0, right: 0, bottom: 0,
  justifyContent: "center" as const,
  paddingHorizontal: 16,
};
const REVEAL_LABEL = { fontFamily: "Menlo", fontSize: 12, letterSpacing: 2, color: "#0E0906" } as const;

const STATUS_GLYPH: Record<HabitStatus, string> = {
  FIRED: "✓", BANKED: "—", PENDING: "·", COOLED: "·",
};
const STATUS_GLYPH_COLOR: Record<HabitStatus, string> = {
  FIRED: "#E85D2A", BANKED: "#8A7A6E", PENDING: "#F4EEE3", COOLED: "#8A7A6E",
};
function nameStyleFor(status: HabitStatus | undefined) {
  switch (status) {
    case "FIRED": return { fontSize: 16, color: "#C4B8A8" };
    case "BANKED": return { fontSize: 16, color: "#8A7A6E" };
    case "COOLED": return { fontSize: 16, color: "#8A7A6E", textDecorationLine: "line-through" as const };
    case "PENDING": return { fontSize: 16, color: "#F4EEE3" };
    default: return { fontSize: 16, color: "#F4EEE3" };
  }
}
