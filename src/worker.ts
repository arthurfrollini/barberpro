import { loadConfig } from './config.js';
import { createContainer } from './container.js';
import { loadEnvFile } from './load-env-file.js';
import { sendReminder } from './modules/notifications/application/reminders.js';
import { revokeUndeliveredInvite } from './modules/shops/application/invites.js';
import { logSafeError } from './shared/adapters/log-safe-error.js';
import { SmtpMailer } from './shared/adapters/mail/smtp-mailer.js';
import { createQueueConnection, startWorkers } from './shared/adapters/queue/bullmq.js';

// The second process: it drains the queues the API fills (email, reminders).
loadEnvFile();
const config = loadConfig(process.env);
const container = await createContainer(config);
const connection = createQueueConnection(config.redisUrl);

const workers = startWorkers({
  connection,
  prefix: config.queuePrefix,
  mailer: new SmtpMailer(config.smtpUrl, config.mailFrom),
  sendReminder: (appointmentId) => sendReminder(container.notifications, appointmentId),
  onMailGaveUp: async (message) => {
    if (message.inviteId) await revokeUndeliveredInvite(container.shops, message.inviteId);
  },
  onError: (error, job) =>
    console.error(
      JSON.stringify({ msg: 'job failed', queue: job?.queueName, error: logSafeError(error) }),
    ),
});
console.log(JSON.stringify({ msg: 'worker started', prefix: config.queuePrefix }));

const shutdown = async () => {
  await workers.close();
  connection.disconnect();
  await container.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
