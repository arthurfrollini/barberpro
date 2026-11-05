import { Stack, useLocalSearchParams, type Href } from 'expo-router';
import { View } from 'react-native';
import { LinkButton } from '@/shared/ui/button';
import { Screen } from '@/shared/ui/screen';
import { Text } from '@/shared/ui/text';
import { space } from '@/shared/ui/theme';
import { SignUpForm } from '../components/sign-up-form';
import { returnPathWith, safeReturnPath } from '../lib/return-path';
import { useReturn } from '../lib/use-return';

export function SignUpScreen() {
  const { voltar } = useLocalSearchParams<{ voltar?: string }>();
  const back = safeReturnPath(voltar);
  const goBack = useReturn(back);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Criar conta' }} />
      <Text variant="title">Crie sua conta</Text>
      <Text variant="muted">Para agendar e acompanhar seus horários.</Text>
      <SignUpForm onSignedUp={goBack} />
      <View style={{ gap: space.sm }}>
        <Text variant="muted">Já tem conta?</Text>
        <LinkButton
          href={returnPathWith('/entrar', back) as Href}
          label="Entrar"
          variant="secondary"
          replace
        />
      </View>
    </Screen>
  );
}
