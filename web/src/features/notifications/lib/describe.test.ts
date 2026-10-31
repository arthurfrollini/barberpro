import { describe, expect, it } from 'vitest';
import type { Notification } from '../api/notifications';
import { describeNotification } from './describe';

const SP = 'America/Sao_Paulo';
const ME = 'user-barber';

const base = (overrides: Partial<Notification> = {}): Notification => ({
  id: 'n1',
  type: 'APPOINTMENT_BOOKED',
  title: 'New booking',
  body: 'Ana booked Corte on Mon, Nov 2 at 14:00.',
  read: false,
  createdAt: '2026-11-02T12:00:00.000Z',
  appointment: {
    id: 'a1',
    startsAt: '2026-11-02T17:00:00.000Z',
    serviceName: 'Corte',
    cancelReason: null,
    customer: { id: 'user-ana', name: 'Ana' },
    barber: { name: 'José' },
  },
  ...overrides,
});

describe('describeNotification', () => {
  it('words what happened to a barber, in Portuguese', () => {
    expect(describeNotification(base(), ME, SP)).toEqual({
      title: 'Novo agendamento',
      body: 'Ana agendou Corte para seg 2/11 às 14:00.',
    });
    expect(describeNotification(base({ type: 'APPOINTMENT_RESCHEDULED' }), ME, SP)).toEqual({
      title: 'Agendamento remarcado',
      body: 'Ana remarcou Corte para seg 2/11 às 14:00.',
    });
  });

  it('says who canceled', () => {
    const canceled = (reason: string) =>
      describeNotification(
        base({
          type: 'APPOINTMENT_CANCELED',
          appointment: { ...base().appointment!, cancelReason: reason as never },
        }),
        ME,
        SP,
      ).body;
    expect(canceled('CUSTOMER')).toBe('Ana cancelou Corte de seg 2/11 às 14:00.');
    expect(canceled('BARBER')).toBe('Você cancelou Corte com Ana em seg 2/11 às 14:00.');
    expect(canceled('SCHEDULE_CHANGED')).toBe(
      'José mudou o horário de trabalho: Corte com Ana em seg 2/11 às 14:00 foi cancelado.',
    );
  });

  it('speaks to the customer when the signed-in user booked it', () => {
    expect(
      describeNotification(
        base({
          type: 'APPOINTMENT_CANCELED',
          appointment: { ...base().appointment!, cancelReason: 'DAY_BLOCKED' },
        }),
        'user-ana',
        SP,
      ),
    ).toEqual({
      title: 'Agendamento cancelado',
      body: 'José bloqueou o dia: Corte em seg 2/11 às 14:00 foi cancelado.',
    });
    expect(describeNotification(base({ type: 'APPOINTMENT_REMINDER' }), 'user-ana', SP)).toEqual({
      title: 'Lembrete',
      body: 'Corte com José seg 2/11 às 14:00.',
    });
  });

  it("falls back to the API's text without an appointment", () => {
    expect(describeNotification(base({ appointment: null }), ME, SP)).toEqual({
      title: 'New booking',
      body: 'Ana booked Corte on Mon, Nov 2 at 14:00.',
    });
  });
});
