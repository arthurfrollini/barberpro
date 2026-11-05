import { Link, Stack } from 'expo-router';
import { Screen } from '@/shared/ui/screen';
import { EmptyState } from '@/shared/ui/states';
import { Text } from '@/shared/ui/text';
import { colors } from '@/shared/ui/theme';

export default function NotFound() {
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Não encontrado' }} />
      <EmptyState
        title="Esta página não existe"
        action={
          <Link href="/" replace>
            <Text style={{ color: colors.accent }}>Voltar para o início</Text>
          </Link>
        }
      />
    </Screen>
  );
}
