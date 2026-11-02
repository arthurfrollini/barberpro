import { DomainError } from '../../../shared/domain/domain-error.js';

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export function assertPasswordPolicy(raw: string): void {
  if (raw.length < PASSWORD_MIN || raw.length > PASSWORD_MAX) {
    throw new DomainError(
      'WEAK_PASSWORD',
      `Use a password between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters.`,
    );
  }
}
