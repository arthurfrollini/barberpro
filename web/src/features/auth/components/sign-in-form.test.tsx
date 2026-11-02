import { screen } from '@testing-library/react';
import { HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { RedirectIfSignedIn } from '@/app/guards';
import { session } from '@/shared/api';
import { api, gqlData, gqlError } from '@/test/graphql';
import { renderRoutes } from '@/test/render';
import { server } from '@/test/server';
import { SignInPage } from '../pages/sign-in-page';

const routes = [
  // the app's guard: it is what navigates once the session exists
  { element: <RedirectIfSignedIn />, children: [{ path: '/entrar', element: <SignInPage /> }] },
  { path: '/', element: <p>Início</p> },
  { path: '/agenda', element: <p>Agenda</p> },
];

const payload = {
  accessToken: 'a1',
  accessTokenExpiresAt: '2099-01-01T00:00:00.000Z',
  refreshToken: 'r1',
  user: { id: 'u1', name: 'Ana', email: 'ana@example.com', createdAt: '2026-01-01T00:00:00.000Z' },
};

async function fill(
  user: ReturnType<typeof renderRoutes>['user'],
  email: string,
  password: string,
) {
  if (email) await user.type(screen.getByLabelText('Email'), email);
  if (password) await user.type(screen.getByLabelText('Senha'), password);
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('sign in', () => {
  it('asks for email and password before calling the API', async () => {
    const { user } = renderRoutes(routes, { path: '/entrar' });
    await fill(user, '', '');
    expect(await screen.findByText('Informe seu email.')).toBeInTheDocument();
    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument();
  });

  it('rejects a malformed email', async () => {
    const { user } = renderRoutes(routes, { path: '/entrar' });
    await fill(user, 'ana@', 'whatever1');
    expect(await screen.findByText('Email inválido.')).toBeInTheDocument();
  });

  it('shows the API error in Portuguese', async () => {
    server.use(
      api.mutation('SignIn', () => gqlError('INVALID_CREDENTIALS', 'Wrong email or password.')),
    );
    const { user } = renderRoutes(routes, { path: '/entrar' });
    await fill(user, 'ana@example.com', 'wrong-pass');
    expect(await screen.findByText('Email ou senha incorretos.')).toBeInTheDocument();
    expect(session.get()).toBeNull();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
  });

  it('says when the server cannot be reached, and lets the user try again', async () => {
    server.use(api.mutation('SignIn', () => HttpResponse.error()));
    const { user } = renderRoutes(routes, { path: '/entrar' });
    await fill(user, 'ana@example.com', 'correct horse');
    expect(
      await screen.findByText('Não foi possível falar com o servidor. Verifique sua conexão.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
  });

  it('stores the session and goes home', async () => {
    let variables: unknown;
    server.use(
      api.mutation('SignIn', ({ variables: v }) => {
        variables = v;
        return gqlData({ signIn: payload });
      }),
    );
    const { user } = renderRoutes(routes, { path: '/entrar' });
    await fill(user, ' ana@example.com ', 'correct horse');
    expect(await screen.findByText('Início')).toBeInTheDocument();
    expect(variables).toEqual({ input: { email: 'ana@example.com', password: 'correct horse' } });
    expect(session.get()).toEqual({
      accessToken: 'a1',
      accessTokenExpiresAt: '2099-01-01T00:00:00.000Z',
      refreshToken: 'r1',
    });
  });

  it('returns to the page that asked for sign in', async () => {
    server.use(api.mutation('SignIn', () => gqlData({ signIn: payload })));
    const { user } = renderRoutes(routes, { path: '/entrar?voltar=%2Fagenda' });
    await fill(user, 'ana@example.com', 'correct horse');
    expect(await screen.findByText('Agenda')).toBeInTheDocument();
  });

  it('ignores a return path that leaves the app', async () => {
    server.use(api.mutation('SignIn', () => gqlData({ signIn: payload })));
    const { user } = renderRoutes(routes, { path: '/entrar?voltar=https%3A%2F%2Fevil.example' });
    await fill(user, 'ana@example.com', 'correct horse');
    expect(await screen.findByText('Início')).toBeInTheDocument();
  });
});
