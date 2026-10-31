import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { landingPath } from '@/features/roles/hooks/use-roles';
import { session } from '@/shared/api';
import { ME, roles } from '@/test/fixtures';
import { api, gqlData } from '@/test/graphql';
import { renderRoutes, signIn } from '@/test/render';
import { server } from '@/test/server';
import { routes } from './routes';

function mockApi(r: { barber?: boolean; owner?: boolean }) {
  server.use(
    api.query('Roles', () => gqlData(roles(r))),
    api.query('Me', () => gqlData({ me: ME })),
  );
}

describe('landingPath', () => {
  it.each([
    [{ barber: true, owner: false }, '/agenda'],
    [{ barber: true, owner: true }, '/agenda'],
    [{ barber: false, owner: true }, '/barbearia'],
    [{ barber: false, owner: false }, '/comecar'],
  ])('%o lands on %s', (r, path) => {
    const { myBarberProfile, myBarbershop } = roles(r);
    expect(landingPath({ barber: myBarberProfile, shop: myBarbershop })).toBe(path);
  });
});

describe('route guards', () => {
  it('sends signed-out users to sign in, remembering where they were going', async () => {
    const { router } = renderRoutes(routes, { path: '/servicos' });
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/entrar');
    expect(router.state.location.search).toBe('?voltar=%2Fservicos');
  });

  it('sends a signed-in user away from the sign-in page to their landing', async () => {
    signIn();
    mockApi({ barber: true });
    const { router } = renderRoutes(routes, { path: '/entrar' });
    expect(await screen.findByRole('heading', { name: 'Agenda' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/agenda');
  });

  it('lands an owner who does not barber on the shop page', async () => {
    signIn();
    mockApi({ owner: true });
    renderRoutes(routes, { path: '/' });
    expect(await screen.findByRole('heading', { name: 'Barbearia' })).toBeInTheDocument();
  });

  it('keeps barber pages from users who do not barber', async () => {
    signIn();
    mockApi({ owner: true });
    const { router } = renderRoutes(routes, { path: '/horarios' });
    expect(await screen.findByRole('heading', { name: 'Barbearia' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/barbearia');
  });

  it('keeps owner pages from barbers who do not own the shop', async () => {
    signIn();
    mockApi({ barber: true });
    const { router } = renderRoutes(routes, { path: '/equipe' });
    expect(await screen.findByRole('heading', { name: 'Agenda' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/agenda');
  });

  it('follows a sign-out from another tab', async () => {
    signIn();
    mockApi({ barber: true });
    renderRoutes(routes, { path: '/agenda' });
    expect(await screen.findByRole('heading', { name: 'Agenda' })).toBeInTheDocument();
    session.clear();
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
  });
});
