import { act, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { shopSummary } from '@/test/fixtures';
import { renderAppRouter } from '@/test/render';
import { LocationProvider, type LocationSource } from '../lib/location';
import { ExploreScreen } from './explore-screen';

const SP = { latitude: -23.5614, longitude: -46.6559 };

const granted: LocationSource = { request: async () => true, current: async () => SP };
const denied: LocationSource = {
  request: async () => false,
  current: async () => {
    throw new Error('not allowed');
  },
};
const failing: LocationSource = {
  request: async () => true,
  current: async () => {
    throw new Error('no fix');
  },
};

const nearby = {
  barbershopsNearby: [
    { distanceKm: 0.35, barbershop: shopSummary() },
    { distanceKm: 1.24, barbershop: shopSummary({ id: 'shop-2', name: 'Barba Negra' }) },
  ],
};

function open(source: LocationSource, handlers = {}) {
  return renderAppRouter(
    {
      index: () => (
        <LocationProvider source={source}>
          <ExploreScreen />
        </LocationProvider>
      ),
      'barbearia/[id]': () => <Text>barbearia</Text>,
    },
    { signedIn: false, handlers: { NearbyBarbershops: () => nearby, ...handlers } },
  );
}

describe('explore', () => {
  it('lists the shops near the user, nearest first, with the distance', async () => {
    const { server } = await open(granted);
    expect(await screen.findByText('Navalha de Ouro')).toBeTruthy();
    expect(screen.getByText('350 m')).toBeTruthy();
    expect(screen.getByText('1,2 km')).toBeTruthy();
    expect(server.variablesOf('NearbyBarbershops')).toEqual([SP]);
  });

  it('opens a shop', async () => {
    await open(granted);
    await fireEvent.press(await screen.findByRole('link', { name: /Barba Negra/ }));
    await waitFor(() => expect(screen).toHavePathname('/barbearia/shop-2'));
  });

  it('says so when there is no shop nearby', async () => {
    await open(granted, { NearbyBarbershops: () => ({ barbershopsNearby: [] }) });
    expect(await screen.findByText('Nenhuma barbearia a até 10 km')).toBeTruthy();
  });

  it('keeps search usable when location is denied', async () => {
    const { server } = await open(denied, {
      SearchBarbershops: () => ({ searchBarbershops: [shopSummary({ name: 'Navalha Fina' })] }),
    });
    expect(await screen.findByText('Sem acesso à sua localização')).toBeTruthy();
    expect(server.variablesOf('NearbyBarbershops')).toEqual([]);
    jest.useFakeTimers();
    await fireEvent.changeText(screen.getByLabelText('Buscar barbearia'), 'nav');
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    jest.useRealTimers();
    expect(await screen.findByText('Navalha Fina')).toBeTruthy();
    expect(server.variablesOf('SearchBarbershops')).toEqual([{ query: 'nav' }]);
  });

  it('says why when the location cannot be read', async () => {
    await open(failing);
    expect(await screen.findByText('Não deu para achar sua localização')).toBeTruthy();
  });

  it('asks for the location once, not again after a search is cleared', async () => {
    const request = jest.fn(async () => true);
    await open({ request, current: granted.current });
    await screen.findByText('Navalha de Ouro');
    await fireEvent.changeText(screen.getByLabelText('Buscar barbearia'), 'n');
    await fireEvent.changeText(screen.getByLabelText('Buscar barbearia'), '');
    expect(await screen.findByText('Navalha de Ouro')).toBeTruthy();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('gives up on a position that never comes', async () => {
    jest.useFakeTimers();
    await open({ request: async () => true, current: () => new Promise(() => {}) });
    await act(async () => {
      jest.advanceTimersByTime(15_000);
    });
    jest.useRealTimers();
    expect(await screen.findByText('Não deu para achar sua localização')).toBeTruthy();
  });

  it('asks for 2 letters before searching', async () => {
    const { server } = await open(granted);
    await fireEvent.changeText(screen.getByLabelText('Buscar barbearia'), 'n');
    expect(await screen.findByText('Digite pelo menos 2 letras.')).toBeTruthy();
    expect(server.variablesOf('SearchBarbershops')).toEqual([]);
  });

  it('says when a search finds nothing', async () => {
    await open(granted, { SearchBarbershops: () => ({ searchBarbershops: [] }) });
    await fireEvent.changeText(screen.getByLabelText('Buscar barbearia'), 'zzz');
    expect(await screen.findByText('Nenhuma barbearia com esse nome')).toBeTruthy();
  });
});
