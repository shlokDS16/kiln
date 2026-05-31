// =============================================================================
// (tabs) layout — three top-level destinations once onboarded.
// Tab bar labels are mono micro tracking-widest, matching the rest of KILN.
// Phase 3 swaps these screens for the real Today / Dashboard / Routines builds.
// =============================================================================

import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0A0A0A',
          borderTopColor: '#1F1F1F',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#F5F5F5',
        tabBarInactiveTintColor: '#737373',
        tabBarLabelStyle: {
          fontFamily: 'Menlo',
          fontSize: 10,
          letterSpacing: 2,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen name="today"     options={{ tabBarLabel: 'today' }} />
      <Tabs.Screen name="dashboard" options={{ tabBarLabel: 'dashboard' }} />
      <Tabs.Screen name="routines"  options={{ tabBarLabel: 'routines' }} />
    </Tabs>
  );
}
