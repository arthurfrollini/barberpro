import { createHash, randomBytes } from 'node:crypto';
import type { Secrets } from '../../application/ports.js';

export const nodeSecrets: Secrets = {
  // 32 random bytes; base64url so the token is safe in URLs and headers
  random: () => randomBytes(32).toString('base64url'),
  // a fast hash is enough here: the input is random, not a human-chosen password
  hash: (raw) => createHash('sha256').update(raw).digest('hex'),
};
