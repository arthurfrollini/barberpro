import type { EntityManager } from 'typeorm';
import type { FileRepository, StoredFile } from '../../application/files.js';
import { FileRecord } from './file.record.js';

export class TypeOrmFileRepository implements FileRepository {
  constructor(private readonly manager: EntityManager) {}

  async create(file: StoredFile): Promise<void> {
    await this.manager.insert(FileRecord, file);
  }

  async findById(id: string): Promise<StoredFile | null> {
    const r = await this.manager.findOneBy(FileRecord, { id });
    return r
      ? {
          id: r.id,
          ownerId: r.ownerId,
          contentType: r.contentType,
          sizeBytes: r.sizeBytes,
          createdAt: r.createdAt,
        }
      : null;
  }
}
