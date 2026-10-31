import type { AgendaAppointment } from '@/features/agenda/api/agenda';

let n = 0;

/** A booked 30-minute cut; override what the test cares about. */
export function appointment(overrides: Partial<AgendaAppointment> = {}): AgendaAppointment {
  n += 1;
  const startsAt = overrides.startsAt ?? '2026-11-02T17:00:00.000Z';
  const durationMinutes = overrides.durationMinutes ?? 30;
  return {
    id: `appt-${n}`,
    startsAt,
    endsAt: new Date(Date.parse(startsAt) + durationMinutes * 60_000).toISOString(),
    status: 'BOOKED',
    serviceName: 'Corte',
    priceCents: 5000,
    durationMinutes,
    reminderLeadMinutes: 15,
    cancelReason: null,
    canceledAt: null,
    customer: { id: `customer-${n}`, name: 'Ana' },
    ...overrides,
  };
}
