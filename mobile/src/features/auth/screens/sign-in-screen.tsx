import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { View } from 'react-native';
import { LinkButton } from '@/shared/ui/button';
import { Screen } from '@/shared/ui/screen';
import { Text } from '@/shared/ui/text';
import { space } from '@/shared/ui/theme';
import { SignInForm } from '../components/sign-in-form';
import { returnPathWith, safeReturnPath } from '../lib/return-path';

export function SignInScreen() {
  const router = useRouter();
  const { voltar } = useLocalSearchParams<{ voltar?: string }>();
  const back = safeReturnPath(voltar);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Entrar' }} />
      <Text variant="title">Que bom te ver</Text>
      <SignInForm onSignedIn={() => router.replace((back ?? '/') as Href)} />
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
