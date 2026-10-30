import type { SchedulingEvent } from '../../scheduling/application/ports.js';
import type { Appointment } from '../../scheduling/domain/appointment.js';
import { Notification, type NotificationType } from '../domain/notification.js';
import { cancelReasonText, when } from './messages.js';
import type { NotifyDeps } from './ports.js';

/** In-app row plus the same text by email. */
async function notify(
  deps: NotifyDeps,
  to: { userId: string; email: string },
  type: NotificationType,
  title: string,
  body: string,
  appointmentId: string,
) {
  await deps.notifications.insert([
    Notification.create({ userId: to.userId, type, title, body, appointmentId }, deps.clock.now()),
  ]);
  await deps.mailQueue.enqueue({ to: to.email, subject: title, text: body });
}

async function scheduleReminder(deps: NotifyDeps, appointment: Appointment) {
  if (appointment.reminderLeadMinutes === null) return;
  const runAt = new Date(appointment.startsAt.getTime() - appointment.reminderLeadMinutes * 60_000);
  if (runAt > deps.clock.now()) await deps.reminders.schedule(appointment.id, runAt);
}

async function handle(deps: NotifyDeps, event: SchedulingEvent) {
  const a = event.appointment;
  const barber = await deps.people.barber(a.barberId);
  const barberUser = barber ? await deps.people.user(barber.userId) : null;
  const customer = await deps.people.user(a.customerId);
  if (!barber || !barberUser || !customer)
    throw new Error(`missing people for appointment ${a.id}`);

  const tz = barber.timezone;
  const toBarber = { userId: barber.userId, email: barberUser.email };
  const toCustomer = { userId: a.customerId, email: customer.email };
  // whoever acted already knows; the other side gets told
  const byCustomer = event.byUserId === a.customerId;

  switch (event.type) {
    case 'booked':
      await notify(
        deps,
        toBarber,
        'appointment_booked',
        'New booking',
        `${customer.name} booked ${a.serviceName} on ${when(a.startsAt, tz)}.`,
        a.id,
      );
      await scheduleReminder(deps, a);
      break;
    case 'canceled': {
      await deps.reminders.cancel(a.id);
      if (byCustomer) {
        await notify(
          deps,
          toBarber,
          'appointment_canceled',
          'Appointment canceled',
          `${customer.name} canceled ${a.serviceName} on ${when(a.startsAt, tz)}.`,
          a.id,
        );
      } else {
        const why = cancelReasonText(a.cancelReason);
        await notify(
          deps,
          toCustomer,
          'appointment_canceled',
          'Appointment canceled',
          `Your ${a.serviceName} with ${barberUser.name} on ${when(a.startsAt, tz)} was canceled${why ? `: ${why}` : ''}.`,
          a.id,
        );
      }
      break;
    }
    case 'rescheduled': {
      await deps.reminders.cancel(a.id);
      await scheduleReminder(deps, a);
      const moved = `from ${when(event.previousStartsAt, tz)} to ${when(a.startsAt, tz)}`;
      if (byCustomer) {
        await notify(
          deps,
          toBarber,
          'appointment_rescheduled',
          'Appointment moved',
          `${customer.name} moved ${a.serviceName} ${moved}.`,
          a.id,
        );
      } else {
        await notify(
          deps,
          toCustomer,
          'appointment_rescheduled',
          'Appointment moved',
          `Your ${a.serviceName} with ${barberUser.name} moved ${moved}.`,
          a.id,
        );
      }
      break;
    }
  }

  await deps.agenda.publish(a.barberId, {
    type: event.type,
    appointment: a,
    ...(event.type === 'rescheduled' ? { previousStartsAt: event.previousStartsAt } : {}),
  });
}

/**
 * The adapter behind scheduling's SchedulingEvents port. A failure here is logged and never
 * thrown: the booking that caused the event is already committed and must not look failed.
 */
export async function handleSchedulingEvents(deps: NotifyDeps, events: SchedulingEvent[]) {
  for (const event of events) {
    try {
      await handle(deps, event);
    } catch (error) {
      deps.logError(error);
    }
  }
}
