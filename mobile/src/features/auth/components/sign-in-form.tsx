import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { isApiError } from '@/shared/api';
import { messageFor } from '@/shared/lib/error-messages';
import { Button } from '@/shared/ui/button';
import { TextField } from '@/shared/ui/field';
import { FormError } from '@/shared/ui/form-error';
import { space } from '@/shared/ui/theme';
import { useSignIn } from '../hooks/use-auth';
import { signInSchema } from '../lib/schemas';

export function SignInForm({ onSignedIn }: { onSignedIn: () => void }) {
  const signIn = useSignIn();
  const form = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await signIn.mutateAsync(values);
      onSignedIn();
    } catch (error) {
      form.setError('root', { message: messageFor(isApiError(error) ? error.code : undefined) });
    }
  });

  // the keyboard's return key and the button both submit: only one at a time
  const submit = () => {
    if (!isSubmitting && !signIn.isPending) void onSubmit();
  };

  return (
    <View style={{ gap: space.lg }}>
      <FormError message={errors.root?.message} />
      <Controller
        control={form.control}
        name="email"
        render={({ field }) => (
          <TextField
            label="Email"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.email?.message}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
        )}
      />
      <Controller
        control={form.control}
        name="password"
        render={({ field }) => (
          <TextField
            label="Senha"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.password?.message}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            onSubmitEditing={submit}
          />
        )}
      />
      <Button label="Entrar" loading={signIn.isPending} onPress={submit} />
    </View>
  );
}
