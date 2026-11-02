import { describe, expect, it } from 'vitest';
import { Email } from './email.js';
import { assertPasswordPolicy } from './password.js';
import { User } from './user.js';

const now = new Date('2026-11-02T12:00:00Z');

describe('Email', () => {
  it('trims and lowercases, so Ana@X.com and ana@x.com are one account', () => {
    expect(Email.parse('  Ana@Example.COM ').value).toBe('ana@example.com');
  });

  it.each(['', 'ana', 'ana@', '@x.com', 'ana@x', 'a b@x.com'])('rejects %j', (raw) => {
    expect(() => Email.parse(raw)).toThrow(expect.objectContaining({ code: 'INVALID_EMAIL' }));
  });
});

describe('password policy', () => {
  it('accepts 8 to 128 characters', () => {
    expect(() => assertPasswordPolicy('12345678')).not.toThrow();
    expect(() => assertPasswordPolicy('x'.repeat(128))).not.toThrow();
  });

  it.each(['1234567', 'x'.repeat(129)])('rejects a password of length %#', (raw) => {
    expect(() => assertPasswordPolicy(raw)).toThrow(
      expect.objectContaining({ code: 'WEAK_PASSWORD' }),
    );
  });
});

describe('User', () => {
  const create = (name: string) =>
    User.create({ name, email: Email.parse('ana@x.com'), passwordHash: 'h', now });

  it('trims the name and stamps both dates', () => {
    const user = create('  Ana Souza ');

    expect(user.name).toBe('Ana Souza');
    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(user.createdAt).toEqual(now);
    expect(user.updatedAt).toEqual(now);
  });

  it.each(['', '   ', 'x'.repeat(81)])('rejects the name %j', (name) => {
    expect(() => create(name)).toThrow(expect.objectContaining({ code: 'INVALID_NAME' }));
  });

  it('renames and moves updatedAt', () => {
    const user = create('Ana');
    const later = new Date('2026-11-03T12:00:00Z');

    user.rename(' Ana S. ', later);

    expect(user.name).toBe('Ana S.');
    expect(user.updatedAt).toEqual(later);
    expect(user.createdAt).toEqual(now);
  });
});
