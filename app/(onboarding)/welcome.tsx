// =============================================================================
// Welcome — onboarding entry. Black background, KILN at 120pt, brutalist
// "BEGIN" button anchored at the bottom. The first impression of the app.
// =============================================================================

import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export default function Welcome() {
  return (
    <View className="flex-1 bg-bg px-5 pb-7 pt-7">
      {/* Centered content: KILN + tagline */}
      <View className="flex-1 items-center justify-center">
        <Text
          className="text-text font-display font-black text-center"
          style={{ fontSize: 120, lineHeight: 120 }}
        >
          KILN
        </Text>
        <Text
          className="text-textDim font-body text-center mt-5"
          style={{ fontSize: 32, lineHeight: 36 }}
        >
          becoming, measured.
        </Text>
      </View>

      {/* BEGIN — bottom-anchored, full width, 1px accent border, no radius */}
      <Link href="/(onboarding)/signup" asChild>
        <Pressable className="border border-accent py-4 active:opacity-60">
          <Text className="text-text font-mono text-body text-center uppercase tracking-widest">
            BEGIN
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}
