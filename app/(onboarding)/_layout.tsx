// Onboarding stack — no headers, no transitions (each screen is its own moment).
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: '#0A0A0A' },
      }}
    />
  );
}
