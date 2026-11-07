import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import { Alert, Text } from 'react-native';
import { addDays, formatShortDateTime, formatTime, localDateOf, todayIn } from '@/shared/lib/time';
import { gqlError, type FakeHandler } from '@/test/fake-api';
import { appointment } from '@/test/fixtures';
import { renderAppRouter } from '@/test/render';
import { AppointmentScreen } from './appointment-screen';
import { AppointmentsScreen } from './appointments-screen';
import { RescheduleScreen } from './reschedule-screen';

const SP = 'America/Sao_Paulo';

function AppointmentRoute() {
  const { id, novo, remarcado } = useLocalSearchParams<Record<string, string>>();
  return <AppointmentScreen id={id!} notice={novo ? 'booked' : remarcado ? 'moved' : undefined} />;
}
function RescheduleRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RescheduleScreen id={id} />;
}
const routes = {
  agendamentos: AppointmentsScreen,
  'agendamento/[id]': AppointmentRoute,
  'remarcar/[id]': RescheduleRoute,
  index: () => <Text>explorar</Text>,
  entrar: () => <Text>entrar</Text>,
  'criar-conta': () => <Text>criar conta</Text>,
};

const upcoming = appointment();
const past = appointment(
  { id: 'appt-0', status: 'CANCELED', cancelReason: 'BARBER', canceledAt: '2026-10-01T10:00:00Z' },
  -240,
);

const lists: Record<string, FakeHandler> = {
  // like the API: without `upcoming`, the latest of any date
  MyAppointments: (vars) => ({
    myAppointments: vars.upcoming === false ? [upcoming, past] : [upcoming],
  }),
};

describe('appointments list', () => {
  it('invites a signed-out user to sign in', async () => {
    await renderAppRouter(routes, { initialUrl: '/agendamentos', signedIn: false });
    expect(screen.getByText('Entre para ver seus agendamentos')).toBeTruthy();
  });

  it('lists upcoming ones, and past ones with why they were canceled', async () => {
    const { server } = await renderAppRouter(routes, {
      initialUrl: '/agendamentos',
      handlers: lists,
    });
    const when = formatShortDateTime(upcoming.startsAt, SP);
    expect(await screen.findByRole('link', { name: new RegExp(when) })).toBeTruthy();
    expect(screen.getByText('Navalha de Ouro')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Anteriores' }));
    expect(await screen.findByText('Cancelado')).toBeTruthy();
    expect(screen.queryByRole('link', { name: new RegExp(when) })).toBeNull();
    expect(server.variablesOf('MyAppointments')).toEqual([{ upcoming: true }, { upcoming: false }]);
  });

  it('points to Explorar when nothing is booked', async () => {
    await renderAppRouter(routes, {
      initialUrl: '/agendamentos',
      handlers: { MyAppointments: () => ({ myAppointments: [] }) },
    });
    expect(await screen.findByText('Nenhum agendamento marcado')).toBeTruthy();
    await fireEvent.press(screen.getByRole('link', { name: 'Explorar barbearias' }));
    await waitFor(() => expect(screen).toHavePathname('/'));
  });
});

describe('appointment detail', () => {
  it('shows the booking as a ticket after booking', async () => {
    await renderAppRouter(routes, {
      initialUrl: '/agendamento/appt-1?novo=1',
      handlers: lists,
    });
    expect(await screen.findByText('Agendado')).toBeTruthy();
    expect(screen.getByText(formatTime(upcoming.startsAt, SP))).toBeTruthy();
    expect(screen.getByText('30 min antes')).toBeTruthy();
    expect(screen.getByText('Av. Paulista, 1000')).toBeTruthy();
  });

  it('cancels after confirming', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.style === 'destructive')?.onPress?.();
    });
    const { server } = await renderAppRouter(routes, {
      initialUrl: '/agendamento/appt-1',
      handlers: {
        ...lists,
        CancelAppointment: () => ({
          cancelAppointment: {
            id: 'appt-1',
            status: 'CANCELED',
            cancelReason: 'CUSTOMER',
            canceledAt: new Date().toISOString(),
          },
        }),
      },
    });
    await fireEvent.press(await screen.findByRole('button', { name: 'Cancelar agendamento' }));
    expect(await screen.findByText('Agendamento cancelado.')).toBeTruthy();
    // no second cancel while the lists catch up
    expect(screen.queryByRole('button', { name: 'Cancelar agendamento' })).toBeNull();
    expect(server.variablesOf('CancelAppointment')).toEqual([{ id: 'appt-1' }]);
    expect(alert).toHaveBeenCalledTimes(1);
    alert.mockRestore();
  });

  it('keeps it when the confirmation is dismissed', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.style === 'cancel')?.onPress?.();
    });
    const { server } = await renderAppRouter(routes, {
      initialUrl: '/agendamento/appt-1',
      handlers: lists,
    });
    await fireEvent.press(await screen.findByRole('button', { name: 'Cancelar agendamento' }));
    expect(server.variablesOf('CancelAppointment')).toEqual([]);
    alert.mockRestore();
  });

  it('within 2 hours, explains why it can no longer change', async () => {
    const soon = appointment({}, 1);
    await renderAppRouter(routes, {
      initialUrl: '/agendamento/appt-1',
      handlers: { MyAppointments: () => ({ myAppointments: [soon] }) },
    });
    expect(
      await screen.findByText('Faltam menos de 2 horas: não dá mais para cancelar ou remarcar.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancelar agendamento' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remarcar' })).toBeDisabled();
  });

  it('signed out, asks to sign in instead of loading forever', async () => {
    await renderAppRouter(routes, { initialUrl: '/agendamento/appt-1', signedIn: false });
    expect(await screen.findByText('Entre para ver este agendamento')).toBeTruthy();
  });

  it('while the lists refetch, loads instead of saying not found', async () => {
    let release: () => void = () => {};
    const { server, queryClient } = await renderAppRouter(routes, {
      initialUrl: '/agendamento/appt-1',
      handlers: { MyAppointments: () => ({ myAppointments: [] }) },
    });
    expect(await screen.findByText('Agendamento não encontrado')).toBeTruthy();
    // a booking just landed: the lists are stale until the refetch answers
    server.use({
      MyAppointments: () =>
        new Promise((resolve) => {
          release = () => resolve({ myAppointments: [upcoming] });
        }),
    });
    await act(async () => {
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
    });
    await waitFor(() => expect(screen.queryByText('Agendamento não encontrado')).toBeNull());
    release();
    expect(await screen.findByText('30 min antes')).toBeTruthy();
  });

  it('says when the appointment is not found', async () => {
    await renderAppRouter(routes, {
      initialUrl: '/agendamento/nope',
      handlers: lists,
    });
    expect(await screen.findByText('Agendamento não encontrado')).toBeTruthy();
  });
});

