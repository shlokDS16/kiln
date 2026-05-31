// Stub — Phase 3 builds the real Today screen (the screen you'll see 30 times a day).
import { Text, View } from 'react-native';

export default function Today() {
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <Text className="text-text font-display font-black" style={{ fontSize: 48 }}>
        TODAY
      </Text>
    </View>
  );
}
