import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { gqlError } from '@/test/fake-api';
import { renderAppRouter } from '@/test/render';
import { SignInScreen } from './sign-in-screen';
import { SignUpScreen } from './sign-up-screen';

const payload = (name: string, email: string) => ({
  accessToken: 'a2',
  accessTokenExpiresAt: '2999-01-01T00:00:00.000Z',
  refreshToken: 'r2',
  user: { id: 'u1', name, email },
});

const routes = {
  index: () => <Text>início</Text>,
  agendar: () => <Text>agendar</Text>,
  entrar: SignInScreen,
  'criar-conta': SignUpScreen,
};

describe('sign in', () => {
  it('says when the email or password is wrong', async () => {
    const { server } = await renderAppRouter(routes, {
      initialUrl: '/entrar',
      signedIn: false,
      handlers: { SignIn: () => gqlError('INVALID_CREDENTIALS') },
    });
    await fireEvent.changeText(screen.getByLabelText('Email'), 'ana@example.com');
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'wrong password');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Email ou senha incorretos.')).toBeTruthy();
    expect(server.variablesOf('SignIn')).toEqual([
      { input: { email: 'ana@example.com', password: 'wrong password' } },
    ]);
  });

  it('signs in and goes back where the user was', async () => {
    const { session } = await renderAppRouter(routes, {
      initialUrl: `/entrar?voltar=${encodeURIComponent('/agendar?barbeiro=b1&servico=s1')}`,
      signedIn: false,
      handlers: { SignIn: () => ({ signIn: payload('Ana', 'ana@example.com') }) },
    });
    await fireEvent.changeText(screen.getByLabelText('Email'), ' ana@example.com ');
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'correct horse');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('agendar')).toBeTruthy();
    expect(screen).toHavePathname('/agendar');
    expect(screen).toHaveSearchParams({ barbeiro: 'b1', servico: 's1' });
    expect(session.get()?.accessToken).toBe('a2');
  });

  it('checks the fields before calling the API', async () => {
    const { server } = await renderAppRouter(routes, { initialUrl: '/entrar', signedIn: false });
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Informe seu email.')).toBeTruthy();
    expect(screen.getByText('Informe sua senha.')).toBeTruthy();
    expect(server.calls).toHaveLength(0);
  });

  it('links to sign up keeping the return path', async () => {
    await renderAppRouter(routes, {
      initialUrl: `/entrar?voltar=${encodeURIComponent('/agendar')}`,
      signedIn: false,
    });
    await fireEvent.press(screen.getByRole('link', { name: 'Criar conta' }));
    await waitFor(() => expect(screen).toHavePathname('/criar-conta'));
    expect(screen).toHaveSearchParams({ voltar: '/agendar' });
  });
});

describe('sign up', () => {
  it('validates name, email and password', async () => {
    const { server } = await renderAppRouter(routes, {
      initialUrl: '/criar-conta',
      signedIn: false,
    });
    await fireEvent.changeText(screen.getByLabelText('Email'), 'not an email');
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'short');
    await fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText('Informe seu nome.')).toBeTruthy();
    expect(screen.getByText('Email inválido.')).toBeTruthy();
    expect(screen.getByText('A senha precisa ter de 8 a 128 caracteres.')).toBeTruthy();
    expect(server.calls).toHaveLength(0);
  });

  it('maps a taken email', async () => {
    await renderAppRouter(routes, {
      initialUrl: '/criar-conta',
      signedIn: false,
      handlers: { SignUp: () => gqlError('EMAIL_TAKEN') },
    });
    await fireEvent.changeText(screen.getByLabelText('Nome'), 'Ana Souza');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'ana@example.com');
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'correct horse');
    await fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText('Já existe uma conta com este email.')).toBeTruthy();
  });

  it('creates the account and goes back', async () => {
    const { server } = await renderAppRouter(routes, {
      initialUrl: `/criar-conta?voltar=${encodeURIComponent('/agendar')}`,
      signedIn: false,
      handlers: { SignUp: () => ({ signUp: payload('Ana Souza', 'ana@example.com') }) },
    });
    await fireEvent.changeText(screen.getByLabelText('Nome'), ' Ana Souza ');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'ana@example.com');
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'correct horse');
    await fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText('agendar')).toBeTruthy();
    expect(server.variablesOf('SignUp')).toEqual([
      { input: { name: 'Ana Souza', email: 'ana@example.com', password: 'correct horse' } },
    ]);
  });
});
