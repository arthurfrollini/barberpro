import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SESSION_KEY } from '@/shared/api/session';
import { ME, workspaces } from '@/test/fixtures';
import { api, gqlData } from '@/test/graphql';
import { renderRoutes, signIn } from '@/test/render';
import { server } from '@/test/server';
import { routes } from './routes';

function mockApi(r: { barber?: boolean; owner?: boolean }) {
  server.use(
    api.query('Workspaces', () => gqlData(workspaces(r))),
    api.query('Me', () => gqlData({ me: ME })),
  );
}

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

  it("follows a sign-out from another tab and forgets that user's data", async () => {
    signIn();
    mockApi({ barber: true });
    const { router, queryClient } = renderRoutes(routes, { path: '/agenda' });
    expect(await screen.findByRole('heading', { name: 'Agenda' })).toBeInTheDocument();
    expect(queryClient.getQueryData(['workspaces'])).toBeDefined();

    // what the browser delivers when another tab removes the session
    localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new StorageEvent('storage', { key: SESSION_KEY }));

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
    expect(queryClient.getQueryData(['workspaces'])).toBeUndefined();
    expect(queryClient.getQueryData(['me'])).toBeUndefined();
  });
});
