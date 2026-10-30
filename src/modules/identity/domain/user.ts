import { randomUUID } from 'node:crypto';
import { DomainError } from '../../../shared/domain/domain-error.js';
import type { Email } from './email.js';

export type UserProps = {
  id: string;
  name: string;
  email: Email;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

function cleanName(raw: string): string {
  const name = raw.trim();
  if (name.length < 1 || name.length > 80) {
    throw new DomainError('INVALID_NAME', 'Name must have 1 to 80 characters.');
  }
  return name;
}

/**
 * One account for every role: whether a user is a customer, a shop owner or a barber comes
 * from data elsewhere (owns a shop, has a barber profile), not from a role column here.
 */
export class User {
  private constructor(private props: UserProps) {}

  static create(input: { name: string; email: Email; passwordHash: string; now: Date }): User {
    return new User({
      id: randomUUID(),
      name: cleanName(input.name),
      email: input.email,
      passwordHash: input.passwordHash,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  /** Rebuilds a user already stored; no validation, the data was valid when saved. */
  static restore(props: UserProps): User {
    return new User({ ...props });
  }

  get id() {
    return this.props.id;
  }
  get name() {
    return this.props.name;
  }
  get email() {
    return this.props.email;
  }
  get passwordHash() {
    return this.props.passwordHash;
  }
  get createdAt() {
    return this.props.createdAt;
  }
  get updatedAt() {
    return this.props.updatedAt;
  }

  rename(name: string, now: Date): void {
    this.props.name = cleanName(name);
    this.props.updatedAt = now;
  }
}
