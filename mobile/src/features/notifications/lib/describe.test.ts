import { describeNotification } from './describe';

const SP = 'America/Sao_Paulo';

const base = {
  id: 'n1',
  title: 'Appointment canceled',
  body: 'English body',
  read: false,
  createdAt: '2026-11-05T12:00:00.000Z',
  appointmentStartsAt: '2026-11-06T17:00:00.000Z',
};
const appt = (over: Record<string, unknown> = {}) => ({
  id: 'appt-1',
  startsAt: '2026-11-06T17:00:00.000Z',
  serviceName: 'Corte',
  cancelReason: null,
  customer: { id: 'me', name: 'Ana' },
  barber: { id: 'b1', name: 'Marcos', barbershop: { id: 's1', name: 'Navalha', timezone: SP } },
  ...over,
});

describe('describeNotification, for the customer', () => {
  it('words a cancellation by the barber', () => {
    expect(
      describeNotification(
        { ...base, type: 'APPOINTMENT_CANCELED', appointment: appt({ cancelReason: 'BARBER' }) },
        'me',
      ),
    ).toEqual({
      title: 'Agendamento cancelado',
      body: 'Marcos cancelou Corte de sex 6/11 às 14:00.',
    });
  });

  it('words a reminder and a reschedule', () => {
    expect(
      describeNotification({ ...base, type: 'APPOINTMENT_REMINDER', appointment: appt() }, 'me'),
    ).toEqual({ title: 'Lembrete', body: 'Corte com Marcos sex 6/11 às 14:00.' });
    expect(
      describeNotification({ ...base, type: 'APPOINTMENT_RESCHEDULED', appointment: appt() }, 'me')
        .title,
    ).toBe('Agendamento remarcado');
  });

  it('falls back to the API text without an appointment', () => {
    expect(
      describeNotification({ ...base, type: 'APPOINTMENT_BOOKED', appointment: null }, 'me'),
    ).toEqual({ title: 'Appointment canceled', body: 'English body' });
  });
});

describe('describeNotification, for a barber who also uses the app', () => {
  const asBarber = (type: string, cancelReason: string | null = null) =>
    describeNotification(
      { ...base, type: type as never, appointment: appt({ cancelReason }) },
      'someone-else',
    ).body;

  it('speaks about the customer', () => {
    expect(asBarber('APPOINTMENT_BOOKED')).toBe('Ana agendou Corte para sex 6/11 às 14:00.');
    expect(asBarber('APPOINTMENT_RESCHEDULED')).toBe('Ana remarcou Corte para sex 6/11 às 14:00.');
    expect(asBarber('APPOINTMENT_CANCELED', 'CUSTOMER')).toBe(
      'Ana cancelou Corte de sex 6/11 às 14:00.',
    );
    expect(asBarber('APPOINTMENT_CANCELED', 'BARBER')).toBe(
      'Você cancelou Corte com Ana em sex 6/11 às 14:00.',
    );
  });

  it('explains cancellations by the agenda', () => {
    expect(asBarber('APPOINTMENT_CANCELED', 'DAY_BLOCKED')).toBe(
      'Marcos fechou a agenda no dia: Corte em sex 6/11 às 14:00 foi cancelado.',
    );
    expect(asBarber('APPOINTMENT_CANCELED', 'SCHEDULE_CHANGED')).toBe(
      'Marcos mudou os horários de atendimento: Corte com Ana em sex 6/11 às 14:00 foi cancelado.',
    );
    expect(asBarber('APPOINTMENT_CANCELED', 'BARBER_REMOVED')).toBe(
      'Marcos saiu da barbearia: Corte com Ana em sex 6/11 às 14:00 foi cancelado.',
    );
    expect(asBarber('APPOINTMENT_CANCELED', null)).toBe(
      'Corte com Ana em sex 6/11 às 14:00 foi cancelado.',
    );
  });

  it('as the customer, says who canceled', () => {
    expect(
      describeNotification(
        { ...base, type: 'APPOINTMENT_CANCELED', appointment: appt({ cancelReason: 'CUSTOMER' }) },
        'me',
      ).body,
    ).toBe('Você cancelou Corte com Marcos em sex 6/11 às 14:00.');
  });
});
