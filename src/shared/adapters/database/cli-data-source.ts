// Entry point for the TypeORM CLI (npm run migration:run and friends).
import { loadConfig } from '../../../config.js';
import { loadEnvFile } from '../../../load-env-file.js';
import { createDataSource } from './data-source.js';

loadEnvFile();

export default createDataSource(loadConfig(process.env).databaseUrl);
