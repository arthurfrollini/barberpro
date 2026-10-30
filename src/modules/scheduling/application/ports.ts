import type { Clock } from '../../../shared/application/clock.js';
import type { Barber } from '../../shops/domain/barber.js';
import type { Barbershop } from '../../shops/domain/barbershop.js';
import type { Service } from '../../shops/domain/service.js';
import type { Appointment } from '../domain/appointment.js';
import type { TimeRange } from '../domain/availability.js';
import type { WeeklySchedule } from '../domain/weekly-schedule.js';

export type ScheduleView = { schedule: WeeklySchedule; blockedDates: Set<string> };
export type ScheduleUpdate = { schedule: WeeklySchedule; canceled: Appointment[] };

export interface ScheduleRepository {
  get(barberId: string): Promise<ScheduleView>;
  replaceWeekly(barberId: string, schedule: WeeklySchedule): Promise<void>;
  block(barberId: string, date: string): Promise<void>;
  unblock(barberId: string, date: string): Promise<void>;
}

export interface AppointmentRepository {
  findById(id: string): Promise<Appointment | null>;
  findByIds(ids: readonly string[]): Promise<Appointment[]>;
  /** Throws SLOT_UNAVAILABLE or CUSTOMER_BUSY when the database refuses an overlap. */
  insert(appointment: Appointment): Promise<void>;
  update(appointment: Appointment): Promise<void>;
  /** Booked time of the barber overlapping [from, to), optionally ignoring one appointment. */
  busyFor(barberId: string, from: Date, to: Date, excludeId?: string): Promise<TimeRange[]>;
  /** Booked appointments of the barber starting at or after `from`. */
  bookedFrom(barberId: string, from: Date): Promise<Appointment[]>;
  /** From `from` on in time order; without `from`, the latest 100 newest first. */
  forCustomer(customerId: string, from?: Date): Promise<Appointment[]>;
  /** Every appointment (booked or canceled) starting in [from, to). */
  forBarberBetween(barberId: string, from: Date, to: Date): Promise<Appointment[]>;
}

export type SchedulingRepositories = {
  schedules: ScheduleRepository;
  appointments: AppointmentRepository;
};

export type SchedulingEvent =
  | { type: 'booked'; appointment: Appointment }
  | { type: 'canceled'; appointment: Appointment }
  | { type: 'rescheduled'; appointment: Appointment; previousStartsAt: Date };

/** Phase 4 turns these into notifications, reminders and the live agenda. */
export interface SchedulingEvents {
  publish(events: SchedulingEvent[]): Promise<void>;
}

/** What scheduling needs to know from the shops module. */
export interface ShopDirectory {
  barber(id: string): Promise<Barber | null>;
  barberOfUser(userId: string): Promise<Barber | null>;
  shop(id: string): Promise<Barbershop | null>;
  service(id: string): Promise<Service | null>;
}

export type SchedulingDeps = SchedulingRepositories & {
  directory: ShopDirectory;
  events: SchedulingEvents;
  clock: Clock;
  /** Runs `work` in one database transaction, with repositories bound to it. */
  transaction<T>(work: (repos: SchedulingRepositories) => Promise<T>): Promise<T>;
};
