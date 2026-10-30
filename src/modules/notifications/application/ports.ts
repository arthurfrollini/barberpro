import type { Clock } from '../../../shared/application/clock.js';
import type { Appointment } from '../../scheduling/domain/appointment.js';
import type { Notification } from '../domain/notification.js';

export interface NotificationRepository {
  insert(notifications: Notification[]): Promise<void>;
  /** Newest first. */
  listForUser(userId: string, page: { limit: number; offset: number }): Promise<Notification[]>;
  /** Marks it read if it belongs to `userId`; false when there is no such notification. */
  markRead(id: string, userId: string, at: Date): Promise<boolean>;
  unreadCount(userId: string): Promise<number>;
}

export type MailMessage = { to: string; subject: string; text: string };

/** Email leaves through a queue; the request that caused it never waits on SMTP. */
export interface MailQueue {
  enqueue(message: MailMessage): Promise<void>;
}

/** One delayed job per appointment; scheduling again replaces it. */
export interface ReminderScheduler {
  schedule(appointmentId: string, runAt: Date): Promise<void>;
  cancel(appointmentId: string): Promise<void>;
}

export type AgendaChange = {
  type: 'booked' | 'canceled' | 'rescheduled';
  appointment: Appointment;
  previousStartsAt?: Date;
};

/** Pushes a change of a barber's agenda to their open subscriptions. */
export interface AgendaPublisher {
  publish(barberId: string, change: AgendaChange): Promise<void>;
}

/** Names, emails and time zones, from the identity and shops modules. */
export interface People {
  user(id: string): Promise<{ name: string; email: string } | null>;
  barber(barberId: string): Promise<{ userId: string; timezone: string } | null>;
}

export type NotifyDeps = {
  notifications: NotificationRepository;
  mailQueue: MailQueue;
  reminders: ReminderScheduler;
  agenda: AgendaPublisher;
  people: People;
  appointments: { findById(id: string): Promise<Appointment | null> };
  clock: Clock;
  logError: (error: unknown) => void;
};
