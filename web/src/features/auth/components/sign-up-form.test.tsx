import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { session } from '@/shared/api';
import { api, gqlData, gqlError } from '@/test/graphql';
import { renderRoutes } from '@/test/render';
import { server } from '@/test/server';
import { SignUpPage } from '../pages/sign-up-page';

const routes = [
  { path: '/criar-conta', element: <SignUpPage /> },
  { path: '/', element: <p>Início</p> },
];

async function fill(
  user: ReturnType<typeof renderRoutes>['user'],
  values: { name?: string; email?: string; password?: string },
) {
  if (values.name) await user.type(screen.getByLabelText('Nome'), values.name);
  if (values.email) await user.type(screen.getByLabelText('Email'), values.email);
  if (values.password) await user.type(screen.getByLabelText('Senha'), values.password);
  await user.click(screen.getByRole('button', { name: 'Criar conta' }));
}

describe('sign up', () => {
  it('requires a name and a password of 8 characters or more', async () => {
    const { user } = renderRoutes(routes, { path: '/criar-conta' });
    await fill(user, { email: 'ana@example.com', password: 'short12' });
    expect(await screen.findByText('Informe seu nome.')).toBeInTheDocument();
    expect(screen.getByText('A senha precisa de pelo menos 8 caracteres.')).toBeInTheDocument();
  });

  it('puts EMAIL_TAKEN under the email field', async () => {
    server.use(api.mutation('SignUp', () => gqlError('EMAIL_TAKEN')));
    const { user } = renderRoutes(routes, { path: '/criar-conta' });
    await fill(user, { name: 'Ana', email: 'ana@example.com', password: 'correct horse' });
    const message = await screen.findByText('Já existe uma conta com este email.');
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(message).toBeInTheDocument();
  });

  it('signs the new user in', async () => {
    server.use(
      api.mutation('SignUp', () =>
        gqlData({
          signUp: {
            accessToken: 'a1',
            accessTokenExpiresAt: '2099-01-01T00:00:00.000Z',
            refreshToken: 'r1',
            user: {
              id: 'u1',
              name: 'Ana',
              email: 'ana@example.com',
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          },
        }),
      ),
    );
    const { user } = renderRoutes(routes, { path: '/criar-conta' });
    await fill(user, { name: 'Ana', email: 'ana@example.com', password: 'correct horse' });
    expect(await screen.findByText('Início')).toBeInTheDocument();
    expect(session.get()?.accessToken).toBe('a1');
  });
});
