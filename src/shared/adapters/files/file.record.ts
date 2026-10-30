import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { ImageType } from '../../application/files.js';

@Entity('files')
export class FileRecord {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'owner_id' })
  ownerId!: string;

  @Column('varchar', { name: 'content_type', length: 32 })
  contentType!: ImageType;

  @Column('integer', { name: 'size_bytes' })
  sizeBytes!: number;

  @Column('timestamptz', { name: 'created_at' })
  createdAt!: Date;
}
