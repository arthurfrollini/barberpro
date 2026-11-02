import { describe, expect, it } from 'vitest';
import { DomainError } from './domain-error.js';

describe('DomainError', () => {
  it('carries a stable code next to the message', () => {
    const error = new DomainError('SLOT_UNAVAILABLE', 'This time is no longer available.');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('DomainError');
    expect(error.code).toBe('SLOT_UNAVAILABLE');
    expect(error.message).toBe('This time is no longer available.');
  });
});
