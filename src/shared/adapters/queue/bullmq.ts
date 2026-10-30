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

/** For workers: BullMQ needs a connection that waits for Redis instead of giving up. */
export function createQueueConnection(redisUrl: string): Redis {
  return new Redis(redisUrl, { maxRetriesPerRequest: null });
}

/**
 * For the API, which only adds jobs: fail fast while Redis is down. A request must never
 * hang waiting to enqueue an email; the failure is logged and the booking still stands.
 */
export function createProducerConnection(redisUrl: string): Redis {
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, enableOfflineQueue: false });
  // failures surface on each command; the outage itself shows on GET /health
  redis.on('error', () => {});
  return redis;
}

const reminderJobId = (appointmentId: string) => `reminder-${appointmentId}`;

// BullMQ waits for the connection to be ready before adding a job; cap that wait
const ENQUEUE_TIMEOUT_MS = 2_000;

function withTimeout<T>(work: Promise<T>, what: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${what}: Redis did not answer in time`)),
      ENQUEUE_TIMEOUT_MS,
    );
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

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
    await withTimeout(
      this.queue.add('send', message, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 1_000,
        removeOnFail: 5_000,
      }),
      'enqueue email',
    );
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
    await withTimeout(
      this.queue.add(
        'remind',
        { appointmentId },
        {
          jobId: reminderJobId(appointmentId),
          delay: Math.max(0, runAt.getTime() - this.clock.now().getTime()),
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: 1_000,
        },
      ),
      'schedule reminder',
    );
  }

  async cancel(appointmentId: string): Promise<void> {
    // 0 when there is no such job; a job already running is left to finish (it re-checks)
    await withTimeout(this.queue.remove(reminderJobId(appointmentId)), 'cancel reminder').catch(
      () => 0,
    );
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
