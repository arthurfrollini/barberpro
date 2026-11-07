import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { renderAppRouter } from '@/test/render';
import { AccountScreen } from './account-screen';

const routes = {
  conta: AccountScreen,
  entrar: () => <Text>entrar</Text>,
  'criar-conta': () => <Text>criar conta</Text>,
};
const at = { initialUrl: '/conta' };

const me = { me: { id: 'u1', name: 'Ana Souza', email: 'ana@example.com' } };

describe('account', () => {
  it('shows the name and email, and renames', async () => {
    const { server } = await renderAppRouter(routes, {
      ...at,
      handlers: {
        Me: () => me,
        UpdateProfile: ({ input }) => ({
          updateProfile: { ...me.me, name: (input as { name: string }).name },
        }),
      },
    });
    expect(await screen.findByText('ana@example.com')).toBeTruthy();
    const name = screen.getByLabelText('Nome');
    expect(name.props.value).toBe('Ana Souza');
    await fireEvent.changeText(name, 'Ana Lima');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar nome' }));
    expect(await screen.findByText('Nome atualizado.')).toBeTruthy();
    expect(server.variablesOf('UpdateProfile')).toEqual([{ input: { name: 'Ana Lima' } }]);
  });

  it('signs out', async () => {
    const { session } = await renderAppRouter(routes, { ...at, handlers: { Me: () => me } });
    await fireEvent.press(await screen.findByRole('button', { name: 'Sair' }));
    expect(session.get()).toBeNull();
    expect(await screen.findByText('Entre para ver sua conta')).toBeTruthy();
  });

  it('invites a signed-out user to sign in or sign up', async () => {
    await renderAppRouter(routes, { ...at, signedIn: false });
    expect(screen.getByText('Entre para ver sua conta')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Entrar' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Criar conta' })).toBeTruthy();
  });
});
