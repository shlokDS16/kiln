// =============================================================================
// Root route — the initial routing decision based on auth + onboarding state.
//
// Flow (per runbook Step 2.4):
//   1. loading           → render nothing (auth context still hydrating)
//   2. !session          → /(onboarding)/welcome
//   3. session, no row in personality_profile → /(onboarding)/personality
//   4. session + profile → /(tabs)/today
//
// The personality_profile lookup is RLS-guarded by auth.uid() = user_id, so
// it transparently scopes to the signed-in user; no manual filter needed beyond
// the .eq() (which makes the query a HEAD count, cheaper than a row fetch).
// =============================================================================

import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../lib/auth-context';
import { supabase } from '../lib/supabase';

export default function Index() {
  const { session, loading } = useAuth();
  const [profileExists, setProfileExists] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session?.user) {
      setProfileExists(null);
      return;
    }
    let cancelled = false;
    supabase
      .from('personality_profile')
      .select('user_id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .then(({ count }) => {
        if (!cancelled) setProfileExists((count ?? 0) > 0);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  if (loading || (session && profileExists === null)) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#F5F5F5" />
      </View>
    );
  }

  if (!session) return <Redirect href="/(onboarding)/welcome" />;
  if (!profileExists) return <Redirect href="/(onboarding)/personality" />;
  return <Redirect href="/(tabs)/today" />;
}
