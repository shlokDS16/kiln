// =============================================================================
// WheelTimePicker — cinematic editorial time wheel (no third-party deps).
//
// Two snap-scrolling columns (hours 00-23, minutes 00/15/30/45) flanking a
// mono ':'. The center slot is a bg-hot band with hairlines top + bottom; the
// centered numeral animates to ember while neighbours fade via an opacity
// gradient. Pure RN ScrollView + built-in Animated (JS driver so the color
// interpolation works), so it runs on web preview AND iOS.
//
// Geometry: CELL=48, 5 cells visible (height 240), 2-cell padding (96) top and
// bottom so the first/last value can reach the center slot. selectedIndex =
// round(scrollY / CELL).
// =============================================================================

import { useEffect, useRef } from "react";
import { Animated, ScrollView, Text, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

const CELL = 48;
const VISIBLE = 5;
const HEIGHT = CELL * VISIBLE; // 240
const PAD = CELL * 2;          // 96 — lets the first/last value reach center

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0..23
const MINUTES = [0, 15, 30, 45];

const EMBER = "#E85D2A";
const DIM = "#8A7A6E";

export type TimeValue = { h: number; m: number };

type Props = {
  value: TimeValue;
  onChange: (next: TimeValue) => void;
};

export function WheelTimePicker({ value, onChange }: Props) {
  return (
    <View
      style={{
        height: HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* center selection band — bg-hot with hairlines, behind the numerals */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: PAD,
          left: 0,
          right: 0,
          height: CELL,
          backgroundColor: "#2A1A12",
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: "#2A1F18",
        }}
      />

      <WheelColumn
        data={HOURS}
        selected={value.h}
        onSelect={(h) => onChange({ h, m: value.m })}
      />

      <Text style={{ fontFamily: "Menlo", fontSize: 24, color: DIM, marginHorizontal: 6, fontStyle: "italic" }}>
        :
      </Text>

      <WheelColumn
        data={MINUTES}
        selected={value.m}
        onSelect={(m) => onChange({ h: value.h, m })}
      />
    </View>
  );
}

function WheelColumn({
  data,
  selected,
  onSelect,
}: {
  data: number[];
  selected: number;
  onSelect: (v: number) => void;
}) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const ref = useRef<ScrollView>(null);

  const selectedIndex = Math.max(0, data.indexOf(selected));

  // Position at the selected value on mount + when it changes externally.
  useEffect(() => {
    ref.current?.scrollTo({ y: selectedIndex * CELL, animated: false });
    scrollY.setValue(selectedIndex * CELL);
  }, [selectedIndex, scrollY]);

  const settle = (y: number) => {
    const idx = Math.min(Math.max(Math.round(y / CELL), 0), data.length - 1);
    ref.current?.scrollTo({ y: idx * CELL, animated: true });
    onSelect(data[idx]);
  };

  return (
    <ScrollView
      ref={ref}
      style={{ width: 64, height: HEIGHT }}
      showsVerticalScrollIndicator={false}
      snapToInterval={CELL}
      snapToAlignment="center"
      decelerationRate="fast"
      scrollEventThrottle={16}
      contentContainerStyle={{ paddingVertical: PAD }}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: false },
      )}
      onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) =>
        settle(e.nativeEvent.contentOffset.y)
      }
      onScrollEndDrag={(e: NativeSyntheticEvent<NativeScrollEvent>) =>
        settle(e.nativeEvent.contentOffset.y)
      }
    >
      {data.map((v, i) => {
        const opacity = scrollY.interpolate({
          inputRange: [(i - 2) * CELL, (i - 1) * CELL, i * CELL, (i + 1) * CELL, (i + 2) * CELL],
          outputRange: [0.3, 0.6, 1, 0.6, 0.3],
          extrapolate: "clamp",
        });
        const color = scrollY.interpolate({
          inputRange: [(i - 1) * CELL, i * CELL, (i + 1) * CELL],
          outputRange: [DIM, EMBER, DIM],
          extrapolate: "clamp",
        });
        return (
          <View key={v} style={{ height: CELL, alignItems: "center", justifyContent: "center" }}>
            <Animated.Text style={{ fontFamily: "Menlo", fontSize: 24, opacity, color }}>
              {String(v).padStart(2, "0")}
            </Animated.Text>
          </View>
        );
      })}
    </ScrollView>
  );
}
