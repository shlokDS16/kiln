// =============================================================================
// KilnHero — the signature element. 380pt full-bleed image header that
// reflects the user's heat (% of today's habits FIRED) through:
//
//   1. A heat-bucket image cross-fade (assets/kiln/{banked..forging}.jpg)
//   2. A Ken Burns subtle zoom (1.0 → 1.02 over 20 s, reverse, loop)
//   3. A Skia overlay with 10 ember spark particles drifting upward
//   4. Marginalia text top-right: "fornax · day {roman} · {heat}% heat"
//
// Bucket mapping (heatLevel 0-100):
//   0–20   → banked
//   21–40  → warming
//   41–60  → steady
//   61–80  → intense
//   81–100 → forging
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { Image, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Canvas, Circle } from "@shopify/react-native-skia";

import { toRoman } from "../lib/roman";

type Bucket = "banked" | "warming" | "steady" | "intense" | "forging";

const IMAGES: Record<Bucket, ReturnType<typeof require>> = {
  banked:  require("../assets/kiln/banked.jpg"),
  warming: require("../assets/kiln/warming.jpg"),
  steady:  require("../assets/kiln/steady.jpg"),
  intense: require("../assets/kiln/intense.jpg"),
  forging: require("../assets/kiln/forging.jpg"),
};

function bucketForHeat(heat: number): Bucket {
  if (heat < 21) return "banked";
  if (heat < 41) return "warming";
  if (heat < 61) return "steady";
  if (heat < 81) return "intense";
  return "forging";
}

const HEIGHT = 380;
const PARTICLE_COUNT = 10;

type Props = {
  heatLevel: number;   // 0–100
  streakDays: number;
};

export function KilnHero({ heatLevel, streakDays }: Props) {
  const bucket = bucketForHeat(heatLevel);
  const [renderedBucket, setRenderedBucket] = useState<Bucket>(bucket);
  const [prevBucket, setPrevBucket] = useState<Bucket | null>(null);
  const fadeNew = useSharedValue(1);

  // Cross-fade when heat bucket changes
  useEffect(() => {
    if (bucket !== renderedBucket) {
      setPrevBucket(renderedBucket);
      setRenderedBucket(bucket);
      fadeNew.value = 0;
      fadeNew.value = withTiming(1, { duration: 600 }, () => {
        // After fade completes, drop the prev layer
        // (state set in a follow-up effect because reanimated callbacks can't setState)
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket]);

  useEffect(() => {
    if (prevBucket !== null) {
      const id = setTimeout(() => setPrevBucket(null), 700);
      return () => clearTimeout(id);
    }
  }, [prevBucket]);

  // Ken Burns zoom (1.0 → 1.02 → 1.0 over 40 s)
  const zoom = useSharedValue(1);
  useEffect(() => {
    zoom.value = 1;
    zoom.value = withRepeat(
      withTiming(1.02, { duration: 20_000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [zoom]);

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [{ scale: zoom.value }],
  }));
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeNew.value }));

  const heatPct = Math.round(heatLevel);
  const dayRoman = toRoman(Math.max(1, streakDays));

  return (
    <View style={{ height: HEIGHT, overflow: "hidden", backgroundColor: "#0E0906" }}>
      {/* Previous bucket layer (fades out underneath) */}
      {prevBucket ? (
        <Animated.View style={[{ ...StyleAbs, height: HEIGHT }, zoomStyle]}>
          <Image
            source={IMAGES[prevBucket]}
            style={{ width: "100%", height: HEIGHT }}
            resizeMode="cover"
          />
        </Animated.View>
      ) : null}

      {/* Current bucket layer (fades in) */}
      <Animated.View style={[{ ...StyleAbs, height: HEIGHT }, zoomStyle, fadeStyle]}>
        <Image
          source={IMAGES[renderedBucket]}
          style={{ width: "100%", height: HEIGHT }}
          resizeMode="cover"
        />
      </Animated.View>

      {/* Skia ember particles overlay */}
      <View style={{ ...StyleAbs, height: HEIGHT }} pointerEvents="none">
        <EmberParticles />
      </View>

      {/* Marginalia top-right */}
      <View
        style={{
          position: "absolute",
          top: 16,
          right: 16,
        }}
        pointerEvents="none"
      >
        <Text
          className="text-cream font-mono italic"
          style={{ fontSize: 10, opacity: 0.7 }}
        >
          {`fornax · day ${dayRoman} · ${heatPct}% heat`}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Particles
// ---------------------------------------------------------------------------

const SCREEN_WIDTH_GUESS = 400; // we don't measure — overdraw is fine
const EMBER_COLOR = "#E85D2A";

function EmberParticles() {
  // Pre-compute per-particle constants
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        x: 24 + ((i * 47) % (SCREEN_WIDTH_GUESS - 48)),
        r: 1.2 + ((i * 13) % 7) / 5, // 1.2 – 2.6
        cycleMs: 6000 + (i * 700) % 4000, // 6-10 s
        delayMs: i * 380,
      })),
    [],
  );

  return (
    <Canvas style={{ flex: 1 }}>
      {particles.map((p, i) => (
        <Particle key={i} {...p} />
      ))}
    </Canvas>
  );
}

function Particle({
  x,
  r,
  cycleMs,
  delayMs,
}: {
  x: number;
  r: number;
  cycleMs: number;
  delayMs: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      delayMs,
      withRepeat(withTiming(1, { duration: cycleMs, easing: Easing.linear }), -1, false),
    );
  }, [progress, cycleMs, delayMs]);

  // y: bottom (HEIGHT + 10) → top (-10)
  // opacity: fade in 0→1 in first 20%, fade out 1→0 in last 30%
  // Skia 2.x accepts Reanimated shared values via its derived value system on cx/cy/opacity props.
  // For simplicity we pass numbers — recomputed via inline derived values.

  return (
    <AnimatedCircle progress={progress} x={x} r={r} />
  );
}

// Internal component that bridges Reanimated → Skia by reading progress on render
function AnimatedCircle({
  progress,
  x,
  r,
}: {
  progress: ReturnType<typeof useSharedValue<number>>;
  x: number;
  r: number;
}) {
  // We render Circle with values derived inside an animated style on a wrapper View
  // (Skia 2.4 supports useDerivedValue but the simplest cross-platform approach
  // is to drive opacity/transform on a wrapping <Animated.View> outside the Canvas.)
  //
  // For now: emit a static Circle at a midpoint and animate via Reanimated style
  // on a wrapping Canvas — keeps the implementation simple. Phase 4 polish can
  // switch to Skia useDerivedValue for true per-frame draws.

  const wrapStyle = useAnimatedStyle(() => {
    const cy = HEIGHT + 10 - progress.value * (HEIGHT + 40);
    const opacity =
      progress.value < 0.2
        ? progress.value / 0.2
        : progress.value > 0.7
          ? 1 - (progress.value - 0.7) / 0.3
          : 1;
    return {
      position: "absolute",
      transform: [{ translateY: cy - HEIGHT / 2 }],
      opacity,
    };
  });

  return (
    <Animated.View style={wrapStyle} pointerEvents="none">
      <Canvas style={{ width: r * 2 + 4, height: r * 2 + 4, position: "absolute", left: x - r - 2 }}>
        <Circle cx={r + 2} cy={r + 2} r={r} color={EMBER_COLOR} />
      </Canvas>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
const StyleAbs = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
} as const;
