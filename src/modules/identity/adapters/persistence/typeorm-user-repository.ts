import { type EntityManager, In } from 'typeorm';
import { isUniqueViolation } from '../../../../shared/adapters/database/unique-violation.js';
import { DomainError } from '../../../../shared/domain/domain-error.js';
import { isUuid } from '../../../../shared/domain/uuid.js';
import type { UserRepository } from '../../application/ports.js';
import type { Email } from '../../domain/email.js';
import type { User } from '../../domain/user.js';
import { userMapper } from './user.mapper.js';
import { UserRecord } from './user.record.js';

export class TypeOrmUserRepository implements UserRepository {
  constructor(private readonly manager: EntityManager) {}

  async findById(id: string): Promise<User | null> {
    if (!isUuid(id)) return null;
    const record = await this.manager.findOneBy(UserRecord, { id });
    return record ? userMapper.toDomain(record) : null;
  }

  async findByIds(ids: readonly string[]): Promise<User[]> {
    const valid = ids.filter(isUuid);
    if (valid.length === 0) return [];
    const records = await this.manager.findBy(UserRecord, { id: In(valid) });
    return records.map(userMapper.toDomain);
  }

  async findByEmail(email: Email): Promise<User | null> {
    const record = await this.manager.findOneBy(UserRecord, { email: email.value });
    return record ? userMapper.toDomain(record) : null;
  }

  async save(user: User): Promise<void> {
    try {
      await this.manager.upsert(UserRecord, userMapper.toRecord(user), ['id']);
    } catch (error) {
      // two sign-ups with the same email can both pass the use case's check; the index decides
      if (isUniqueViolation(error, 'users_email_key')) {
        throw new DomainError('EMAIL_TAKEN', 'An account with this email already exists.');
      }
      throw error;
    }
  }
}
