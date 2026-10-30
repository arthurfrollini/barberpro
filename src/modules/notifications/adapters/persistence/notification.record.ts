import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { NotificationType } from '../../domain/notification.js';

@Entity('notifications')
export class NotificationRecord {
  @PrimaryColumn('uuid') id!: string;
  @Column('uuid', { name: 'user_id' }) userId!: string;
  @Column('varchar', { length: 32 }) type!: NotificationType;
  @Column('varchar', { length: 120 }) title!: string;
  @Column('varchar', { length: 500 }) body!: string;
  @Column('uuid', { name: 'appointment_id', nullable: true }) appointmentId!: string | null;
  @Column('timestamptz', { name: 'read_at', nullable: true }) readAt!: Date | null;
  @Column('timestamptz', { name: 'created_at' }) createdAt!: Date;
}
