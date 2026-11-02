import type { Clock } from '../../../shared/application/clock.js';
import { DomainError } from '../../../shared/domain/domain-error.js';
import { inMemoryShopsDeps } from '../../shops/testing/in-memory.js';
import type {
  AppointmentRepository,
  ScheduleRepository,
  SchedulingDeps,
  SchedulingEvent,
  SchedulingEvents,
  SchedulingRepositories,
  ShopDirectory,
} from '../application/ports.js';
import { Appointment, type AppointmentProps } from '../domain/appointment.js';
import { WeeklySchedule } from '../domain/weekly-schedule.js';

export class InMemoryScheduleRepository implements ScheduleRepository {
  private readonly weekly = new Map<string, WeeklySchedule>();
  private readonly blocked = new Map<string, Set<string>>();

  async get(barberId: string) {
    return {
      schedule: this.weekly.get(barberId) ?? WeeklySchedule.empty(),
      blockedDates: new Set(this.blocked.get(barberId) ?? []),
    };
  }
  async replaceWeekly(barberId: string, schedule: WeeklySchedule) {
    this.weekly.set(barberId, schedule);
  }
  async block(barberId: string, date: string) {
    this.blocked.set(barberId, new Set([...(this.blocked.get(barberId) ?? []), date]));
  }
  async unblock(barberId: string, date: string) {
    this.blocked.get(barberId)?.delete(date);
  }
  // single-threaded: nothing to wait for
  async lockBarber() {}
}

const copy = (a: Appointment) =>
  Appointment.restore({
    id: a.id,
    barberId: a.barberId,
    barberUserId: a.barberUserId,
    customerId: a.customerId,
    serviceId: a.serviceId,
    serviceName: a.serviceName,
    priceCents: a.priceCents,
    durationMinutes: a.durationMinutes,
    startsAt: a.startsAt,
    endsAt: a.endsAt,
    reminderLeadMinutes: a.reminderLeadMinutes,
    status: a.status,
    cancelReason: a.cancelReason,
    canceledBy: a.canceledBy,
    canceledAt: a.canceledAt,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  } satisfies AppointmentProps);

/** Stores copies and imitates the exclusion constraints of the real table. */
export class InMemoryAppointmentRepository implements AppointmentRepository {
  readonly rows = new Map<string, Appointment>();

  private assertNoOverlap(a: Appointment) {
    if (a.status !== 'booked') return;
    for (const other of this.rows.values()) {
      const overlaps =
        other.id !== a.id &&
        other.status === 'booked' &&
        other.startsAt < a.endsAt &&
        a.startsAt < other.endsAt;
      if (overlaps && (other.barberId === a.barberId || other.barberUserId === a.barberUserId)) {
        throw new DomainError('SLOT_UNAVAILABLE', 'This time is no longer available.');
      }
      if (overlaps && other.customerId === a.customerId) {
        throw new DomainError('CUSTOMER_BUSY', 'You already have an appointment at this time.');
      }
    }
  }

  async findById(id: string) {
    const a = this.rows.get(id);
    return a ? copy(a) : null;
  }
  async findByIds(ids: readonly string[]) {
    return ids.flatMap((id) => {
      const a = this.rows.get(id);
      return a ? [copy(a)] : [];
    });
  }
  async insert(a: Appointment) {
    this.assertNoOverlap(a);
    this.rows.set(a.id, copy(a));
  }
  async update(a: Appointment) {
    this.assertNoOverlap(a);
    this.rows.set(a.id, copy(a));
  }
  private sorted(filter: (a: Appointment) => boolean) {
    return [...this.rows.values()]
      .filter(filter)
      .sort((x, y) => x.startsAt.getTime() - y.startsAt.getTime())
      .map(copy);
  }
  async busyFor(barberUserId: string, from: Date, to: Date, excludeId?: string) {
    return this.sorted(
      (a) =>
        a.barberUserId === barberUserId &&
        a.status === 'booked' &&
        a.id !== excludeId &&
        a.startsAt < to &&
        a.endsAt > from,
    ).map((a) => ({ startsAt: a.startsAt, endsAt: a.endsAt }));
  }
  async bookedFrom(barberId: string, from: Date) {
    return this.sorted(
      (a) => a.barberId === barberId && a.status === 'booked' && a.startsAt >= from,
    );
  }
  async forCustomer(customerId: string, from?: Date) {
    const rows = this.sorted((a) => a.customerId === customerId && (!from || a.startsAt >= from));
    return from ? rows : rows.reverse().slice(0, 100);
  }
  async forBarberBetween(barberId: string, from: Date, to: Date) {
    return this.sorted((a) => a.barberId === barberId && a.startsAt >= from && a.startsAt < to);
  }
}

export class RecordingEvents implements SchedulingEvents {
  readonly published: SchedulingEvent[] = [];
  async publish(events: SchedulingEvent[]) {
    this.published.push(...events);
  }
}

export function inMemorySchedulingDeps(clock: Clock) {
  const shopsDeps = inMemoryShopsDeps(clock);
  const repos: SchedulingRepositories = {
    schedules: new InMemoryScheduleRepository(),
    appointments: new InMemoryAppointmentRepository(),
  };
  const directory: ShopDirectory = {
    barber: (id) => shopsDeps.barbers.findById(id),
    shop: (id) => shopsDeps.shops.findById(id),
    service: (id) => shopsDeps.services.findById(id),
  };
  const events = new RecordingEvents();
  const deps: SchedulingDeps = {
    ...repos,
    directory,
    events,
    clock,
    transaction: (work) => work(repos),
  };
  return {
    ...deps,
    events,
    appointments: repos.appointments as InMemoryAppointmentRepository,
    shopsDeps,
  };
}
