/**
 * An expected failure of a business rule. The code is stable and reaches API clients
 * (GraphQL `extensions.code`), so clients can branch on it; the message is for humans.
 */
export class DomainError extends Error {
  override readonly name = 'DomainError';

  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
