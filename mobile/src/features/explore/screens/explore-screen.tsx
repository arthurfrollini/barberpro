import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { TextField } from '@/shared/ui/field';
import { Screen } from '@/shared/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/states';
import { Text } from '@/shared/ui/text';
import { space } from '@/shared/ui/theme';
import { ShopRow } from '../components/shop-row';
import { MIN_SEARCH, useNearby, useSearch } from '../hooks/use-explore';
import { useLocation, type LocationState } from '../lib/location';

export function ExploreScreen() {
  const [text, setText] = useState('');
  const typed = text.trim();

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={styles.head}>
        <Text variant="title">Explorar</Text>
        <Text variant="muted">Encontre uma barbearia e marque seu horário.</Text>
      </View>
      <TextField
        label="Buscar barbearia"
        placeholder="Nome da barbearia"
        value={text}
        onChangeText={setText}
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {typed.length === 0 ? (
        <Nearby />
      ) : typed.length < MIN_SEARCH ? (
        <Text variant="muted">Digite pelo menos 2 letras.</Text>
      ) : (
        <SearchResults text={text} />
      )}
    </Screen>
  );
}

function Nearby() {
  const location = useLocation();
  const coords = location.status === 'granted' ? location.coords : null;
  const nearby = useNearby(coords);

  if (location.status !== 'granted') return <LocationProblem state={location} />;
  if (nearby.isPending) return <LoadingState label="Procurando barbearias perto de você" />;
  if (nearby.isError)
    return <ErrorState error={nearby.error} onRetry={() => void nearby.refetch()} />;
  if (nearby.data.length === 0)
    return <EmptyState title="Nenhuma barbearia a até 10 km" body="Tente buscar pelo nome." />;
  return (
    <View>
      <Text variant="heading" style={styles.section}>
        Perto de você
      </Text>
      {nearby.data.map(({ barbershop, distanceKm }) => (
        <ShopRow key={barbershop.id} shop={barbershop} distanceKm={distanceKm} />
      ))}
    </View>
  );
}

function LocationProblem({ state }: { state: Exclude<LocationState, { status: 'granted' }> }) {
  switch (state.status) {
    case 'asking':
      return <LoadingState label="Procurando sua localização" />;
    case 'denied':
      return (
        <EmptyState
          title="Sem acesso à sua localização"
          body="Busque pelo nome da barbearia, ou permita a localização nos Ajustes para ver as mais perto."
        />
      );
    case 'unavailable':
      return (
        <EmptyState
          title="Não deu para achar sua localização"
          body="Busque pelo nome da barbearia."
        />
      );
  }
}

function SearchResults({ text }: { text: string }) {
  const search = useSearch(text);
  if (search.isPending) return <LoadingState label="Buscando" />;
  if (search.isError)
    return <ErrorState error={search.error} onRetry={() => void search.refetch()} />;
  if (search.data.length === 0)
    return <EmptyState title="Nenhuma barbearia com esse nome" body="Confira a grafia." />;
  return (
    <View>
      {search.data.map((shop) => (
        <ShopRow key={shop.id} shop={shop} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { gap: space.xs },
  section: { marginBottom: space.xs },
});
