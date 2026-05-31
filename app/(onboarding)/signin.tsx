// =============================================================================
// Signin â€” near-duplicate of signup, uses signInWithPassword.
// On success: navigate to "/" so the root router decides where to send the
// user (personality if no profile row yet, today if already onboarded).
// =============================================================================

import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { useAuth } from '../../lib/auth-context';

const SigninSchema = z.object({
  email: z.string().email('not a valid email'),
  password: z.string().min(1, 'required'),
});

type SigninFormData = z.infer<typeof SigninSchema>;

export default function Signin() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SigninFormData>({
    resolver: zodResolver(SigninSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: SigninFormData) => {
    setServerError(null);
    setSubmitting(true);
    const { error } = await signIn(data.email, data.password);
    setSubmitting(false);
    if (error) {
      setServerError(error.message);
      return;
    }
    // Root router (`app/index.tsx`) picks the right destination based on
    // whether the user already has a personality_profile row.
    router.replace('/');
  };

  return (
    <View className="flex-1 bg-deep px-5 pb-7 pt-7">
      <View className="flex-1 justify-center">
        <Text className="text-cream font-display font-black mb-6" style={{ fontSize: 32 }}>
          welcome back
        </Text>

        <View className="mb-5">
          <Text className="text-dim font-mono text-micro uppercase tracking-widest mb-2">
            email
          </Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => { setEmailFocused(false); onBlur(); }}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholderTextColor="#8A7A6E"
                className={`text-cream font-mono text-body bg-surface px-4 py-3 border ${emailFocused ? 'border-ember' : 'border-hairline'}`}
              />
            )}
          />
          {errors.email && (
            <Text className="text-ember font-mono text-micro mt-1">{errors.email.message}</Text>
          )}
        </View>

        <View className="mb-5">
          <Text className="text-dim font-mono text-micro uppercase tracking-widest mb-2">
            password
          </Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => { setPasswordFocused(false); onBlur(); }}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
                placeholderTextColor="#8A7A6E"
                className={`text-cream font-mono text-body bg-surface px-4 py-3 border ${passwordFocused ? 'border-ember' : 'border-hairline'}`}
              />
            )}
          />
          {errors.password && (
            <Text className="text-ember font-mono text-micro mt-1">{errors.password.message}</Text>
          )}
        </View>

        {serverError && (
          <Text className="text-ember font-mono text-micro mt-3">{serverError}</Text>
        )}
      </View>

      <View>
        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={submitting}
          className={`border border-ember py-4 active:opacity-60 ${submitting ? 'opacity-50' : ''}`}
        >
          {submitting ? (
            <ActivityIndicator color="#F4EEE3" />
          ) : (
            <Text className="text-cream font-mono text-body text-center uppercase tracking-widest">
              sign in
            </Text>
          )}
        </Pressable>

        <Link href="/(onboarding)/signup" asChild>
          <Pressable className="mt-5 active:opacity-60">
            <Text className="text-dim font-mono text-micro text-center uppercase tracking-widest">
              new here?
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
