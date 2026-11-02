import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { routes } from '@/app/routes';
import { BARBER, ME, SHOP } from '@/test/fixtures';
import { api, gqlData, gqlError } from '@/test/graphql';
import { renderRoutes, signIn } from '@/test/render';
import { server } from '@/test/server';

function setup(path: string) {
  signIn();
  let shop: typeof SHOP | null = null;
  let barber: typeof BARBER | null = null;
  const calls: unknown[] = [];
  server.use(
    api.query('Roles', () => gqlData({ myBarberProfile: barber, myBarbershop: shop })),
    api.query('Me', () => gqlData({ me: ME })),
    api.query('MyShop', () =>
      gqlData({
        myBarbershop: shop && {
          ...shop,
          description: '',
          foundedYear: 2020,
          address: 'Rua 1',
          latitude: -23.5,
          longitude: -46.6,
          barbers: [],
          invites: [],
        },
      }),
    ),
    api.mutation('CreateBarbershop', ({ variables }) => {
      calls.push(variables);
      shop = { ...SHOP, name: (variables.input as { name: string }).name };
      return gqlData({
        createBarbershop: {
          ...shop,
          description: '',
          foundedYear: 2020,
          address: 'Rua 1',
          latitude: -23.5,
          longitude: -46.6,
        },
      });
    }),
    api.mutation('AcceptInvite', ({ variables }) => {
      calls.push(variables);
      if (variables.token === 'wrong-email') return gqlError('INVITE_EMAIL_MISMATCH');
      barber = BARBER;
      return gqlData({ acceptInvite: { id: BARBER.id, barbershop: { name: SHOP.name } } });
    }),
  );
  return { ...renderRoutes(routes, { path }), calls };
}

describe('getting started', () => {
  it('creates a shop and lands on its page', async () => {
    const { user, calls, router } = setup('/comecar');
    await user.click(await screen.findByRole('button', { name: 'Tenho uma barbearia' }));
    const form = await screen.findByRole('form', { name: 'Dados da barbearia' });
    await user.type(within(form).getByLabelText('Nome'), 'Navalha Nova');
    await user.type(within(form).getByLabelText('Ano de fundação'), '2020');
    await user.type(within(form).getByLabelText('Endereço'), 'Rua 1');
    await user.type(within(form).getByLabelText('Latitude'), '-23.5');
    await user.type(within(form).getByLabelText('Longitude'), '-46.6');
    await user.click(within(form).getByRole('button', { name: 'Criar barbearia' }));

    expect(await screen.findByRole('heading', { name: 'Barbearia' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/barbearia');
    expect(calls[0]).toEqual({
      input: {
        name: 'Navalha Nova',
        description: '',
        foundedYear: 2020,
        address: 'Rua 1',
        latitude: -23.5,
        longitude: -46.6,
        timezone: 'America/Sao_Paulo',
      },
    });
  });

  it('points to the invite page', async () => {
    setup('/comecar');
    expect(await screen.findByRole('link', { name: 'Recebi um convite' })).toHaveAttribute(
      'href',
      '/convite',
    );
  });
});

describe('accepting an invite', () => {
  it('fills the code from the link and joins the team', async () => {
    const { user, calls, router } = setup('/convite?codigo=abc123');
    const code = await screen.findByLabelText('Código do convite');
    expect(code).toHaveValue('abc123');
    await user.click(screen.getByRole('button', { name: 'Aceitar convite' }));

    expect(await screen.findByText('Bem-vindo à equipe da Mega Barbearia SP')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/agenda');
    expect(calls).toEqual([{ token: 'abc123' }]);
  });

  it('explains an invite sent to another email', async () => {
    const { user } = setup('/convite?codigo=wrong-email');
    await user.click(await screen.findByRole('button', { name: 'Aceitar convite' }));
    expect(
      await screen.findByText(
        'Este convite foi enviado para outro email. Entre com o email que recebeu o convite.',
      ),
    ).toBeInTheDocument();
  });

  it('offers to switch accounts when the invite was for another email, keeping the code', async () => {
    const { user, router } = setup('/convite?codigo=wrong-email');
    await user.click(await screen.findByRole('button', { name: 'Aceitar convite' }));
    await user.click(await screen.findByRole('button', { name: 'Entrar com outro email' }));
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(router.state.location.search).toBe(
      `?voltar=${encodeURIComponent('/convite?codigo=wrong-email')}`,
    );
  });

  it('warns an owner that accepting moves them to another shop', async () => {
    signIn();
    server.use(
      api.query('Roles', () => gqlData({ myBarberProfile: null, myBarbershop: SHOP })),
      api.query('Me', () => gqlData({ me: ME })),
    );
    renderRoutes(routes, { path: '/convite?codigo=x' });
    expect(
      await screen.findByText(
        'Você é dono da Mega Barbearia SP. Ao aceitar, você passa a atender na barbearia do convite, não na sua.',
      ),
    ).toBeInTheDocument();
  });
});

describe('getting started, second thoughts', () => {
  it('goes back to the two choices', async () => {
    const { user } = setup('/comecar');
    await user.click(await screen.findByRole('button', { name: 'Tenho uma barbearia' }));
    await user.click(await screen.findByRole('button', { name: 'Voltar' }));
    expect(await screen.findByRole('link', { name: 'Recebi um convite' })).toBeInTheDocument();
  });
});
