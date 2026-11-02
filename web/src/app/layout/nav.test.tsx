import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { session } from '@/shared/api';
import { ME, roles } from '@/test/fixtures';
import { api, gqlData } from '@/test/graphql';
import { renderRoutes, signIn } from '@/test/render';
import { server } from '@/test/server';
import { routes } from '../routes';

function setup(r: { barber?: boolean; owner?: boolean }, path: string) {
  signIn();
  server.use(
    api.query('Roles', () => gqlData(roles(r))),
    api.query('Me', () => gqlData({ me: ME })),
  );
  return renderRoutes(routes, { path });
}

const navLinks = async () => {
  const nav = await screen.findByRole('navigation', { name: 'Principal' });
  return within(nav)
    .getAllByRole('link')
    .map((link) => link.textContent);
};

describe('navigation', () => {
  it('shows a barber their own tools only', async () => {
    setup({ barber: true }, '/agenda');
    expect(await navLinks()).toEqual(['Agenda', 'Horários', 'Serviços', 'Perfil']);
  });

  it('adds the shop pages for an owner who barbers', async () => {
    setup({ barber: true, owner: true }, '/agenda');
    expect(await navLinks()).toEqual([
      'Agenda',
      'Horários',
      'Serviços',
      'Perfil',
      'Barbearia',
      'Equipe',
    ]);
  });

  it('shows an owner who does not barber the shop pages and their profile', async () => {
    setup({ owner: true }, '/barbearia');
    expect(await navLinks()).toEqual(['Barbearia', 'Equipe', 'Perfil']);
  });

  it('shows the shop name and signs out from the account menu', async () => {
    const { user, router } = setup({ barber: true }, '/agenda');
    expect(await screen.findAllByText('Mega Barbearia SP')).not.toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Conta de José Silva' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Sair' }));
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/entrar');
    // signing out on purpose is not an interruption: no page to come back to
    expect(router.state.location.search).toBe('');
    expect(session.get()).toBeNull();
  });
});
