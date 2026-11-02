import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { routes } from '@/app/routes';
import { BARBER, ME, SHOP } from '@/test/fixtures';
import { api, gqlData } from '@/test/graphql';
import { renderRoutes, signIn } from '@/test/render';
import { server } from '@/test/server';

vi.mock('@/features/agenda/hooks/use-agenda-live', () => ({ useAgendaLive: () => {} }));

const OTHER = {
  id: 'shop-2',
  name: 'Barbearia do Centro',
  timezone: 'America/Manaus',
  logoUrl: null,
};

function setup() {
  signIn();
  const agendaFor: string[] = [];
  server.use(
    api.query('Workspaces', () =>
      gqlData({
        myBarbershops: [SHOP],
        myBarberProfiles: [BARBER, { ...BARBER, id: 'barber-2', barbershop: OTHER }],
      }),
    ),
    api.query('Me', () => gqlData({ me: ME })),
    api.query('BarberAgenda', ({ variables }) => {
      agendaFor.push(variables.barberId as string);
      return gqlData({ barberAgenda: [] });
    }),
    api.query('MySchedule', () => gqlData({ mySchedule: { weekly: [], blockedDates: [] } })),
  );
  return { ...renderRoutes(routes, { path: '/agenda' }), agendaFor };
}

describe('workspace switcher', () => {
  it('lists every shop with the role the user has there', async () => {
    const { user } = setup();
    await user.click(
      await screen.findByRole('button', {
        name: 'Barbearia atual: Barbearia do Centro. Trocar de barbearia',
      }),
    );
    const menu = await screen.findByRole('menu');
    expect(
      within(menu).getByRole('menuitem', { name: /Barbearia do Centro\s*Barbeiro/ }),
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole('menuitem', { name: /Mega Barbearia SP\s*Dono e barbeiro/ }),
    ).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Nova barbearia' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Aceitar convite' })).toBeInTheDocument();
  });

  it("switches the screens to the other shop's profile and remembers it", async () => {
    const { user, agendaFor } = setup();
    await screen.findByText('Nenhum agendamento neste dia');
    expect(agendaFor).toEqual(['barber-2']);
    // the owner pages are not there in a shop where the user only barbers
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(nav).queryByRole('link', { name: 'Equipe' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Barbearia atual: Barbearia do Centro/ }));
    await user.click(await screen.findByRole('menuitem', { name: /Mega Barbearia SP/ }));

    expect(
      await screen.findByRole('button', { name: /Barbearia atual: Mega Barbearia SP/ }),
    ).toBeInTheDocument();
    expect(await within(nav).findByRole('link', { name: 'Equipe' })).toBeInTheDocument();
    await screen.findByText('Nenhum agendamento neste dia');
    expect(agendaFor).toContain('barber-1');
    expect(sessionStorage.getItem('barberpro.workspace.user-1')).toBe('shop-1');
  });
});
