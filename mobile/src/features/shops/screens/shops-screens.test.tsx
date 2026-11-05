import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { barber, barberSummary, shop } from '@/test/fixtures';
import { renderAppRouter } from '@/test/render';
import { BarberScreen } from './barber-screen';
import { ShopScreen } from './shop-screen';

function ShopRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ShopScreen id={id} />;
}
function BarberRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <BarberScreen id={id} />;
}
const routes = {
  'barbearia/[id]': ShopRoute,
  'barbeiro/[id]': BarberRoute,
  agendar: () => <Text>agendar</Text>,
};

describe('shop', () => {
  it('shows the shop and its barbers', async () => {
    const { server } = await renderAppRouter(routes, {
      initialUrl: '/barbearia/shop-1',
      signedIn: false,
      handlers: {
        Barbershop: () => ({
          barbershop: shop({
            barbers: [barberSummary(), barberSummary({ id: 'b2', name: 'Rui' })],
          }),
        }),
      },
    });
    expect(await screen.findByText('Barbearia clássica no coração da Paulista.')).toBeTruthy();
    expect(screen.getByText('12 anos de casa')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Abrir no mapa' })).toBeTruthy();
    expect(server.variablesOf('Barbershop')).toEqual([{ id: 'shop-1' }]);
    await fireEvent.press(screen.getByRole('link', { name: /Rui/ }));
    await waitFor(() => expect(screen).toHavePathname('/barbeiro/b2'));
  });

  it('says when the shop does not exist', async () => {
    await renderAppRouter(routes, {
      initialUrl: '/barbearia/nope',
      signedIn: false,
      handlers: { Barbershop: () => ({ barbershop: null }) },
    });
    expect(await screen.findByText('Barbearia não encontrada')).toBeTruthy();
  });

  it('says when no barber works there yet', async () => {
    await renderAppRouter(routes, {
      initialUrl: '/barbearia/shop-1',
      signedIn: false,
      handlers: { Barbershop: () => ({ barbershop: shop({ barbers: [] }) }) },
    });
    expect(await screen.findByText('Nenhum barbeiro atendendo ainda')).toBeTruthy();
  });
});

describe('barber', () => {
  it('lists the services with price and duration, and starts a booking', async () => {
    await renderAppRouter(routes, {
      initialUrl: '/barbeiro/barber-1',
      signedIn: false,
      handlers: { Barber: () => ({ barber: barber() }) },
    });
    expect(await screen.findByText('Degradê e barba desde 2010.')).toBeTruthy();
    expect(screen.getByText(/R\$\s50,00/)).toBeTruthy();
    expect(screen.getAllByText('30 min')).toHaveLength(2);
    await fireEvent.press(screen.getByRole('link', { name: /Barba/ }));
    await waitFor(() => expect(screen).toHavePathname('/agendar'));
    expect(screen).toHaveSearchParams({ barbeiro: 'barber-1', servico: 'service-2' });
  });

  it('says when the barber has no service to book', async () => {
    await renderAppRouter(routes, {
      initialUrl: '/barbeiro/barber-1',
      signedIn: false,
      handlers: { Barber: () => ({ barber: barber({ services: [] }) }) },
    });
    expect(await screen.findByText('Nenhum serviço disponível')).toBeTruthy();
  });

  it('says when the barber does not exist', async () => {
    await renderAppRouter(routes, {
      initialUrl: '/barbeiro/nope',
      signedIn: false,
      handlers: { Barber: () => ({ barber: null }) },
    });
    expect(await screen.findByText('Barbeiro não encontrado')).toBeTruthy();
  });
});
