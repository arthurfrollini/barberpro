import { Column, Entity, PrimaryColumn } from 'typeorm';

// GeoJSON order is [longitude, latitude]
export type GeoJsonPoint = { type: string; coordinates: number[] };

@Entity('barbershops')
export class BarbershopRecord {
  @PrimaryColumn('uuid') id!: string;
  @Column('uuid', { name: 'owner_id' }) ownerId!: string;
  @Column('varchar', { length: 80 }) name!: string;
  @Column('varchar', { length: 1000 }) description!: string;
  @Column('integer', { name: 'founded_year' }) foundedYear!: number;
  @Column('uuid', { name: 'logo_file_id', nullable: true }) logoFileId!: string | null;
  @Column('varchar', { length: 200 }) address!: string;
  // TypeORM reads and writes PostGIS columns as GeoJSON
  @Column('geography', { spatialFeatureType: 'Point', srid: 4326 }) location!: GeoJsonPoint;
  @Column('varchar', { length: 64 }) timezone!: string;
  @Column('timestamptz', { name: 'created_at' }) createdAt!: Date;
  @Column('timestamptz', { name: 'updated_at' }) updatedAt!: Date;
}

@Entity('barbers')
export class BarberRecord {
  @PrimaryColumn('uuid') id!: string;
  @Column('uuid', { name: 'shop_id' }) shopId!: string;
  @Column('uuid', { name: 'user_id' }) userId!: string;
  @Column('varchar', { length: 500 }) bio!: string;
  @Column('uuid', { name: 'avatar_file_id', nullable: true }) avatarFileId!: string | null;
  @Column('timestamptz', { name: 'created_at' }) createdAt!: Date;
  @Column('timestamptz', { name: 'removed_at', nullable: true }) removedAt!: Date | null;
}

@Entity('invites')
export class InviteRecord {
  @PrimaryColumn('uuid') id!: string;
  @Column('uuid', { name: 'shop_id' }) shopId!: string;
  @Column('varchar', { length: 254 }) email!: string;
  @Column('char', { name: 'token_hash', length: 64 }) tokenHash!: string;
  @Column('uuid', { name: 'invited_by' }) invitedBy!: string;
  @Column('timestamptz', { name: 'expires_at' }) expiresAt!: Date;
  @Column('timestamptz', { name: 'accepted_at', nullable: true }) acceptedAt!: Date | null;
  @Column('timestamptz', { name: 'revoked_at', nullable: true }) revokedAt!: Date | null;
  @Column('timestamptz', { name: 'created_at' }) createdAt!: Date;
}

@Entity('services')
export class ServiceRecord {
  @PrimaryColumn('uuid') id!: string;
  @Column('uuid', { name: 'barber_id' }) barberId!: string;
  @Column('varchar', { length: 60 }) name!: string;
  @Column('varchar', { length: 500 }) description!: string;
  @Column('integer', { name: 'price_cents' }) priceCents!: number;
  @Column('integer', { name: 'duration_minutes' }) durationMinutes!: number;
  @Column('timestamptz', { name: 'archived_at', nullable: true }) archivedAt!: Date | null;
  @Column('timestamptz', { name: 'created_at' }) createdAt!: Date;
  @Column('timestamptz', { name: 'updated_at' }) updatedAt!: Date;
}

export const shopsRecords = [BarbershopRecord, BarberRecord, InviteRecord, ServiceRecord];
