import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('refresh_tokens')
export class RefreshTokenRecord {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'user_id' })
  userId!: string;

  @Column('char', { name: 'token_hash', length: 64, unique: true })
  tokenHash!: string;

  @Column('timestamptz', { name: 'expires_at' })
  expiresAt!: Date;

  @Column('timestamptz', { name: 'revoked_at', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
