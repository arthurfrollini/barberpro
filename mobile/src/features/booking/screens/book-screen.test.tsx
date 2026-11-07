import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import { testRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { todayIn, addDays } from '@/shared/lib/time';
import { gqlError } from '@/test/fake-api';
import { barber } from '@/test/fixtures';
import { renderAppRouter } from '@/test/render';
import { BookScreen } from './book-screen';

const SP = 'America/Sao_Paulo';
const today = todayIn(SP);
const tomorrow = addDays(today, 1);
// 12:00 and 12:15 UTC read as 09:00 and 09:15 in São Paulo
const at = (date: string, utc: string) => `${date}T${utc}:00.000Z`;

const routes = {
  agendar: BookScreen,
  'agendamento/[id]': () => <Text>agendamento</Text>,
  entrar: function SignIn() {
    const { voltar } = useLocalSearchParams<{ voltar: string }>();
    return <Text>{`entrar ${voltar}`}</Text>;
  },
};

function open(
  { query = 'barbeiro=barber-1&servico=service-1', signedIn = true } = {},
  handlers = {},
) {
  return renderAppRouter(routes, {
    initialUrl: `/agendar?${query}`,
    signedIn,
    handlers: {
      Barber: () => ({ barber: barber() }),
      AvailableSlots: ({ date }) => ({
        availableSlots: [at(date as string, '12:00'), at(date as string, '12:15')],
      }),
      ...handlers,
    },
  });
}

const slotsGrid = () => screen.findByLabelText('Horários livres');

describe('booking', () => {
  it('shows the service and today’s free times in the shop’s zone', async () => {
    const { server } = await open();
    expect(await screen.findByText('Corte')).toBeTruthy();
    expect(screen.getByText(/Marcos Lima/)).toBeTruthy();
    expect(await within(await slotsGrid()).findByRole('button', { name: '09:00' })).toBeTruthy();
    expect(server.variablesOf('AvailableSlots')).toEqual([
      { barberId: 'barber-1', serviceId: 'service-1', date: today },
    ]);
    expect(screen.getByRole('button', { name: 'Confirmar agendamento' })).toBeDisabled();
  });

  it('books the chosen day, time and reminder', async () => {
    const { server } = await open(undefined, {
      BookAppointment: () => ({ bookAppointment: { id: 'appt-9' } }),
    });
    await fireEvent.press(await screen.findByRole('button', { name: /amanhã/ }));
    await waitFor(() =>
      expect(server.variablesOf('AvailableSlots').at(-1)).toMatchObject({ date: tomorrow }),
    );
    await fireEvent.press(await within(await slotsGrid()).findByRole('button', { name: '09:15' }));
    await fireEvent.press(screen.getByRole('radio', { name: '1 h' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar agendamento' }));
    await waitFor(() => expect(screen).toHavePathname('/agendamento/appt-9'));
    expect(screen).toHaveSearchParams({ id: 'appt-9', novo: '1' });
    expect(server.variablesOf('BookAppointment')).toEqual([
      {
        input: {
          barberId: 'barber-1',
          serviceId: 'service-1',
          startsAt: at(tomorrow, '12:15'),
          reminderLeadMinutes: 60,
        },
      },
    ]);
  });

  it('when someone else took the time, says so, refetches and clears the choice', async () => {
    const { server } = await open(undefined, {
      BookAppointment: () => gqlError('SLOT_UNAVAILABLE'),
    });
    await fireEvent.press(await within(await slotsGrid()).findByRole('button', { name: '09:00' }));
    server.use({ AvailableSlots: () => ({ availableSlots: [at(today, '12:15')] }) });
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar agendamento' }));
    expect(
      await screen.findByText('Alguém acabou de reservar este horário. Escolha outro.'),
    ).toBeTruthy();
    await waitFor(() =>
      expect(
        within(screen.getByLabelText('Horários livres')).queryByRole('button', {
          name: '09:00',
        }),
      ).toBeNull(),
    );
    expect(screen.getByRole('button', { name: 'Confirmar agendamento' })).toBeDisabled();
  });

  it('a double tap on sign in opens it once', async () => {
    await open({ signedIn: false });
    await fireEvent.press(await within(await slotsGrid()).findByRole('button', { name: '09:00' }));
    const button = screen.getByRole('button', { name: 'Entrar para agendar' });
    await fireEvent.press(button);
    await fireEvent.press(button);
    await screen.findByText(/^entrar /);
    await testRouter.back();
    expect(screen).toHavePathname('/agendar');
  });

  it('says when the day has no free time', async () => {
    await open(undefined, { AvailableSlots: () => ({ availableSlots: [] }) });
    expect(await screen.findByText('Nenhum horário livre neste dia')).toBeTruthy();
  });

  it('signed out, keeps the choice through sign in', async () => {
    await open({ signedIn: false });
    await fireEvent.press(await within(await slotsGrid()).findByRole('button', { name: '09:15' }));
    await fireEvent.press(screen.getByRole('radio', { name: '30 min' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar para agendar' }));
    const shown = await screen.findByText(/^entrar /);
    const voltar = String(shown.props.children).replace(/^entrar /, '');
    const url = new URL(`http://app${voltar}`);
    expect(url.pathname).toBe('/agendar');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      barbeiro: 'barber-1',
      servico: 'service-1',
      dia: today,
      hora: at(today, '12:15'),
      lembrete: '30',
    });
  });

  it('says so when the link has no barber, instead of loading forever', async () => {
    await open({ query: 'servico=service-1' });
    expect(await screen.findByText('Barbeiro não encontrado')).toBeTruthy();
  });

  it('says when the service is no longer offered', async () => {
    await open({ query: 'barbeiro=barber-1&servico=gone' });
    expect(await screen.findByText('Serviço não encontrado')).toBeTruthy();
  });
});
