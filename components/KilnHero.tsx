// =============================================================================
// KilnHero — the signature element. 380pt full-bleed image header that
// reflects the user's heat (% of today's habits FIRED) through:
//
//   1. A heat-bucket image cross-fade (assets/kiln/{banked..forging}.jpg)
//   2. A Ken Burns subtle zoom (1.0 -> 1.02 over 20s, reverse, loop)
//   3. A SINGLE Skia Canvas with 10 ember particles drifting upward,
//      animated entirely on the UI thread (no per-frame JS).
//   4. Marginalia text top-right: "fornax · day {roman} · {heat}% heat"
//
// Bucket mapping (heatLevel 0-100):
//   0–20 banked / 21–40 warming / 41–60 steady / 61–80 intense / 81–100 forging
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { Dimensions, Image, Text, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { Blur, Canvas, Circle, Group, Paint } from "@shopify/react-native-skia";

import { toRoman } from "../lib/roman";

type Bucket = "banked" | "warming" | "steady" | "intense" | "forging";

const IMAGES: Record<Bucket, ImageSourcePropType> = {
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
const EMBER_COLOR = "#E85D2A";
const WIDTH = Dimensions.get("window").width;
const TRAVEL = HEIGHT + 40; // start just below the frame, exit just above it

type Props = {
  heatLevel: number; // 0-100
  streakDays: number;
};

export function KilnHero({ heatLevel, streakDays }: Props) {
  const bucket = bucketForHeat(heatLevel);
  const [renderedBucket, setRenderedBucket] = useState<Bucket>(bucket);
  const [prevBucket, setPrevBucket] = useState<Bucket | null>(null);
  const fadeNew = useSharedValue(1);

  // Cross-fade when the heat bucket changes
  useEffect(() => {
    if (bucket !== renderedBucket) {
      setPrevBucket(renderedBucket);
      setRenderedBucket(bucket);
      fadeNew.value = 0;
      fadeNew.value = withTiming(1, { duration: 600 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket]);

  useEffect(() => {
    if (prevBucket !== null) {
      const id = setTimeout(() => setPrevBucket(null), 700);
      return () => clearTimeout(id);
    }
  }, [prevBucket]);

  // Ken Burns zoom (1.0 -> 1.02 -> 1.0 over 40s)
  const zoom = useSharedValue(1);
  useEffect(() => {
    zoom.value = 1;
    zoom.value = withRepeat(
      withTiming(1.02, { duration: 20_000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [zoom]);

  const zoomStyle = useAnimatedStyle(() => ({ transform: [{ scale: zoom.value }] }));
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeNew.value }));

  const heatPct = Math.round(heatLevel);
  const dayRoman = toRoman(Math.max(1, streakDays));

  return (
    <View style={{ height: HEIGHT, overflow: "hidden", backgroundColor: "#0E0906" }}>
      {prevBucket ? (
        <Animated.View style={[STYLE_ABS, zoomStyle]}>
          <Image source={IMAGES[prevBucket]} style={{ width: "100%", height: HEIGHT }} resizeMode="cover" />
        </Animated.View>
      ) : null}

      <Animated.View style={[STYLE_ABS, zoomStyle, fadeStyle]}>
        <Image source={IMAGES[renderedBucket]} style={{ width: "100%", height: HEIGHT }} resizeMode="cover" />
      </Animated.View>

      {/* Single Skia Canvas — all 10 embers, animated on the UI thread */}
      <View style={STYLE_ABS} pointerEvents="none">
        <EmberField />
      </View>

      {/* Marginalia top-right */}
      <View style={{ position: "absolute", top: 16, right: 16 }} pointerEvents="none">
        <Text className="text-cream font-mono italic" style={{ fontSize: 10, opacity: 0.7 }}>
          {`fornax · day ${dayRoman} · ${heatPct}% heat`}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Embers — ONE Canvas, ten particles, zero per-frame JS.
// A shared clock (advanced by useFrameCallback on the UI thread) drives each
// particle's derived cy / radius / opacity / x; Skia reads the derived values.
// ---------------------------------------------------------------------------

type EmberConfig = { speed: number; baseR: number; phase: number; seed: number };

function EmberField() {
  const clock = useSharedValue(0);
  useFrameCallback((info) => {
    "worklet";
    clock.value = info.timeSinceFirstFrame; // ms, UI thread
  });

  const configs = useMemo<EmberConfig[]>(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        speed: 5 + ((i * 37) % 100) / 10, // 5.0–14.9 px/s
        baseR: 1.3 + ((i * 13) % 7) / 5,  // 1.3–2.7 px
        phase: (i * 53) % TRAVEL,         // stagger so they don't rise in unison
        seed: i * 7 + 1,
      })),
    [],
  );

  return (
    <Canvas style={{ flex: 1 }}>
      <Group layer={<Paint><Blur blur={2} /></Paint>}>
        {configs.map((cfg, i) => (
          <Ember key={i} clock={clock} cfg={cfg} />
        ))}
      </Group>
    </Canvas>
  );
}

// Worklet-safe pseudo-random in [0,1)
function rand(n: number): number {
  "worklet";
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

function Ember({ clock, cfg }: { clock: SharedValue<number>; cfg: EmberConfig }) {
  const dist = useDerivedValue(() => (clock.value / 1000) * cfg.speed + cfg.phase);
  const progress = useDerivedValue(() => (dist.value % TRAVEL) / TRAVEL); // 0..1

  const cy = useDerivedValue(() => HEIGHT + 10 - progress.value * TRAVEL);
  const opacity = useDerivedValue(() => 0.8 * (1 - progress.value));        // 0.8 -> 0
  const r = useDerivedValue(() => cfg.baseR * (1 - 0.7 * progress.value));  // 1.0x -> 0.3x
  const cx = useDerivedValue(() => {
    const cycle = Math.floor(dist.value / TRAVEL); // changes each loop -> new x
    return 24 + rand(cfg.seed + cycle) * (WIDTH - 48);
  });

  return <Circle cx={cx} cy={cy} r={r} color={EMBER_COLOR} opacity={opacity} />;
}

const STYLE_ABS = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  height: HEIGHT,
};
