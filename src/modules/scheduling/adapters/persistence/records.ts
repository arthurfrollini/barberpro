import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { AppointmentStatus, CancelReason } from '../../domain/appointment.js';

@Entity('weekly_intervals')
export class WeeklyIntervalRecord {
  @PrimaryColumn('uuid', { name: 'barber_id' }) barberId!: string;
  @PrimaryColumn('smallint') weekday!: number;
  @PrimaryColumn('smallint', { name: 'start_minute' }) startMinute!: number;
  @Column('smallint', { name: 'end_minute' }) endMinute!: number;
}

@Entity('blocked_dates')
export class BlockedDateRecord {
  @PrimaryColumn('uuid', { name: 'barber_id' }) barberId!: string;
  // a calendar date in the shop's zone, kept as 'YYYY-MM-DD' (no time, no zone)
  @PrimaryColumn('date') date!: string;
}

@Entity('appointments')
export class AppointmentRecord {
  @PrimaryColumn('uuid') id!: string;
  @Column('uuid', { name: 'barber_id' }) barberId!: string;
  @Column('uuid', { name: 'barber_user_id' }) barberUserId!: string;
  @Column('uuid', { name: 'customer_id' }) customerId!: string;
  @Column('uuid', { name: 'service_id' }) serviceId!: string;
  @Column('varchar', { name: 'service_name', length: 60 }) serviceName!: string;
  @Column('integer', { name: 'price_cents' }) priceCents!: number;
  @Column('integer', { name: 'duration_minutes' }) durationMinutes!: number;
  @Column('timestamptz', { name: 'starts_at' }) startsAt!: Date;
  @Column('timestamptz', { name: 'ends_at' }) endsAt!: Date;
  @Column('smallint', { name: 'reminder_lead_minutes', nullable: true })
  reminderLeadMinutes!: number | null;
  @Column('varchar', { length: 16 }) status!: AppointmentStatus;
  @Column('varchar', { name: 'cancel_reason', length: 32, nullable: true })
  cancelReason!: CancelReason | null;
  @Column('uuid', { name: 'canceled_by', nullable: true }) canceledBy!: string | null;
  @Column('timestamptz', { name: 'canceled_at', nullable: true }) canceledAt!: Date | null;
  @Column('timestamptz', { name: 'created_at' }) createdAt!: Date;
  @Column('timestamptz', { name: 'updated_at' }) updatedAt!: Date;
}

export const schedulingRecords = [WeeklyIntervalRecord, BlockedDateRecord, AppointmentRecord];
