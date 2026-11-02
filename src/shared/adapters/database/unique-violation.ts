import { QueryFailedError } from 'typeorm';

// SQLSTATE codes: 23505 unique_violation, 23P01 exclusion_violation
const CONSTRAINT_CODES = new Set(['23505', '23P01']);

/** True when Postgres rejected the write because of the named unique or exclusion constraint. */
export function isConstraintViolation(error: unknown, constraint: string): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError = error.driverError as { code?: string; constraint?: string };
  return CONSTRAINT_CODES.has(driverError.code ?? '') && driverError.constraint === constraint;
}

export const isUniqueViolation = isConstraintViolation;
