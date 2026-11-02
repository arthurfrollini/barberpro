import type { Clock } from '../../../shared/application/clock.js';
import type { Appointment } from '../../scheduling/domain/appointment.js';
import type {
  AgendaChange,
  MailMessage,
  NotificationRepository,
  NotifyDeps,
} from '../application/ports.js';
import type { Notification } from '../domain/notification.js';

/** Recording fakes for every port the notification use cases need. */
export function fakeNotifyDeps(
  clock: Clock,
  data: {
    users: Record<string, { name: string; email: string }>;
    barbers: Record<string, { userId: string; timezone: string }>;
  },
) {
  const saved: Notification[] = [];
  const mail: MailMessage[] = [];
  const reminderJobs = new Map<string, Date>();
  const agendaChanges: { barberId: string; change: AgendaChange }[] = [];
  const appointmentRows = new Map<string, Appointment>();
  const errors: unknown[] = [];

  const notifications: NotificationRepository = {
    insert: async (n) => {
      saved.push(...n);
    },
    listForUser: async (userId) => saved.filter((n) => n.userId === userId),
    markRead: async () => false,
    unreadCount: async (userId) => saved.filter((n) => n.userId === userId).length,
  };

  const deps = {
    notifications,
    mailQueue: {
      enqueue: async (m: MailMessage) => {
        mail.push(m);
      },
    },
    reminders: {
      schedule: async (id: string, runAt: Date) => {
        reminderJobs.set(id, runAt);
      },
      cancel: async (id: string) => {
        reminderJobs.delete(id);
      },
    },
    agenda: {
      publish: async (barberId: string, change: AgendaChange) => {
        agendaChanges.push({ barberId, change });
      },
    },
    people: {
      user: async (id: string) => data.users[id] ?? null,
      barber: async (id: string) => data.barbers[id] ?? null,
    },
    appointments: { findById: async (id: string) => appointmentRows.get(id) ?? null },
    clock,
    logError: (error: unknown) => errors.push(error),
  } satisfies NotifyDeps;

  return { ...deps, saved, mail, reminderJobs, agendaChanges, appointmentRows, errors };
}
