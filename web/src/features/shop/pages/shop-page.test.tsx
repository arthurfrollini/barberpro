import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routes } from '@/app/routes';
import { BARBER, ME, SHOP } from '@/test/fixtures';
import { api, gqlData } from '@/test/graphql';
import { renderRoutes, signIn } from '@/test/render';
import { server } from '@/test/server';

const FULL_SHOP = {
  ...SHOP,
  description: 'Desde 2012.',
  foundedYear: 2012,
  address: 'Rua Augusta, 1500',
  latitude: -23.5614,
  longitude: -46.6559,
  barbers: [],
  invites: [],
};

function setup({ barber = false } = {}) {
  signIn();
  let isBarber = barber;
  let shop = { ...FULL_SHOP };
  const calls: { op: string; variables: unknown }[] = [];
  server.use(
    api.query('Roles', () =>
      gqlData({ myBarberProfile: isBarber ? BARBER : null, myBarbershop: SHOP }),
    ),
    api.query('Me', () => gqlData({ me: ME })),
    api.query('MyShop', () => gqlData({ myBarbershop: shop })),
    api.mutation('UpdateBarbershop', ({ variables }) => {
      calls.push({ op: 'update', variables });
      shop = { ...shop, ...(variables.input as object) };
      return gqlData({ updateBarbershop: shop });
    }),
    api.mutation('BecomeBarber', () => {
      calls.push({ op: 'becomeBarber', variables: {} });
      isBarber = true;
      return gqlData({ becomeBarber: { id: BARBER.id } });
    }),
  );
  return { ...renderRoutes(routes, { path: '/barbearia' }), calls };
}

const form = () => screen.findByRole('form', { name: 'Dados da barbearia' });

describe('shop page', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('saves only what changed', async () => {
    const { user, calls } = setup();
    const shop = await form();
    const name = within(shop).getByLabelText('Nome');
    expect(name).toHaveValue('Mega Barbearia SP');
    await user.clear(name);
    await user.type(name, 'Mega Barbearia Paulista');
    await user.click(within(shop).getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Barbearia salva')).toBeInTheDocument();
    expect(calls).toEqual([
      { op: 'update', variables: { input: { name: 'Mega Barbearia Paulista' } } },
    ]);
  });

  it('checks the year and the coordinates', async () => {
    const { user, calls } = setup();
    const shop = await form();
    const year = within(shop).getByLabelText('Ano de fundação');
    await user.clear(year);
    await user.type(year, '1850');
    const latitude = within(shop).getByLabelText('Latitude');
    await user.clear(latitude);
    await user.type(latitude, '95');
    await user.click(within(shop).getByRole('button', { name: 'Salvar' }));

    expect(await within(shop).findByText(/Use um ano entre 1900 e/)).toBeInTheDocument();
    expect(within(shop).getByText('A latitude vai de -90 a 90.')).toBeInTheDocument();
    expect(calls).toEqual([]);
  });

  it("fills the coordinates from the browser's location", async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: {
        getCurrentPosition: (ok: PositionCallback) =>
          ok({ coords: { latitude: -23.1234567, longitude: -46.7654321 } } as GeolocationPosition),
      },
    });
    const { user } = setup();
    const shop = await form();
    await user.click(within(shop).getByRole('button', { name: 'Usar minha localização' }));
    expect(within(shop).getByLabelText('Latitude')).toHaveValue('-23.123457');
    expect(within(shop).getByLabelText('Longitude')).toHaveValue('-46.765432');
  });

  it('says so when the browser will not share the location', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: {
        getCurrentPosition: (_ok: PositionCallback, fail: PositionErrorCallback) =>
          fail({ code: 1 } as GeolocationPositionError),
      },
    });
    const { user } = setup();
    const shop = await form();
    await user.click(within(shop).getByRole('button', { name: 'Usar minha localização' }));
    expect(
      await within(shop).findByText('Não foi possível pegar sua localização. Preencha à mão.'),
    ).toBeInTheDocument();
  });

  it('lets an owner join as a barber', async () => {
    const { user, calls } = setup();
    await user.click(await screen.findByRole('button', { name: 'Atender também' }));
    const nav = await screen.findByRole('navigation', { name: 'Principal' });
    expect(await within(nav).findByRole('link', { name: 'Agenda' })).toBeInTheDocument();
    expect(calls).toEqual([{ op: 'becomeBarber', variables: {} }]);
    expect(screen.queryByRole('button', { name: 'Atender também' })).not.toBeInTheDocument();
  });

  it('does not offer it to an owner who already barbers', async () => {
    setup({ barber: true });
    await form();
    expect(screen.queryByRole('button', { name: 'Atender também' })).not.toBeInTheDocument();
  });
});
