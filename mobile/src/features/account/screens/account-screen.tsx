import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';
import { SignedOut } from '@/features/auth/components/signed-out';
import { useIsSignedIn, useMe, useSignOut } from '@/features/auth/hooks/use-auth';
import { nameSchema } from '@/features/auth/lib/schemas';
import { isApiError } from '@/shared/api';
import { messageFor } from '@/shared/lib/error-messages';
import { Button } from '@/shared/ui/button';
import { TextField } from '@/shared/ui/field';
import { FormError } from '@/shared/ui/form-error';
import { Screen } from '@/shared/ui/screen';
import { ErrorState, LoadingState } from '@/shared/ui/states';
import { Text } from '@/shared/ui/text';
import { colors, hairline, space } from '@/shared/ui/theme';
import { useUpdateName } from '../hooks/use-account';

export function AccountScreen() {
  const signedIn = useIsSignedIn();
  return (
    <Screen edges={['top', 'left', 'right']}>
      <Text variant="title">Conta</Text>
      {signedIn ? (
        <Account />
      ) : (
        <SignedOut
          title="Entre para ver sua conta"
          body="Com uma conta você agenda, cancela e remarca seus horários."
          back="/conta"
        />
      )}
    </Screen>
  );
}

function Account() {
  const me = useMe();
  const signOut = useSignOut();
  if (me.isPending) return <LoadingState />;
  if (me.isError) return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;
  return (
    <View style={styles.stack}>
      <View style={styles.row}>
        <Text variant="muted">Email</Text>
        <Text>{me.data.email}</Text>
      </View>
      <NameForm name={me.data.name} />
      <View style={styles.separator} />
      <Button label="Sair" variant="danger" onPress={signOut} />
    </View>
  );
}

const schema = z.object({ name: nameSchema });

function NameForm({ name }: { name: string }) {
  const update = useUpdateName();
  const [saved, setSaved] = useState(false);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { name } });
  const { errors, isDirty } = form.formState;

  useEffect(() => form.reset({ name }), [form, name]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSaved(false);
    try {
      await update.mutateAsync(values.name);
      setSaved(true);
    } catch (error) {
      form.setError('root', { message: messageFor(isApiError(error) ? error.code : undefined) });
    }
  });

  return (
    <View style={styles.stack}>
      <FormError message={errors.root?.message} />
      <Controller
        control={form.control}
        name="name"
        render={({ field }) => (
          <TextField
            label="Nome"
            value={field.value}
            onChangeText={(text) => {
              setSaved(false);
              field.onChange(text);
            }}
            onBlur={field.onBlur}
            error={errors.name?.message}
            autoComplete="name"
          />
        )}
      />
      {saved ? <Text accessibilityLiveRegion="polite">Nome atualizado.</Text> : null}
      <Button
        label="Salvar nome"
        variant="secondary"
        disabled={!isDirty}
        loading={update.isPending}
        onPress={() => void onSubmit()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.lg },
  row: { gap: space.xs },
  separator: { height: hairline, backgroundColor: colors.line },
});
