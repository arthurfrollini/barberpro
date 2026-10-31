import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { routes } from '@/app/routes';
import { BARBER, ME, roles } from '@/test/fixtures';
import { api, gqlData } from '@/test/graphql';
import { renderRoutes, signIn } from '@/test/render';
import { server } from '@/test/server';

function setup({ barber = true, avatarUrl = null as string | null } = {}) {
  signIn();
  let me = { ...ME };
  let profile = { ...BARBER, avatarUrl };
  const calls: { op: string; variables: unknown }[] = [];
  server.use(
    api.query('Roles', () =>
      gqlData({ ...roles({ barber, owner: !barber }), myBarberProfile: barber ? profile : null }),
    ),
    api.query('Me', () => gqlData({ me })),
    api.mutation('UpdateProfile', ({ variables }) => {
      calls.push({ op: 'name', variables });
      me = { ...me, name: (variables.input as { name: string }).name };
      return gqlData({ updateProfile: me });
    }),
    api.mutation('UpdateBarberProfile', ({ variables }) => {
      calls.push({ op: 'barber', variables });
      const input = variables.input as { bio?: string; avatarFileId?: string | null };
      profile = {
        ...profile,
        ...(input.bio !== undefined ? { bio: input.bio } : {}),
        ...(input.avatarFileId !== undefined
          ? { avatarUrl: input.avatarFileId ? `http://api/files/${input.avatarFileId}` : null }
          : {}),
      };
      return gqlData({ updateBarberProfile: profile });
    }),
    http.post('*/uploads', () =>
      HttpResponse.json({ id: 'f9', url: 'http://api/files/f9' }, { status: 201 }),
    ),
  );
  return { ...renderRoutes(routes, { path: '/perfil' }), calls };
}

describe('profile', () => {
  it('renames the user, and the account menu follows', async () => {
    const { user, calls } = setup();
    const section = await screen.findByRole('region', { name: 'Seus dados' });
    expect(within(section).getByText(ME.email)).toBeInTheDocument();
    const name = within(section).getByLabelText('Nome');
    await user.clear(name);
    await user.type(name, 'José Almeida');
    await user.click(within(section).getByRole('button', { name: 'Salvar nome' }));

    expect(
      await screen.findByRole('button', { name: 'Conta de José Almeida' }),
    ).toBeInTheDocument();
    expect(calls).toEqual([{ op: 'name', variables: { input: { name: 'José Almeida' } } }]);
  });

  it('shows the barber section to barbers only', async () => {
    setup({ barber: false });
    await screen.findByRole('region', { name: 'Seus dados' });
    expect(screen.queryByRole('region', { name: 'Perfil de barbeiro' })).not.toBeInTheDocument();
  });

  it('saves the bio without touching the photo', async () => {
    const { user, calls } = setup();
    const section = await screen.findByRole('region', { name: 'Perfil de barbeiro' });
    const bio = within(section).getByLabelText('Bio');
    expect(bio).toHaveValue('Cortes clássicos.');
    await user.clear(bio);
    await user.type(bio, 'Navalha e tesoura.');
    expect(within(section).getByText('18/500')).toBeInTheDocument();
    await user.click(within(section).getByRole('button', { name: 'Salvar perfil' }));

    expect(await screen.findByText('Perfil salvo')).toBeInTheDocument();
    expect(calls).toEqual([{ op: 'barber', variables: { input: { bio: 'Navalha e tesoura.' } } }]);
  });

  it('sends a new photo, and null to remove it', async () => {
    const { user, calls } = setup({ avatarUrl: 'http://api/files/old' });
    const section = await screen.findByRole('region', { name: 'Perfil de barbeiro' });
    await user.upload(
      within(section).getByLabelText('Foto'),
      new File([new Uint8Array([1])], 'me.png', { type: 'image/png' }),
    );
    await within(section).findByRole('img', { name: 'Foto' });
    await user.click(within(section).getByRole('button', { name: 'Salvar perfil' }));
    await screen.findByText('Perfil salvo');

    await user.click(within(section).getByRole('button', { name: 'Remover' }));
    await user.click(within(section).getByRole('button', { name: 'Salvar perfil' }));

    await screen.findAllByText('Perfil salvo');
    expect(calls.map((c) => c.variables)).toEqual([
      { input: { avatarFileId: 'f9' } },
      { input: { avatarFileId: null } },
    ]);
  });
});
