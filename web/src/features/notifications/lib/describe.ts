import { formatShortDateTime } from '@/shared/lib/time';
import type { Notification } from '../api/notifications';

/**
 * The API stores English text (it also goes out by email). The dashboard words the same event
 * in Portuguese from the type and the appointment, from the point of view of whoever reads it:
 * the barber hears about the customer, the customer about the barber.
 */
export function describeNotification(
  n: Notification,
  myUserId: string | undefined,
  timeZone: string,
): { title: string; body: string } {
  const a = n.appointment;
  if (!a) return { title: n.title, body: n.body };
  // the time as the event described it; the appointment may have moved since
  const when = formatShortDateTime(n.appointmentStartsAt ?? a.startsAt, timeZone);
  const asCustomer = a.customer.id === myUserId;
  const other = asCustomer ? a.barber.name : a.customer.name;

  switch (n.type) {
    case 'APPOINTMENT_BOOKED':
      return { title: 'Novo agendamento', body: `${other} agendou ${a.serviceName} para ${when}.` };
    case 'APPOINTMENT_RESCHEDULED':
      return {
        title: 'Agendamento remarcado',
        body: `${other} remarcou ${a.serviceName} para ${when}.`,
      };
    case 'APPOINTMENT_REMINDER':
      return { title: 'Lembrete', body: `${a.serviceName} com ${a.barber.name} ${when}.` };
    case 'APPOINTMENT_CANCELED': {
      const title = 'Agendamento cancelado';
      const what = `${a.serviceName} ${asCustomer ? `com ${a.barber.name} ` : `com ${a.customer.name} `}em ${when}`;
      switch (a.cancelReason) {
        case 'CUSTOMER':
          return asCustomer
            ? { title, body: `Você cancelou ${what}.` }
            : { title, body: `${a.customer.name} cancelou ${a.serviceName} de ${when}.` };
        case 'BARBER':
          return asCustomer
            ? { title, body: `${a.barber.name} cancelou ${a.serviceName} de ${when}.` }
            : { title, body: `Você cancelou ${what}.` };
        case 'DAY_BLOCKED':
          return {
            title,
            body: `${a.barber.name} bloqueou o dia: ${a.serviceName} em ${when} foi cancelado.`,
          };
        case 'SCHEDULE_CHANGED':
          return {
            title,
            body: `${a.barber.name} mudou o horário de trabalho: ${what} foi cancelado.`,
          };
        case 'BARBER_REMOVED':
          return { title, body: `${a.barber.name} saiu da barbearia: ${what} foi cancelado.` };
        default:
          return { title, body: `${what.charAt(0).toUpperCase()}${what.slice(1)} foi cancelado.` };
      }
    }
  }
}
