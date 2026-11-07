import { Stack } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';
import { Button } from '@/shared/ui/button';
import { LinkRow } from '@/shared/ui/list-row';
import { Screen } from '@/shared/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/states';
import { Text } from '@/shared/ui/text';
import { Thumb } from '@/shared/ui/thumb';
import { space } from '@/shared/ui/theme';
import type { Shop } from '../api/shops';
import { useShop } from '../hooks/use-shops';
import { mapsUrl } from '../lib/maps';

const age = (years: number) =>
  years === 0 ? 'Aberta este ano' : years === 1 ? '1 ano de casa' : `${years} anos de casa`;

export function ShopScreen({ id }: { id: string }) {
  const shop = useShop(id);
  return (
    <Screen
      refreshing={shop.isRefetching}
      onRefresh={shop.isSuccess ? () => void shop.refetch() : undefined}
    >
      <Stack.Screen options={{ title: shop.data?.name ?? 'Barbearia' }} />
      {shop.isPending ? (
        <LoadingState />
      ) : shop.isError ? (
        <ErrorState error={shop.error} onRetry={() => void shop.refetch()} />
      ) : shop.data === null ? (
        <EmptyState title="Barbearia não encontrada" body="Ela pode ter saído do BarberPro." />
      ) : (
        <ShopDetails shop={shop.data} />
      )}
    </Screen>
  );
}

function ShopDetails({ shop }: { shop: Shop }) {
  return (
    <View style={styles.stack}>
      <View style={styles.hero}>
        <Thumb uri={shop.logoUrl} name={shop.name} size={88} />
        <View style={styles.heroText}>
          <Text variant="title">{shop.name}</Text>
          <Text variant="muted">{age(shop.yearsActive)}</Text>
        </View>
      </View>
      <View style={styles.block}>
        <Text>{shop.address}</Text>
        <Button
          label="Abrir no mapa"
          variant="secondary"
          onPress={() => void Linking.openURL(mapsUrl(shop))}
        />
      </View>
      {shop.description ? <Text variant="muted">{shop.description}</Text> : null}
      <View>
        <Text variant="heading">Barbeiros</Text>
        {shop.barbers.length === 0 ? (
          <EmptyState
            title="Nenhum barbeiro atendendo ainda"
            body="Volte mais tarde para agendar aqui."
          />
        ) : (
          shop.barbers.map((barber) => (
            <LinkRow
              key={barber.id}
              href={`/barbeiro/${barber.id}`}
              label={`${barber.name}, ver serviços`}
              leading={<Thumb uri={barber.avatarUrl} name={barber.name} size={48} round />}
            >
              <Text variant="label" style={{ fontSize: 17 }}>
                {barber.name}
              </Text>
              {barber.bio ? (
                <Text variant="muted" numberOfLines={1}>
                  {barber.bio}
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
  block: { gap: space.md },
});
