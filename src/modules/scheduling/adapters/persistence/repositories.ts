import { Between, type EntityManager, In, LessThan, MoreThan, MoreThanOrEqual, Not } from 'typeorm';
import { isConstraintViolation } from '../../../../shared/adapters/database/unique-violation.js';
import { DomainError } from '../../../../shared/domain/domain-error.js';
import { isUuid } from '../../../../shared/domain/uuid.js';
import type { AppointmentRepository, ScheduleRepository } from '../../application/ports.js';
import { Appointment } from '../../domain/appointment.js';
import type { TimeRange } from '../../domain/availability.js';
import { WeeklySchedule } from '../../domain/weekly-schedule.js';
import { AppointmentRecord, BlockedDateRecord, WeeklyIntervalRecord } from './records.js';

export class TypeOrmScheduleRepository implements ScheduleRepository {
  constructor(private readonly manager: EntityManager) {}

  async get(barberId: string) {
    const [intervals, blocked] = await Promise.all([
      this.manager.findBy(WeeklyIntervalRecord, { barberId }),
      this.manager.find(BlockedDateRecord, { where: { barberId }, order: { date: 'ASC' } }),
    ]);
    return {
      schedule: WeeklySchedule.of(intervals),
      blockedDates: new Set(blocked.map((b) => b.date)),
    };
  }

  async replaceWeekly(barberId: string, schedule: WeeklySchedule) {
    await this.manager.delete(WeeklyIntervalRecord, { barberId });
    if (schedule.intervals.length > 0) {
      await this.manager.insert(
        WeeklyIntervalRecord,
        schedule.intervals.map((i) => ({ barberId, ...i })),
      );
    }
  }

  async block(barberId: string, date: string) {
    await this.manager
      .createQueryBuilder()
      .insert()
      .into(BlockedDateRecord)
      .values({ barberId, date })
      .orIgnore()
      .execute();
  }

  async unblock(barberId: string, date: string) {
    await this.manager.delete(BlockedDateRecord, { barberId, date });
  }

  async lockBarber(barberId: string, mode: 'share' | 'update') {
    if (!isUuid(barberId)) return;
    await this.manager.query(
      `SELECT id FROM barbers WHERE id = $1 ${mode === 'share' ? 'FOR SHARE' : 'FOR UPDATE'}`,
      [barberId],
    );
  }
}

const toDomain = (r: AppointmentRecord) => Appointment.restore({ ...r });

function toRecord(a: Appointment): AppointmentRecord {
  return Object.assign(new AppointmentRecord(), {
    id: a.id,
    barberId: a.barberId,
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
  });
}

/** The exclusion constraints are the final guard; their violations become domain errors. */
async function guardOverlap(write: Promise<unknown>): Promise<void> {
  try {
    await write;
  } catch (error) {
    if (isConstraintViolation(error, 'appointments_barber_no_overlap')) {
      throw new DomainError('SLOT_UNAVAILABLE', 'This time is no longer available.');
    }
    if (isConstraintViolation(error, 'appointments_customer_no_overlap')) {
      throw new DomainError('CUSTOMER_BUSY', 'You already have an appointment at this time.');
    }
    throw error;
  }
}

export class TypeOrmAppointmentRepository implements AppointmentRepository {
  constructor(private readonly manager: EntityManager) {}

  async findById(id: string, options: { forUpdate?: boolean } = {}) {
    if (!isUuid(id)) return null;
    const r = await this.manager.findOne(AppointmentRecord, {
      where: { id },
      ...(options.forUpdate ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    return r ? toDomain(r) : null;
  }

  async findByIds(ids: readonly string[]) {
    const valid = ids.filter(isUuid);
    if (valid.length === 0) return [];
    return (await this.manager.findBy(AppointmentRecord, { id: In(valid) })).map(toDomain);
  }

  async insert(appointment: Appointment) {
    await guardOverlap(this.manager.insert(AppointmentRecord, toRecord(appointment)));
  }

  async update(appointment: Appointment) {
    const { id, ...changes } = toRecord(appointment);
    await guardOverlap(this.manager.update(AppointmentRecord, { id }, changes));
  }

  async busyFor(barberId: string, from: Date, to: Date, excludeId?: string): Promise<TimeRange[]> {
    const rows = await this.manager.find(AppointmentRecord, {
      select: { startsAt: true, endsAt: true },
      where: {
        barberId,
        status: 'booked',
        startsAt: LessThan(to),
        endsAt: MoreThan(from),
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
      order: { startsAt: 'ASC' },
    });
    return rows.map((r) => ({ startsAt: r.startsAt, endsAt: r.endsAt }));
  }

  async bookedFrom(barberId: string, from: Date) {
    const rows = await this.manager.find(AppointmentRecord, {
      where: { barberId, status: 'booked', startsAt: MoreThanOrEqual(from) },
      order: { startsAt: 'ASC' },
    });
    return rows.map(toDomain);
  }

  async forCustomer(customerId: string, from?: Date) {
    const rows = await this.manager.find(AppointmentRecord, {
      where: { customerId, ...(from ? { startsAt: MoreThanOrEqual(from) } : {}) },
      order: { startsAt: from ? 'ASC' : 'DESC' },
      take: 100,
    });
    return rows.map(toDomain);
  }

  async forBarberBetween(barberId: string, from: Date, to: Date) {
    const rows = await this.manager.find(AppointmentRecord, {
      where: { barberId, startsAt: Between(from, new Date(to.getTime() - 1)) },
      order: { startsAt: 'ASC' },
    });
    return rows.map(toDomain);
  }
}

export function schedulingRepositories(manager: EntityManager) {
  return {
    schedules: new TypeOrmScheduleRepository(manager),
    appointments: new TypeOrmAppointmentRepository(manager),
  };
}
