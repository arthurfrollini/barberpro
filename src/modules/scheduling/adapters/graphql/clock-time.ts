import { DomainError } from '../../../../shared/domain/domain-error.js';

const HH_MM = /^(\d{2}):(\d{2})$/;

/** "14:30" → 870 minutes after midnight; "24:00" is the end of the day. */
export function parseClockTime(value: string): number {
  const m = HH_MM.exec(value);
  const minutes = m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
  if (!m || Number(m[2]) > 59 || minutes > 1440) {
    throw new DomainError('INVALID_SCHEDULE', `"${value}" is not a time written as HH:MM.`);
  }
  return minutes;
}

export function formatClockTime(minutes: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}
