import { DomainError } from '../../../shared/domain/domain-error.js';

/** Minutes before the appointment to remind the customer: none, or 5 to 60 in steps of 5. */
export function parseReminderLead(minutes: number | null): number | null {
  if (minutes === null) return null;
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 60 || minutes % 5 !== 0) {
    throw new DomainError(
      'INVALID_REMINDER_LEAD',
      'Reminder must be 5 to 60 minutes before, in steps of 5, or none.',
    );
  }
  return minutes;
}
