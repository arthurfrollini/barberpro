import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { isApiError } from '@/shared/api';
import { messageFor } from '@/shared/lib/error-messages';
import { Button } from '@/shared/ui/button';
import { TextField } from '@/shared/ui/field';
import { FormError } from '@/shared/ui/form-error';
import { space } from '@/shared/ui/theme';
import { useSignUp } from '../hooks/use-auth';
import { signUpSchema } from '../lib/schemas';

// codes that belong to one field; anything else shows above the form
const FIELD_OF: Record<string, 'name' | 'email' | 'password'> = {
  INVALID_NAME: 'name',
  INVALID_EMAIL: 'email',
  EMAIL_TAKEN: 'email',
  WEAK_PASSWORD: 'password',
};

export function SignUpForm({ onSignedUp }: { onSignedUp: () => void }) {
  const signUp = useSignUp();
  const form = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '' },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await signUp.mutateAsync(values);
      onSignedUp();
    } catch (error) {
      const code = isApiError(error) ? error.code : undefined;
      form.setError((code && FIELD_OF[code]) || 'root', { message: messageFor(code) });
    }
  });

  return (
    <View style={{ gap: space.lg }}>
      <FormError message={errors.root?.message} />
      <Controller
        control={form.control}
        name="name"
        render={({ field }) => (
          <TextField
            label="Nome"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.name?.message}
            autoComplete="name"
            textContentType="name"
          />
        )}
      />
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
            autoComplete="new-password"
            textContentType="newPassword"
            onSubmitEditing={() => void onSubmit()}
          />
        )}
      />
      <Button label="Criar conta" loading={signUp.isPending} onPress={() => void onSubmit()} />
    </View>
  );
}
