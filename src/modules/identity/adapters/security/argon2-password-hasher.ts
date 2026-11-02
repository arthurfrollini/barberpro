import argon2 from 'argon2';
import type { PasswordHasher } from '../../application/ports.js';

/** argon2id with the library defaults (OWASP-recommended memory-hard hashing). */
export class Argon2PasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}
