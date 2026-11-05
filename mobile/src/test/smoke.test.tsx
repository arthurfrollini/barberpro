import { screen } from 'expo-router/testing-library';
import TabsLayout from '@/app/(tabs)/_layout';
import { renderAppRouter } from './render';
import { Text } from 'react-native';

const Stub = () => <Text>conteúdo</Text>;

it('shows the four tabs', async () => {
  await renderAppRouter({
    '(tabs)/_layout': TabsLayout,
    '(tabs)/index': Stub,
    '(tabs)/agendamentos': Stub,
    '(tabs)/avisos': Stub,
    '(tabs)/conta': Stub,
  });
  for (const tab of ['Explorar', 'Agendamentos', 'Avisos', 'Conta']) {
    expect(screen.getByRole('button', { name: new RegExp(tab) })).toBeTruthy();
  }
});
