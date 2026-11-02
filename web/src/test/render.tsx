import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, type RouteObject } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { Providers } from '@/app/providers';
import { session, type Session } from '@/shared/api';
import { createQueryClient } from '@/shared/api/query-client';

/** Renders routes in memory with the app's providers; no retries so errors show at once. */
export function renderRoutes(routes: RouteObject[], { path = '/' }: { path?: string } = {}) {
  const queryClient = createQueryClient({ retries: 0 });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup();
  const view = render(
    <Providers queryClient={queryClient}>
      <RouterProvider router={router} />
    </Providers>,
  );
  return { ...view, user, router, queryClient };
}

export function signIn(overrides: Partial<Session> = {}) {
  session.set({
    accessToken: 'test-access',
    accessTokenExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    refreshToken: 'test-refresh',
    ...overrides,
  });
}
