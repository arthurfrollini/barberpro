import type { CancelReason } from '../../scheduling/domain/appointment.js';

// Pushes are read in the phone's notification list, where the app cannot translate them, and
// both clients speak Portuguese: the words match what the app's Avisos shows for each event.

const formatters = new Map<string, { day: Intl.DateTimeFormat; time: Intl.DateTimeFormat }>();

function formattersFor(timeZone: string) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = {
      day: new Intl.DateTimeFormat('pt-BR', {
        timeZone,
        weekday: 'short',
        day: 'numeric',
        month: 'numeric',
      }),
      time: new Intl.DateTimeFormat('pt-BR', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }),
    };
    formatters.set(timeZone, f);
  }
  return f;
}

/** "seg 2/11 às 14:00" in the shop's zone. */
export function quando(instant: Date, timeZone: string): string {
  const f = formattersFor(timeZone);
  const parts = f.day.formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const weekday = get('weekday').replace('.', '');
  return `${weekday} ${Number(get('day'))}/${Number(get('month'))} às ${f.time.format(instant)}`;
}

export type PushKind =
  | { kind: 'booked' }
  | { kind: 'canceled_by_customer' }
  | { kind: 'rescheduled_by_customer' }
  | { kind: 'rescheduled_by_barber' }
  | { kind: 'canceled_for_customer'; reason: CancelReason | null }
  | { kind: 'reminder' };

export type PushContext = PushKind & {
  customer: string;
  barber: string;
  service: string;
  startsAt: Date;
  timeZone: string;
};

export function pushText(c: PushContext): { title: string; body: string } {
  const when = quando(c.startsAt, c.timeZone);
  switch (c.kind) {
    case 'booked':
      return {
        title: 'Novo agendamento',
        body: `${c.customer} agendou ${c.service} para ${when}.`,
      };
    case 'canceled_by_customer':
      return {
        title: 'Agendamento cancelado',
        body: `${c.customer} cancelou ${c.service} de ${when}.`,
      };
    case 'rescheduled_by_customer':
      return {
        title: 'Agendamento remarcado',
        body: `${c.customer} remarcou ${c.service} para ${when}.`,
      };
    case 'rescheduled_by_barber':
      return {
        title: 'Agendamento remarcado',
        body: `${c.barber} remarcou ${c.service} para ${when}.`,
      };
    case 'reminder':
      return { title: 'Lembrete', body: `${c.service} com ${c.barber} ${when}.` };
    case 'canceled_for_customer': {
      const title = 'Agendamento cancelado';
      const what = `${c.service} com ${c.barber} em ${when}`;
      switch (c.reason) {
        case 'day_blocked':
          return {
            title,
            body: `${c.barber} fechou a agenda no dia: ${c.service} em ${when} foi cancelado.`,
          };
        case 'schedule_changed':
          return {
            title,
            body: `${c.barber} mudou os horários de atendimento: ${what} foi cancelado.`,
          };
        case 'barber_removed':
          return { title, body: `${c.barber} saiu da barbearia: ${what} foi cancelado.` };
        default:
          return { title, body: `${c.barber} cancelou ${c.service} de ${when}.` };
      }
    }
  }
}

/** Where a tap on the push opens the app: the customer's appointment, or a barber's Avisos. */
export const pushUrl = (to: 'customer' | 'barber', appointmentId: string) =>
  to === 'customer' ? `/agendamento/${appointmentId}` : '/avisos';
