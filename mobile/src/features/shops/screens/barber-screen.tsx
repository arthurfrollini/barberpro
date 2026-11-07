import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { formatBRL, formatDuration } from '@/shared/lib/money';
import { LinkRow } from '@/shared/ui/list-row';
import { Screen } from '@/shared/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/states';
import { Text } from '@/shared/ui/text';
import { Thumb } from '@/shared/ui/thumb';
import { colors, space } from '@/shared/ui/theme';
import type { Barber } from '../api/shops';
import { useBarber } from '../hooks/use-shops';

export function BarberScreen({ id }: { id: string }) {
  const barber = useBarber(id);
  return (
    <Screen
      refreshing={barber.isRefetching}
      onRefresh={barber.isSuccess ? () => void barber.refetch() : undefined}
    >
      <Stack.Screen options={{ title: barber.data?.name ?? 'Barbeiro' }} />
      {barber.isPending ? (
        <LoadingState />
      ) : barber.isError ? (
        <ErrorState error={barber.error} onRetry={() => void barber.refetch()} />
      ) : barber.data === null ? (
        <EmptyState title="Barbeiro não encontrado" body="Ele pode ter saído da barbearia." />
      ) : (
        <BarberDetails barber={barber.data} />
      )}
    </Screen>
  );
}

function BarberDetails({ barber }: { barber: Barber }) {
  return (
    <View style={styles.stack}>
      <View style={styles.hero}>
        <Thumb uri={barber.avatarUrl} name={barber.name} size={88} round />
        <View style={styles.heroText}>
          <Text variant="title">{barber.name}</Text>
          <Text variant="muted">{barber.barbershop.name}</Text>
        </View>
      </View>
      {barber.bio ? <Text>{barber.bio}</Text> : null}
      <View>
        <Text variant="heading">Serviços</Text>
        <Text variant="muted">Escolha um para ver os horários livres.</Text>
        {barber.services.length === 0 ? (
          <EmptyState
            title="Nenhum serviço disponível"
            body="Este barbeiro ainda não abriu a agenda."
          />
        ) : (
          barber.services.map((service) => (
            <LinkRow
              key={service.id}
              href={{ pathname: '/agendar', params: { barbeiro: barber.id, servico: service.id } }}
              label={`${service.name}, ${formatBRL(service.priceCents)}, ${formatDuration(service.durationMinutes)}`}
              trailing={
                <View style={styles.price}>
                  <Text variant="numeral" style={{ color: colors.accent }}>
                    {formatBRL(service.priceCents)}
                  </Text>
                  <Text variant="muted">{formatDuration(service.durationMinutes)}</Text>
                </View>
              }
            >
              <Text variant="label" style={{ fontSize: 17 }}>
                {service.name}
              </Text>
              {service.description ? (
                <Text variant="muted" numberOfLines={2}>
                  {service.description}
                </Text>
              ) : null}
            </LinkRow>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.xl },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  heroText: { flex: 1, gap: space.xs },
  price: { alignItems: 'flex-end', gap: 2 },
});
