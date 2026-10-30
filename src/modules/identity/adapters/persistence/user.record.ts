import { Column, Entity, PrimaryColumn } from 'typeorm';

/** The `users` row. Only persistence code sees this class; the domain uses `User`. */
@Entity('users')
export class UserRecord {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { length: 80 })
  name!: string;

  @Column('varchar', { length: 254, unique: true })
  email!: string;

  @Column('text', { name: 'password_hash' })
  passwordHash!: string;

  @Column('timestamptz', { name: 'created_at' })
  createdAt!: Date;

  @Column('timestamptz', { name: 'updated_at' })
  updatedAt!: Date;
}