describe('reschedule', () => {
  it('signed out, asks to sign in', async () => {
    await renderAppRouter(routes, { initialUrl: '/remarcar/appt-1', signedIn: false });
    expect(await screen.findByText('Entre para ver este agendamento')).toBeTruthy();
  });

  it('opens on the day the appointment is on', async () => {
    const { server } = await renderAppRouter(routes, {
      initialUrl: '/remarcar/appt-1',
      handlers: { ...lists, RescheduleSlots: () => ({ rescheduleSlots: [] }) },
    });
    expect(await screen.findByText('Nenhum horário livre neste dia')).toBeTruthy();
    expect(server.variablesOf('RescheduleSlots')).toEqual([
      { appointmentId: 'appt-1', date: localDateOf(upcoming.startsAt, SP) },
    ]);
  });

  it('moves the appointment to a new time', async () => {
    const tomorrow = addDays(todayIn(SP), 1);
    const { server } = await renderAppRouter(routes, {
      initialUrl: '/remarcar/appt-1',
      handlers: {
        ...lists,
        RescheduleSlots: ({ date }) => ({
          rescheduleSlots: [`${date as string}T14:00:00.000Z`],
        }),
        RescheduleAppointment: ({ id, startsAt }) => ({
          rescheduleAppointment: { id, startsAt },
        }),
      },
    });
    await fireEvent.press(await screen.findByRole('button', { name: /amanhã/ }));
    const grid = await screen.findByLabelText('Horários livres');
    await fireEvent.press(await within(grid).findByRole('button', { name: '11:00' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar novo horário' }));
    expect(await screen.findByText('Agendamento remarcado')).toBeTruthy();
    expect(server.variablesOf('RescheduleAppointment')).toEqual([
      { id: 'appt-1', startsAt: `${tomorrow}T14:00:00.000Z` },
    ]);
  });

  it('says why when the time was taken meanwhile', async () => {
    await renderAppRouter(routes, {
      initialUrl: '/remarcar/appt-1',
      handlers: {
        ...lists,
        RescheduleSlots: ({ date }) => ({ rescheduleSlots: [`${date as string}T14:00:00.000Z`] }),
        RescheduleAppointment: () => gqlError('SLOT_UNAVAILABLE'),
      },
    });
    const grid = await screen.findByLabelText('Horários livres');
    await fireEvent.press(await within(grid).findByRole('button', { name: '11:00' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar novo horário' }));
    expect(
      await screen.findByText('Alguém acabou de reservar este horário. Escolha outro.'),
    ).toBeTruthy();
  });
});
