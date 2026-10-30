import { QueryFailedError } from 'typeorm';

export type LoggedError = { type: string; message: string; code?: string; stack?: string };

/**
 * What an unexpected error may put in the logs. A TypeORM QueryFailedError carries the
 * query parameters and the driver's detail line, which can hold emails and password
 * hashes, so only its message and SQLSTATE code are kept.
 */
export function logSafeError(error: unknown): LoggedError {
  if (error instanceof QueryFailedError) {
    const code = (error.driverError as { code?: string }).code;
    return {
      type: 'QueryFailedError',
      message: error.message,
      ...(code ? { code } : {}),
      ...(error.stack ? { stack: error.stack } : {}),
    };
  }
  if (error instanceof Error) {
    return {
      type: error.name,
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
    };
  }
  return { type: typeof error, message: String(error) };
}
