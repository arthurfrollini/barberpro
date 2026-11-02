import { QueryFailedError } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { logSafeError } from './log-safe-error.js';

describe('logSafeError', () => {
  it('keeps what helps debugging and drops query parameters', () => {
    const error = new QueryFailedError(
      'INSERT INTO users VALUES ($1, $2)',
      ['ana@x.com', '$argon2id$v=19$secret-hash'],
      Object.assign(new Error('duplicate key value violates unique constraint "users_email_key"'), {
        code: '23505',
        detail: 'Key (email)=(ana@x.com) already exists.',
      }),
    );

    const logged = JSON.stringify(logSafeError(error));

    expect(logged).toContain('QueryFailedError');
    expect(logged).toContain('users_email_key');
    expect(logged).toContain('23505');
    expect(logged).not.toContain('argon2id');
    expect(logged).not.toContain('ana@x.com');
  });

  it('passes plain errors through with name, message and stack', () => {
    const logged = logSafeError(new RangeError('boom'));

    expect(logged).toMatchObject({ type: 'RangeError', message: 'boom' });
    expect(logged.stack).toContain('boom');
  });
});
