import { Notification } from '../domain/notification.js';
import { clockTime } from './messages.js';
import { deliver } from './handle-events.js';
import type { NotifyDeps } from './ports.js';
import { pushText, pushUrl } from './push-messages.js';

// a job may run a little late; one that runs well before its time belongs to an old schedule
const EARLY_TOLERANCE_MS = 60_000;

/** The reminder job. It re-reads the appointment, so a stale job sends nothing. */
export async function sendReminder(deps: NotifyDeps, appointmentId: string): Promise<void> {
  const a = await deps.appointments.findById(appointmentId);
  if (!a || a.status !== 'booked' || a.reminderLeadMinutes === null) return;

  const now = deps.clock.now().getTime();
  const runAt = a.startsAt.getTime() - a.reminderLeadMinutes * 60_000;
  if (now < runAt - EARLY_TOLERANCE_MS || now >= a.startsAt.getTime()) return;

  const barber = await deps.people.barber(a.barberId);
  const barberUser = barber ? await deps.people.user(barber.userId) : null;
  const customer = await deps.people.user(a.customerId);
  if (!barber || !barberUser || !customer) return;

  const time = clockTime(a.startsAt, barber.timezone);
  const title = `Reminder: ${a.serviceName} at ${time}`;
  const body = `${a.serviceName} with ${barberUser.name} at ${time}, in ${a.reminderLeadMinutes} minutes.`;
  await deps.notifications.insert([
    Notification.create(
      {
        userId: a.customerId,
        type: 'appointment_reminder',
        title,
        body,
        appointmentId: a.id,
        appointmentStartsAt: a.startsAt,
      },
      deps.clock.now(),
    ),
  ]);
  const push = pushText({
    kind: 'reminder',
    customer: customer.name,
    barber: barberUser.name,
    service: a.serviceName,
    startsAt: a.startsAt,
    timeZone: barber.timezone,
  });
  await deliver(deps, {
    email: { to: customer.email, subject: title, text: body },
    push: { userId: a.customerId, ...push, url: pushUrl('customer', a.id) },
  });
}
