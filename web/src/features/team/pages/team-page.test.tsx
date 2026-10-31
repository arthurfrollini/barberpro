import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { routes } from '@/app/routes';
import { BARBER, ME, SHOP } from '@/test/fixtures';
import { api, gqlData, gqlError } from '@/test/graphql';
import { renderRoutes, signIn } from '@/test/render';
import { server } from '@/test/server';

type Invite = { id: string; email: string; status: string; expiresAt: string; createdAt: string };

function setup() {
  signIn();
  let barbers = [
    { id: BARBER.id, name: 'José', avatarUrl: null },
    { id: 'barber-2', name: 'Marcos', avatarUrl: null },
  ];
  let invites: Invite[] = [
    {
      id: 'i1',
      email: 'old@example.com',
      status: 'ACCEPTED',
      expiresAt: '2026-11-01T12:00:00.000Z',
      createdAt: '2026-10-25T12:00:00.000Z',
    },
  ];
  const calls: string[] = [];
  server.use(
    api.query('Roles', () => gqlData({ myBarberProfile: BARBER, myBarbershop: SHOP })),
    api.query('Me', () => gqlData({ me: ME })),
    api.query('MyShop', () =>
      gqlData({
        myBarbershop: {
          ...SHOP,
          description: '',
          foundedYear: 2012,
          address: 'Rua 1',
          latitude: -23.5,
          longitude: -46.6,
          barbers,
          invites,
        },
      }),
    ),
    api.mutation('InviteBarber', ({ variables }) => {
      calls.push(`invite ${variables.email}`);
      if (variables.email === 'pending@example.com') return gqlError('INVITE_ALREADY_SENT');
      const invite = {
        id: 'i2',
        email: variables.email as string,
        status: 'PENDING',
        expiresAt: '2026-11-09T12:00:00.000Z',
        createdAt: '2026-11-02T12:00:00.000Z',
      };
      invites = [...invites, invite];
      return gqlData({ inviteBarber: invite });
    }),
    api.mutation('RevokeInvite', ({ variables }) => {
      calls.push(`revoke ${variables.id}`);
      invites = invites.map((i) => (i.id === variables.id ? { ...i, status: 'REVOKED' } : i));
      return gqlData({ revokeInvite: invites.find((i) => i.id === variables.id) });
    }),
    api.mutation('RemoveBarber', ({ variables }) => {
      calls.push(`remove ${variables.id}`);
      const removed = barbers.find((b) => b.id === variables.id);
      barbers = barbers.filter((b) => b.id !== variables.id);
      return gqlData({ removeBarber: removed });
    }),
  );
  return { ...renderRoutes(routes, { path: '/equipe' }), calls };
}

const barbersList = () => screen.findByRole('list', { name: 'Barbeiros' });
const invitesList = () => screen.findByRole('list', { name: 'Convites' });

describe('team', () => {
  it('lists the barbers, marking the owner', async () => {
    setup();
    const list = await barbersList();
    expect(within(list).getByRole('listitem', { name: 'José (você)' })).toBeInTheDocument();
    expect(
      within(within(list).getByRole('listitem', { name: 'José (você)' })).queryByRole('button'),
    ).not.toBeInTheDocument();
    expect(within(list).getByRole('listitem', { name: 'Marcos' })).toBeInTheDocument();
  });

  it('invites a barber by email', async () => {
    const { user, calls } = setup();
    await user.type(await screen.findByLabelText('Email do barbeiro'), 'novo@example.com');
    await user.click(screen.getByRole('button', { name: 'Enviar convite' }));

    expect(await screen.findByText('Convite enviado para novo@example.com')).toBeInTheDocument();
    const row = within(await invitesList()).getByRole('listitem', { name: 'novo@example.com' });
    expect(row).toHaveTextContent('Pendente');
    expect(row).toHaveTextContent('expira em 9 de novembro');
    expect(calls).toEqual(['invite novo@example.com']);
    expect(screen.getByLabelText('Email do barbeiro')).toHaveValue('');
  });

  it('puts INVITE_ALREADY_SENT under the email field', async () => {
    const { user } = setup();
    await user.type(await screen.findByLabelText('Email do barbeiro'), 'pending@example.com');
    await user.click(screen.getByRole('button', { name: 'Enviar convite' }));
    expect(
      await screen.findByText('Já existe um convite pendente para este email.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email do barbeiro')).toHaveAttribute('aria-invalid', 'true');
  });

  it('revokes a pending invite', async () => {
    const { user, calls } = setup();
    await user.type(await screen.findByLabelText('Email do barbeiro'), 'novo@example.com');
    await user.click(screen.getByRole('button', { name: 'Enviar convite' }));
    const row = within(await invitesList()).getByRole('listitem', { name: 'novo@example.com' });
    await user.click(within(row).getByRole('button', { name: 'Revogar' }));

    await within(row).findByText('Revogado');
    expect(within(row).queryByRole('button', { name: 'Revogar' })).not.toBeInTheDocument();
    expect(calls).toContain('revoke i2');
  });

  it('removes a barber after explaining what happens to their bookings', async () => {
    const { user, calls } = setup();
    const marcos = within(await barbersList()).getByRole('listitem', { name: 'Marcos' });
    await user.click(within(marcos).getByRole('button', { name: 'Remover' }));
    const confirm = await screen.findByRole('alertdialog');
    expect(confirm).toHaveTextContent(
      'Remover Marcos da equipe? Os agendamentos de Marcos a 2 horas ou mais são cancelados e os clientes avisados.',
    );
    await user.click(within(confirm).getByRole('button', { name: 'Remover' }));

    await within(await barbersList()).findByRole('listitem', { name: 'José (você)' });
    expect(
      within(await barbersList()).queryByRole('listitem', { name: 'Marcos' }),
    ).not.toBeInTheDocument();
    expect(calls).toEqual(['remove barber-2']);
  });
});
