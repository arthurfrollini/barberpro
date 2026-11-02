import { DomainError } from './domain-error.js';

/** Trims a text field and checks its length, throwing `code` when it does not fit. */
export function cleanText(
  raw: string,
  rule: { min: number; max: number; code: string; message: string },
): string {
  const value = raw.trim();
  if (value.length < rule.min || value.length > rule.max) {
    throw new DomainError(rule.code, rule.message);
  }
  return value;
}
