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
  appointment: Appointment,
) {
  await deps.notifications.insert([
    Notification.create(
      {
        userId: to.userId,
        type,
        title,
        body,
        appointmentId: appointment.id,
        appointmentStartsAt: appointment.startsAt,
      },
      deps.clock.now(),
    ),
  ]);
  await deps.mailQueue.enqueue({ to: to.email, subject: title, text: body });
}

async function scheduleReminder(deps: NotifyDeps, appointment: Appointment) {
  if (appointment.reminderLeadMinutes === null) return;
  const runAt = new Date(appointment.startsAt.getTime() - appointment.reminderLeadMinutes * 60_000);
  if (runAt > deps.clock.now()) await deps.reminders.schedule(appointment.id, runAt);
}

/** Runs one step; a failure is logged and the next step still runs. */
async function step(deps: NotifyDeps, work: () => Promise<void>) {
  try {
    await work();
  } catch (error) {
    deps.logError(error);
  }
}

async function updateReminder(deps: NotifyDeps, event: SchedulingEvent) {
  const a = event.appointment;
  if (event.type !== 'booked') await deps.reminders.cancel(a.id);
  if (event.type !== 'canceled') await scheduleReminder(deps, a);
}

/** The in-app notification and email for whoever did not make the change. */
async function notifyOtherParty(deps: NotifyDeps, event: SchedulingEvent) {
  const a = event.appointment;
  const barber = await deps.people.barber(a.barberId);
  const barberUser = barber ? await deps.people.user(barber.userId) : null;
  const customer = await deps.people.user(a.customerId);
  if (!barber || !barberUser || !customer)
    throw new Error(`missing people for appointment ${a.id}`);

  const tz = barber.timezone;
  const toBarber = { userId: barber.userId, email: barberUser.email };
  const toCustomer = { userId: a.customerId, email: customer.email };
  const byCustomer = event.byUserId === a.customerId;

  switch (event.type) {
    case 'booked':
      return notify(
        deps,
        toBarber,
        'appointment_booked',
        'New booking',
        `${customer.name} booked ${a.serviceName} on ${when(a.startsAt, tz)}.`,
        a,
      );
    case 'canceled': {
      if (byCustomer) {
        return notify(
          deps,
          toBarber,
          'appointment_canceled',
          'Appointment canceled',
          `${customer.name} canceled ${a.serviceName} on ${when(a.startsAt, tz)}.`,
          a,
        );
      }
      const why = cancelReasonText(a.cancelReason);
      return notify(
        deps,
        toCustomer,
        'appointment_canceled',
        'Appointment canceled',
        `Your ${a.serviceName} with ${barberUser.name} on ${when(a.startsAt, tz)} was canceled${why ? `: ${why}` : ''}.`,
        a,
      );
    }
    case 'rescheduled': {
      const moved = `from ${when(event.previousStartsAt, tz)} to ${when(a.startsAt, tz)}`;
      if (byCustomer) {
        return notify(
          deps,
          toBarber,
          'appointment_rescheduled',
          'Appointment moved',
          `${customer.name} moved ${a.serviceName} ${moved}.`,
          a,
        );
      }
      return notify(
        deps,
        toCustomer,
        'appointment_rescheduled',
        'Appointment moved',
        `Your ${a.serviceName} with ${barberUser.name} moved ${moved}.`,
        a,
      );
    }
  }
}

/**
 * The adapter behind scheduling's SchedulingEvents port. Each step (reminder, notification,
 * live agenda) fails on its own: errors are logged, never thrown, because the booking that
 * caused the event is already committed and must not look failed.
 */
export async function handleSchedulingEvents(deps: NotifyDeps, events: SchedulingEvent[]) {
  for (const event of events) {
    await step(deps, () => updateReminder(deps, event));
    await step(deps, () => notifyOtherParty(deps, event));
    await step(deps, () =>
      deps.agenda.publish(event.appointment.barberId, {
        type: event.type,
        appointment: event.appointment,
        ...(event.type === 'rescheduled' ? { previousStartsAt: event.previousStartsAt } : {}),
      }),
    );
  }
}
