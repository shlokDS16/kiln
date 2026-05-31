// =============================================================================
// HabitRow — single habit line. Two modes:
//
//   1. Today mode (default): tap fires FIRED, long-press fires BANKED.
//      Pulses when isNext; expands with Marginalia (voice quote) when isNext.
//
//   2. Read-only mode (readOnly=true, used by Routines): no internal
//      mutations, no pulsing, no marginalia. Tap calls props.onPress
//      (parent opens the edit modal). Right column shows the duration
//      ("Xm") instead of a status glyph (status is today-specific and
//      meaningless in the Routines list).
//
// Status visuals when status is present (Today mode):
//   FIRED   — ember ✓ glyph,  name slightly desaturated
//   BANKED  — dim   — glyph,  name italic dimmed
//   PENDING — cream · glyph,  name full opacity
//   COOLED  — dim   · glyph,  name strikethrough
// =============================================================================

import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
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

export function HabitRow({ habit, isNext = false, readOnly = false, onPress }: Props) {
  // These hooks must always be called (rules of hooks). They no-op when
  // their inputs are undefined / disabled.
  const logHabit = useLogHabit();
  const quote = useVoiceProfileQuote(isNext && !readOnly ? habit.habit_id : undefined);

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

  const handleTap = () => {
    if (readOnly) {
      onPress?.();
      return;
    }
    if (habit.status === "PENDING" || habit.status === "COOLED") {
      logHabit.mutate({ habit_id: habit.habit_id, status: "FIRED" });
    }
  };
  const handleLongPress = () => {
    if (readOnly) {
      onPress?.();
      return;
    }
    logHabit.mutate({ habit_id: habit.habit_id, status: "BANKED" });
  };

  // Right column content: status glyph (Today) or duration (Routines)
  const rightContent = habit.status
    ? <Text className="font-mono" style={{ fontSize: 14, color: STATUS_GLYPH_COLOR[habit.status], width: 20, textAlign: "right" }}>{STATUS_GLYPH[habit.status]}</Text>
    : <Text className="text-dim font-mono" style={{ fontSize: 11, textAlign: "right", minWidth: 32 }}>{habit.duration_min}m</Text>;

  return (
    <View>
      <Pressable
        onPress={handleTap}
        onLongPress={handleLongPress}
        delayLongPress={350}
        className="flex-row items-center py-3 active:opacity-70"
      >
        <Animated.Text
          className="text-ember font-mono"
          style={[
            { fontSize: 13, width: 56 },
            isNext && !readOnly ? timeStyle : undefined,
          ]}
        >
          {habit.scheduled_time}
        </Animated.Text>

        <View className="flex-1 mr-3">
          <Text className="font-body italic" style={nameStyleFor(habit.status)}>
            {habit.name}
          </Text>
        </View>

        {rightContent}
      </Pressable>

      {isNext && !readOnly && quote.data ? (
        <View className="pb-3">
          <Marginalia text={quote.data} />
        </View>
      ) : null}
    </View>
  );
}

const STATUS_GLYPH: Record<HabitStatus, string> = {
  FIRED:   "✓",
  BANKED:  "—",
  PENDING: "·",
  COOLED:  "·",
};

const STATUS_GLYPH_COLOR: Record<HabitStatus, string> = {
  FIRED:   "#E85D2A",
  BANKED:  "#8A7A6E",
  PENDING: "#F4EEE3",
  COOLED:  "#8A7A6E",
};

function nameStyleFor(status: HabitStatus | undefined) {
  switch (status) {
    case "FIRED":
      return { fontSize: 16, color: "#C4B8A8" };
    case "BANKED":
      return { fontSize: 16, color: "#8A7A6E" };
    case "COOLED":
      return { fontSize: 16, color: "#8A7A6E", textDecorationLine: "line-through" as const };
    case "PENDING":
      return { fontSize: 16, color: "#F4EEE3" };
    default:
      // Read-only / Routines mode — no status, full cream
      return { fontSize: 16, color: "#F4EEE3" };
  }
}
