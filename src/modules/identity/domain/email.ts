import { DomainError } from '../../../shared/domain/domain-error.js';

// deliberately loose: real validation is the confirmation email, not a regex
const SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A normalized email: trimmed and lowercased, so one person never gets two accounts. */
export class Email {
  private constructor(readonly value: string) {}

  static parse(raw: string): Email {
    const value = raw.trim().toLowerCase();
    if (value.length > 254 || !SHAPE.test(value)) {
      throw new DomainError('INVALID_EMAIL', 'Enter a valid email address.');
    }
    return new Email(value);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
