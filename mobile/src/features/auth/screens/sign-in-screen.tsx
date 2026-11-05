import { Stack, useLocalSearchParams, type Href } from 'expo-router';
import { View } from 'react-native';
import { LinkButton } from '@/shared/ui/button';
import { Screen } from '@/shared/ui/screen';
import { Text } from '@/shared/ui/text';
import { space } from '@/shared/ui/theme';
import { SignInForm } from '../components/sign-in-form';
import { returnPathWith, safeReturnPath } from '../lib/return-path';
import { useReturn } from '../lib/use-return';

export function SignInScreen() {
  const { voltar } = useLocalSearchParams<{ voltar?: string }>();
  const back = safeReturnPath(voltar);
  const goBack = useReturn(back);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Entrar' }} />
      <Text variant="title">Que bom te ver</Text>
      <SignInForm onSignedIn={goBack} />
      <View style={{ gap: space.sm }}>
        <Text variant="muted">Primeira vez por aqui?</Text>
        <LinkButton
          href={returnPathWith('/criar-conta', back) as Href}
          label="Criar conta"
          variant="secondary"
          replace
        />
      </View>
    </Screen>
  );
}
