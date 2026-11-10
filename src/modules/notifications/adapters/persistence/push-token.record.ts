import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { PushPlatform } from '../../domain/push-token.js';

@Entity('push_tokens')
export class PushTokenRecord {
  @PrimaryColumn('varchar', { length: 255 }) token!: string;
  @Column('uuid', { name: 'user_id' }) userId!: string;
  @Column('varchar', { length: 10 }) platform!: PushPlatform;
  @Column('timestamptz', { name: 'created_at' }) createdAt!: Date;
  @Column('timestamptz', { name: 'updated_at' }) updatedAt!: Date;
}
