import type { CancelReason } from '@/gql/graphql';

const TWO_HOURS = 2 * 3_600_000;

/**
 * Cancel and reschedule close 2 hours before the start. The API enforces it; the app mirrors
 * it only to disable the buttons and say why.
 */
export function canChange(startsAt: string, now: number = Date.now()): boolean {
  return Date.parse(startsAt) - now >= TWO_HOURS;
}

const REASONS: Record<CancelReason, string> = {
  CUSTOMER: 'Você cancelou.',
  BARBER: 'O barbeiro cancelou.',
  DAY_BLOCKED: 'O barbeiro fechou a agenda neste dia.',
  SCHEDULE_CHANGED: 'O barbeiro mudou os horários de atendimento.',
  BARBER_REMOVED: 'O barbeiro saiu da barbearia.',
};

export const cancelReasonLabel = (reason: CancelReason | null | undefined) =>
  reason ? REASONS[reason] : '';

export function reminderLabel(minutes: number | null | undefined): string {
  if (!minutes) return 'Sem lembrete';
  return minutes % 60 === 0 ? `${minutes / 60} h antes` : `${minutes} min antes`;
}
