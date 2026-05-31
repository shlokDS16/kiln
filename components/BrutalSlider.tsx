// =============================================================================
// BrutalSlider — 0-100 horizontal slider, drawn in plain RN primitives.
//
// Visual rules (CLAUDE.md §1, brutalist neo-editorial):
//   * 1px horizontal track in the primary text color
//   * 12px square thumb, no shadow, no radius, snaps to nothing
//   * Touch the track anywhere to set the value (tap-to-set + drag)
//   * onFirstTouch fires exactly once per slider mount — the parent uses it
//     to know "the user has engaged with this question" (enables NEXT)
//
// NOTE: The runbook calls for a Skia-drawn slider. We're using PanResponder +
// onLayout instead — same visual, no extra deps. When Phase 3 brings Skia in
// for charts, we can swap this for a Skia implementation if needed.
// =============================================================================

import { useRef, useState } from "react";
import { PanResponder, View } from "react-native";

type Props = {
  value: number;                  // 0-100
  onChange: (v: number) => void;
  onFirstTouch?: () => void;
};

const THUMB = 12;
const TRACK_HEIGHT = 48; // touchable strip height — bigger than the visible line for easy hitting

export function BrutalSlider({ value, onChange, onFirstTouch }: Props) {
  const trackRef = useRef<View>(null);
  const [layout, setLayout] = useState({ x: 0, width: 0 });
  const firstTouchFiredRef = useRef(false);

  const apply = (pageX: number) => {
    if (layout.width === 0) return;
    if (!firstTouchFiredRef.current) {
      firstTouchFiredRef.current = true;
      onFirstTouch?.();
    }
    const x = Math.max(0, Math.min(layout.width, pageX - layout.x));
    onChange(Math.round((x / layout.width) * 100));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => apply(e.nativeEvent.pageX),
      onPanResponderMove: (e) => apply(e.nativeEvent.pageX),
    }),
  ).current;

  const thumbLeft = layout.width > 0
    ? (value / 100) * (layout.width - THUMB)
    : 0;

  return (
    <View
      ref={trackRef}
      onLayout={() => {
        trackRef.current?.measure((_x, _y, width, _height, pageX) => {
          setLayout({ x: pageX, width });
        });
      }}
      style={{ height: TRACK_HEIGHT, justifyContent: "center" }}
      {...panResponder.panHandlers}
    >
      {/* visible 1px track */}
      <View className="h-px bg-text" />

      {/* thumb */}
      <View
        style={{
          position: "absolute",
          left: thumbLeft,
          top: (TRACK_HEIGHT - THUMB) / 2,
          width: THUMB,
          height: THUMB,
          backgroundColor: "#F5F5F5",
        }}
      />
    </View>
  );
}
