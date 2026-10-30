import { type Job, Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import type {
  MailMessage,
  MailQueue,
  ReminderScheduler,
} from '../../../modules/notifications/application/ports.js';
import type { Mailer } from '../../../modules/shops/application/ports.js';
import type { Clock } from '../../application/clock.js';

export const MAIL_QUEUE = 'mail';
export const REMINDER_QUEUE = 'reminders';

/** BullMQ needs its own connection with no per-command retry limit. */
export function createQueueConnection(redisUrl: string): Redis {
  return new Redis(redisUrl, { maxRetriesPerRequest: null });
}

const reminderJobId = (appointmentId: string) => `reminder-${appointmentId}`;

/**
 * Email goes out from the worker, with retries, so a slow or down SMTP server never makes a
 * request slow or failed. It also implements the shops module's Mailer, for invites.
 */
export class BullMqMailQueue implements MailQueue, Mailer {
  private readonly queue: Queue<MailMessage>;

  constructor(connection: Redis, prefix: string) {
    this.queue = new Queue(MAIL_QUEUE, { connection, prefix });
  }

  async enqueue(message: MailMessage): Promise<void> {
    await this.queue.add('send', message, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: 1_000,
      removeOnFail: 5_000,
    });
  }

  send(message: MailMessage): Promise<void> {
    return this.enqueue(message);
  }

  close(): Promise<void> {
    return this.queue.close();
  }
}

/** One delayed job per appointment, keyed by its id, so scheduling again replaces it. */
export class BullMqReminders implements ReminderScheduler {
  private readonly queue: Queue<{ appointmentId: string }>;

  constructor(
    connection: Redis,
    prefix: string,
    private readonly clock: Clock,
  ) {
    this.queue = new Queue(REMINDER_QUEUE, { connection, prefix });
  }

  async schedule(appointmentId: string, runAt: Date): Promise<void> {
    await this.cancel(appointmentId);
    await this.queue.add(
      'remind',
      { appointmentId },
      {
        jobId: reminderJobId(appointmentId),
        delay: Math.max(0, runAt.getTime() - this.clock.now().getTime()),
        attempts: 3,
        removeOnComplete: true,
        removeOnFail: 1_000,
      },
    );
  }

  async cancel(appointmentId: string): Promise<void> {
    // 0 when there is no such job; a job already running is left to finish (it re-checks)
    await this.queue.remove(reminderJobId(appointmentId)).catch(() => 0);
  }

  /** For tests and debugging: the delay of the pending job, if any. */
  async pending(appointmentId: string): Promise<{ delayMs: number } | null> {
    const job = await this.queue.getJob(reminderJobId(appointmentId));
    return job ? { delayMs: job.delay } : null;
  }

  close(): Promise<void> {
    return this.queue.close();
  }
}

/** The worker process: sends queued email and fires reminders. */
export function startWorkers(input: {
  connection: Redis;
  prefix: string;
  mailer: Mailer;
  sendReminder: (appointmentId: string) => Promise<void>;
  onError?: (error: unknown, job?: Job) => void;
}) {
  const mail = new Worker<MailMessage>(MAIL_QUEUE, (job) => input.mailer.send(job.data), {
    connection: input.connection,
    prefix: input.prefix,
  });
  const reminders = new Worker<{ appointmentId: string }>(
    REMINDER_QUEUE,
    (job) => input.sendReminder(job.data.appointmentId),
    { connection: input.connection, prefix: input.prefix },
  );
  for (const worker of [mail, reminders]) {
    worker.on('failed', (job, error) => input.onError?.(error, job));
  }
  return {
    async close() {
      await Promise.all([mail.close(), reminders.close()]);
    },
  };
}
