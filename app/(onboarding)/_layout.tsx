// Onboarding stack â€” no headers, no transitions (each screen is its own moment).
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: '#0E0906' },
      }}
    />
  );
}
