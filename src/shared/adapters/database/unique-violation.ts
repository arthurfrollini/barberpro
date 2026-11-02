import { QueryFailedError } from 'typeorm';

/** True when the error is Postgres rejecting a duplicate on the named unique constraint. */
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError = error.driverError as { code?: string; constraint?: string };
  return driverError.code === '23505' && driverError.constraint === constraint;
}
