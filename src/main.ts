import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createContainer } from './container.js';
import { loadEnvFile } from './load-env-file.js';

loadEnvFile();
const config = loadConfig(process.env);
const container = await createContainer(config);
const app = await buildApp(container);

const shutdown = async () => {
  await app.close();
  await container.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await app.listen({ port: config.port, host: '0.0.0.0' });
