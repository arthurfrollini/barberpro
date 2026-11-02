import { Redis } from 'ioredis';
import type { DataSource, EntityManager } from 'typeorm';
import type { Config } from './config.js';
import { TypeOrmRefreshTokenRepository } from './modules/identity/adapters/persistence/typeorm-refresh-token-repository.js';
import { TypeOrmUserRepository } from './modules/identity/adapters/persistence/typeorm-user-repository.js';
import { Argon2PasswordHasher } from './modules/identity/adapters/security/argon2-password-hasher.js';
import { JoseAccessTokens } from './modules/identity/adapters/security/jose-access-tokens.js';
import { nodeSecrets } from './modules/identity/adapters/security/node-secrets.js';
import type { IdentityDeps } from './modules/identity/application/ports.js';
import { TypeOrmNotificationRepository } from './modules/notifications/adapters/persistence/typeorm-notification-repository.js';
import { handleSchedulingEvents } from './modules/notifications/application/handle-events.js';
import type { NotifyDeps } from './modules/notifications/application/ports.js';
import { shopsRepositories } from './modules/shops/adapters/persistence/repositories.js';
import { schedulingRepositories } from './modules/scheduling/adapters/persistence/repositories.js';
import type { SchedulingDeps, SchedulingEvents } from './modules/scheduling/application/ports.js';
import { cancelFutureWithin, publishCanceled } from './modules/scheduling/application/schedule.js';
import type { Mailer, ShopsDeps } from './modules/shops/application/ports.js';
import { createDataSource } from './shared/adapters/database/data-source.js';
import { detectImageType } from './shared/adapters/files/detect-image-type.js';
import { DiskFileStorage } from './shared/adapters/files/disk-file-storage.js';
import { type AgendaPubSub, createAgendaPubSub } from './shared/adapters/graphql/pubsub.js';
import { logSafeError } from './shared/adapters/log-safe-error.js';
import {
  BullMqMailQueue,
  BullMqReminders,
  createProducerConnection,
} from './shared/adapters/queue/bullmq.js';
import { TypeOrmFileRepository } from './shared/adapters/files/typeorm-file-repository.js';
import type { HealthChecks } from './shared/adapters/http/health.js';
import { type Clock, systemClock } from './shared/application/clock.js';
import type { FileDeps } from './shared/application/files.js';

/**
 * The composition root: the one place that knows which adapter implements which port.
 * Wired by hand on purpose; a DI container would hide this in decorators.
 */
export type Container = {
  config: Config;
  clock: Clock;
  dataSource: DataSource;
  redis: Redis;
  healthChecks: HealthChecks;
  identity: IdentityDeps;
  files: FileDeps;
  shops: ShopsDeps;
  scheduling: SchedulingDeps;
  notifications: NotifyDeps;
  pubSub: AgendaPubSub;
  close(): Promise<void>;
};

export type ContainerOptions = {
  /** Tests pass a FixedClock to control "now". */
  clock?: Clock;
  /** Tests pass a fake to read the emails the API sends. */
  mailer?: Mailer;
  /** Tests pass a recorder to see what scheduling published. */
  events?: SchedulingEvents;
  /** Where failures to notify are reported; they never fail the request. */
  logError?: (error: unknown) => void;
};

