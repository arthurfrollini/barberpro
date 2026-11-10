import type { Clock } from '../../../shared/application/clock.js';
import type { Appointment } from '../../scheduling/domain/appointment.js';
import type { Notification } from '../domain/notification.js';
import type { PushPlatform } from '../domain/push-token.js';

export interface NotificationRepository {
  insert(notifications: Notification[]): Promise<void>;
  /** Newest first. */
  listForUser(userId: string, page: { limit: number; offset: number }): Promise<Notification[]>;
  /** Marks it read if it belongs to `userId`; false when there is no such notification. */
  markRead(id: string, userId: string, at: Date): Promise<boolean>;
  unreadCount(userId: string): Promise<number>;
}

export type SavePushToken = { token: string; userId: string; platform: PushPlatform; at: Date };

/** The phones that get a user's notifications as pushes, one row per install of the app. */
export interface PushTokenRepository {
  /** Insert, or move an existing token to `userId`. */
  save(input: SavePushToken): Promise<void>;
  /** False when there is no such token (or, given a user, when it is not theirs). */
  remove(token: string, userId: string | null): Promise<boolean>;
  forUser(userId: string): Promise<{ token: string; platform: PushPlatform }[]>;
  /** Tokens Expo reported as no longer registered, whoever they belong to. */
  removeTokens(tokens: string[]): Promise<void>;
}

export type MailMessage = { to: string; subject: string; text: string };

/** Email leaves through a queue; the request that caused it never waits on SMTP. */
export interface MailQueue {
  enqueue(message: MailMessage): Promise<void>;
}

/** A push to every phone of `userId`; `url` is where a tap opens the app. */
export type PushJob = { userId: string; title: string; body: string; url: string };

/** Pushes leave through a queue too; the worker sends them to Expo. */
export interface PushQueue {
  enqueue(job: PushJob): Promise<void>;
}

/** One message to one phone, in the shape of Expo's push API. */
export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data: { url: string };
  badge: number;
  sound: 'default';
};

type PushError = { status: 'error'; message: string; details?: { error?: string } };

/** Expo's answer per message, in the order sent: accepted (with an id for the receipt) or not. */
export type PushTicket = { status: 'ok'; id: string } | PushError;

/** What Expo learned from Apple or Google, available a while after the ticket. */
export type PushReceipt = { status: 'ok' } | PushError;

export interface PushSender {
  send(messages: PushMessage[]): Promise<PushTicket[]>;
  /** Receipts by ticket id; an id missing from the result is not ready yet (or expired). */
  receipts(ids: string[]): Promise<Record<string, PushReceipt>>;
}

export type ReceiptCheck = { tickets: { id: string; token: string }[] };

/** Looks at the receipts of accepted tickets later, when Expo has them. */
export interface PushReceiptScheduler {
  schedule(check: ReceiptCheck): Promise<void>;
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
  pushTokens: PushTokenRepository;
  mailQueue: MailQueue;
  pushQueue: PushQueue;
  reminders: ReminderScheduler;
  agenda: AgendaPublisher;
  people: People;
  appointments: { findById(id: string): Promise<Appointment | null> };
  clock: Clock;
  logError: (error: unknown) => void;
};
