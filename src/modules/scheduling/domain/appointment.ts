import { randomUUID } from 'node:crypto';
import { DomainError } from '../../../shared/domain/domain-error.js';
import { parseReminderLead } from './reminder-lead.js';

export const CHANGE_WINDOW_MINUTES = 120;

export type AppointmentStatus = 'booked' | 'canceled';
export type CancelReason =
  'customer' | 'barber' | 'day_blocked' | 'schedule_changed' | 'barber_removed';

export type ServiceSnapshot = {
  id: string;
  name: string;
  priceCents: number;
  durationMinutes: number;
};

export type AppointmentProps = {
  id: string;
  barberId: string;
  /** The person behind the barber profile; one person is never booked twice at once. */
  barberUserId: string;
  customerId: string;
  serviceId: string;
  serviceName: string;
  priceCents: number;
  durationMinutes: number;
  startsAt: Date;
  endsAt: Date;
  reminderLeadMinutes: number | null;
  status: AppointmentStatus;
  cancelReason: CancelReason | null;
  canceledBy: string | null;
  canceledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const plusMinutes = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60_000);

/**
 * A booking. It keeps a copy of the service as it was (name, price, duration), so later
 * edits to the service never change what the customer agreed to.
 */
export class Appointment {
  private constructor(private props: AppointmentProps) {}

  static book(
    input: {
      barberId: string;
      barberUserId: string;
      customerId: string;
      service: ServiceSnapshot;
      startsAt: Date;
      reminderLeadMinutes: number | null;
    },
    now: Date,
  ): Appointment {
    if (input.startsAt <= now) {
      throw new DomainError('SLOT_IN_PAST', 'This time has already passed.');
    }
    return new Appointment({
      id: randomUUID(),
      barberId: input.barberId,
      barberUserId: input.barberUserId,
      customerId: input.customerId,
      serviceId: input.service.id,
      serviceName: input.service.name,
      priceCents: input.service.priceCents,
      durationMinutes: input.service.durationMinutes,
      startsAt: input.startsAt,
      endsAt: plusMinutes(input.startsAt, input.service.durationMinutes),
      reminderLeadMinutes: parseReminderLead(input.reminderLeadMinutes),
      status: 'booked',
      cancelReason: null,
      canceledBy: null,
      canceledAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: AppointmentProps): Appointment {
    return new Appointment({ ...props });
  }

  /** The two-hour rule: changes are allowed while the start is at least 2 hours away. */
  canBeChangedAt(now: Date): boolean {
    return this.props.startsAt.getTime() - now.getTime() >= CHANGE_WINDOW_MINUTES * 60_000;
  }

  /** Throws unless the appointment is booked and starts at least 2 hours after `now`. */
  assertChangeable(now: Date): void {
    if (this.props.status === 'canceled') {
      throw new DomainError('APPOINTMENT_CANCELED', 'This appointment was already canceled.');
    }
    if (!this.canBeChangedAt(now)) {
      throw new DomainError(
        'CANCELLATION_WINDOW_CLOSED',
        'Appointments can only be changed up to 2 hours before they start.',
      );
    }
  }

  cancel(by: { userId: string; reason: 'customer' | 'barber' }, now: Date): void {
    this.assertChangeable(now);
    this.markCanceled(by.reason, by.userId, now);
  }

  /**
   * Cancellation caused by the barber's agenda (day blocked, new hours, removal). The caller
   * already kept the appointments less than 2 hours away; those the barber still attends.
   */
  cancelBySystem(
    reason: Exclude<CancelReason, 'customer' | 'barber'>,
    byUserId: string,
    now: Date,
  ) {
    if (this.props.status === 'booked') this.markCanceled(reason, byUserId, now);
  }

  reschedule(newStartsAt: Date, now: Date): void {
    this.assertChangeable(now);
    if (newStartsAt <= now) throw new DomainError('SLOT_IN_PAST', 'This time has already passed.');
    this.props.startsAt = newStartsAt;
    this.props.endsAt = plusMinutes(newStartsAt, this.props.durationMinutes);
    this.props.updatedAt = now;
  }

  private markCanceled(reason: CancelReason, userId: string, now: Date) {
    Object.assign(this.props, {
      status: 'canceled',
      cancelReason: reason,
      canceledBy: userId,
      canceledAt: now,
      updatedAt: now,
    });
  }

  get id() {
    return this.props.id;
  }
  get barberId() {
    return this.props.barberId;
  }
  get barberUserId() {
    return this.props.barberUserId;
  }
  get customerId() {
    return this.props.customerId;
  }
  get serviceId() {
    return this.props.serviceId;
  }
  get serviceName() {
    return this.props.serviceName;
  }
  get priceCents() {
    return this.props.priceCents;
  }
  get durationMinutes() {
    return this.props.durationMinutes;
  }
  get startsAt() {
    return this.props.startsAt;
  }
  get endsAt() {
    return this.props.endsAt;
  }
  get reminderLeadMinutes() {
    return this.props.reminderLeadMinutes;
  }
  get status() {
    return this.props.status;
  }
  get cancelReason() {
    return this.props.cancelReason;
  }
  get canceledBy() {
    return this.props.canceledBy;
  }
  get canceledAt() {
    return this.props.canceledAt;
  }
  get createdAt() {
    return this.props.createdAt;
  }
  get updatedAt() {
    return this.props.updatedAt;
  }
}
