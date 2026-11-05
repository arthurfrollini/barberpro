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
