import { Email } from '../../domain/email.js';
import { User } from '../../domain/user.js';
import { UserRecord } from './user.record.js';

export const userMapper = {
  toDomain(record: UserRecord): User {
    return User.restore({
      id: record.id,
      name: record.name,
      email: Email.parse(record.email),
      passwordHash: record.passwordHash,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  },

  toRecord(user: User): UserRecord {
    return Object.assign(new UserRecord(), {
      id: user.id,
      name: user.name,
      email: user.email.value,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  },
};
