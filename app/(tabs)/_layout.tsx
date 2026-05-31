// =============================================================================
// (tabs) layout â€” three top-level destinations once onboarded.
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
          backgroundColor: '#0E0906',
          borderTopColor: '#2A1F18',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#F4EEE3',
        tabBarInactiveTintColor: '#8A7A6E',
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