export async function createContainer(
  config: Config,
  options: ContainerOptions = {},
): Promise<Container> {
  const clock = options.clock ?? systemClock;
  const dataSource = createDataSource(config.databaseUrl);
  await dataSource.initialize();
  const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 1 });
  const logError =
    options.logError ??
    ((error: unknown) =>
      console.error(JSON.stringify({ msg: 'background failure', error: logSafeError(error) })));
  const queueConnection = createProducerConnection(config.redisUrl);
  const mailQueue = new BullMqMailQueue(queueConnection, config.queuePrefix);
  const reminders = new BullMqReminders(queueConnection, config.queuePrefix, clock);
  const agendaPubSub = createAgendaPubSub(config.redisUrl, logError);

  const identityRepositories = (manager: EntityManager) => ({
    users: new TypeOrmUserRepository(manager),
    refreshTokens: new TypeOrmRefreshTokenRepository(manager),
  });
  const identity: IdentityDeps = {
    ...identityRepositories(dataSource.manager),
    transaction: (work) => dataSource.transaction((manager) => work(identityRepositories(manager))),
    hasher: new Argon2PasswordHasher(),
    accessTokens: new JoseAccessTokens(config.jwtSecret, config.accessTokenTtlSeconds, clock),
    secrets: nodeSecrets,
    clock,
    refreshTokenTtlDays: config.refreshTokenTtlDays,
  };

  const files: FileDeps = {
    files: new TypeOrmFileRepository(dataSource.manager),
    storage: new DiskFileStorage(config.uploadDir),
    clock,
    detectType: detectImageType,
  };

  const shops: ShopsDeps = {
    ...shopsRepositories(dataSource.manager),
    transaction: (work) => dataSource.transaction((manager) => work(shopsRepositories(manager))),
    files: files.files,
    users: identity.users,
    // invites go through the same mail queue the worker drains
    mailer: options.mailer ?? mailQueue,
    secrets: nodeSecrets,
    clock,
    inviteLink: (token) => `${config.dashboardUrl}/convite?codigo=${encodeURIComponent(token)}`,
    // rule 7: the removal and the cancellations share one transaction
    persistRemoval: async (barber, byUserId) => {
      const canceled = await dataSource.transaction(async (manager) => {
        const tx = schedulingRepositories(manager);
        const future = await cancelFutureWithin(tx, barber.id, byUserId, clock.now());
        await shopsRepositories(manager).barbers.save(barber);
        return future;
      });
      await publishCanceled(scheduling, canceled, byUserId);
    },
  };

  const scheduling: SchedulingDeps = {
    ...schedulingRepositories(dataSource.manager),
    transaction: (work) =>
      dataSource.transaction((manager) => work(schedulingRepositories(manager))),
    directory: {
      barber: (id) => shops.barbers.findById(id),
      shop: (id) => shops.shops.findById(id),
      service: (id) => shops.services.findById(id),
    },
    events: options.events ?? {
      publish: (events) => handleSchedulingEvents(notifications, events),
    },
    clock,
  };

  const notifications: NotifyDeps = {
    notifications: new TypeOrmNotificationRepository(dataSource.manager),
    mailQueue,
    reminders,
    agenda: {
      publish: async (barberId, change) => {
        agendaPubSub.pubSub.publish('agendaChanged', barberId, {
          type: change.type,
          appointmentId: change.appointment.id,
          previousStartsAt: change.previousStartsAt?.toISOString() ?? null,
        });
      },
    },
    people: {
      user: async (id) => {
        const user = await identity.users.findById(id);
        return user ? { name: user.name, email: user.email.value } : null;
      },
      barber: async (barberId) => {
        const barber = await shops.barbers.findById(barberId);
        const shop = barber ? await shops.shops.findById(barber.shopId) : null;
        return barber && shop ? { userId: barber.userId, timezone: shop.timezone } : null;
      },
    },
    appointments: { findById: (id) => scheduling.appointments.findById(id) },
    clock,
    logError,
  };

  return {
    config,
    clock,
    dataSource,
    redis,
    healthChecks: {
      postgres: () => dataSource.query('SELECT 1'),
      redis: () => redis.ping(),
    },
    identity,
    files,
    shops,
    scheduling,
    notifications,
    pubSub: agendaPubSub.pubSub,
    async close() {
      agendaPubSub.close();
      await Promise.all([mailQueue.close(), reminders.close()]);
      queueConnection.disconnect();
      redis.disconnect();
      await dataSource.destroy();
    },
  };
}
