import { describe, expect, it } from 'vitest';
import { pushText, quando } from './push-messages.js';

const SP = 'America/Sao_Paulo';
const at = new Date('2026-11-02T17:00:00Z'); // seg 2/11 às 14:00 in São Paulo
const base = { customer: 'Ana', barber: 'João', service: 'Corte', startsAt: at, timeZone: SP };

describe('push text, in Portuguese as the app shows it', () => {
  it('reads the time in the shop zone', () => {
    expect(quando(at, SP)).toBe('seg 2/11 às 14:00');
    expect(quando(new Date('2026-11-08T02:30:00Z'), SP)).toBe('sáb 7/11 às 23:30');
  });

  it('tells the barber about bookings, cancellations and reschedules by the customer', () => {
    expect(pushText({ ...base, kind: 'booked' })).toEqual({
      title: 'Novo agendamento',
      body: 'Ana agendou Corte para seg 2/11 às 14:00.',
    });
    expect(pushText({ ...base, kind: 'canceled_by_customer' })).toEqual({
      title: 'Agendamento cancelado',
      body: 'Ana cancelou Corte de seg 2/11 às 14:00.',
    });
    expect(pushText({ ...base, kind: 'rescheduled_by_customer' })).toEqual({
      title: 'Agendamento remarcado',
      body: 'Ana remarcou Corte para seg 2/11 às 14:00.',
    });
  });

  it('tells the customer what the barber changed, and why', () => {
    expect(pushText({ ...base, kind: 'rescheduled_by_barber' }).body).toBe(
      'João remarcou Corte para seg 2/11 às 14:00.',
    );
    expect(pushText({ ...base, kind: 'canceled_for_customer', reason: 'barber' }).body).toBe(
      'João cancelou Corte de seg 2/11 às 14:00.',
    );
    expect(pushText({ ...base, kind: 'canceled_for_customer', reason: 'day_blocked' }).body).toBe(
      'João fechou a agenda no dia: Corte em seg 2/11 às 14:00 foi cancelado.',
    );
    expect(
      pushText({ ...base, kind: 'canceled_for_customer', reason: 'schedule_changed' }).body,
    ).toBe(
      'João mudou os horários de atendimento: Corte com João em seg 2/11 às 14:00 foi cancelado.',
    );
    expect(
      pushText({ ...base, kind: 'canceled_for_customer', reason: 'barber_removed' }).body,
    ).toBe('João saiu da barbearia: Corte com João em seg 2/11 às 14:00 foi cancelado.');
  });

  it('reminds the customer', () => {
    expect(pushText({ ...base, kind: 'reminder' })).toEqual({
      title: 'Lembrete',
      body: 'Corte com João seg 2/11 às 14:00.',
    });
  });
});
