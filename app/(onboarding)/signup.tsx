// =============================================================================
// Signup — email + password account creation.
//
// react-hook-form drives state; zod validates client-side. On submit, calls
// supabase.auth.signUp via the auth context. Server errors render inline in
// accent red beneath the form. On success, navigates to /personality.
//
// Visual rules:
//   - mono font on inputs and labels
//   - border-accent on focus (1px), border-border at rest (1px)
//   - no border-radius (brutalist default)
//   - labels above inputs in mono micro uppercase tracking-widest
// =============================================================================

import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { useAuth } from '../../lib/auth-context';

const SignupSchema = z.object({
  email: z.string().email('not a valid email'),
  password: z.string().min(8, 'minimum 8 characters'),
});

type SignupFormData = z.infer<typeof SignupSchema>;

export default function Signup() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(SignupSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: SignupFormData) => {
    setServerError(null);
    setSubmitting(true);
    const { error } = await signUp(data.email, data.password);
    setSubmitting(false);
    if (error) {
      setServerError(error.message);
      return;
    }
    router.push('/(onboarding)/personality');
  };

  return (
    <View className="flex-1 bg-bg px-5 pb-7 pt-7">
      <View className="flex-1 justify-center">
        <Text className="text-text font-display font-black mb-6" style={{ fontSize: 32 }}>
          create your account
        </Text>

        {/* email */}
        <View className="mb-5">
          <Text className="text-textDim font-mono text-micro uppercase tracking-widest mb-2">
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
                placeholderTextColor="#737373"
                className={`text-text font-mono text-body bg-surface px-4 py-3 border ${emailFocused ? 'border-accent' : 'border-border'}`}
              />
            )}
          />
          {errors.email && (
            <Text className="text-accent font-mono text-micro mt-1">{errors.email.message}</Text>
          )}
        </View>

        {/* password */}
        <View className="mb-5">
          <Text className="text-textDim font-mono text-micro uppercase tracking-widest mb-2">
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
                autoComplete="new-password"
                placeholderTextColor="#737373"
                className={`text-text font-mono text-body bg-surface px-4 py-3 border ${passwordFocused ? 'border-accent' : 'border-border'}`}
              />
            )}
          />
          {errors.password && (
            <Text className="text-accent font-mono text-micro mt-1">{errors.password.message}</Text>
          )}
        </View>

        {serverError && (
          <Text className="text-accent font-mono text-micro mt-3">{serverError}</Text>
        )}
      </View>

      <View>
        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={submitting}
          className={`border border-accent py-4 active:opacity-60 ${submitting ? 'opacity-50' : ''}`}
        >
          {submitting ? (
            <ActivityIndicator color="#F5F5F5" />
          ) : (
            <Text className="text-text font-mono text-body text-center uppercase tracking-widest">
              create account
            </Text>
          )}
        </Pressable>

        <Link href="/(onboarding)/signin" asChild>
          <Pressable className="mt-5 active:opacity-60">
            <Text className="text-textDim font-mono text-micro text-center uppercase tracking-widest">
              already have an account?
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
