import { randomUUID } from 'node:crypto';
import { cleanText } from '../../../shared/domain/text.js';

export type BarberProps = {
  id: string;
  shopId: string;
  userId: string;
  bio: string;
  avatarFileId: string | null;
  createdAt: Date;
  removedAt: Date | null;
};

const bio = (raw: string) =>
  cleanText(raw, {
    min: 0,
    max: 500,
    code: 'INVALID_BIO',
    message: 'Bio can have at most 500 characters.',
  });

/**
 * A user's membership in a shop as a barber. Removing keeps the row (appointments point
 * to it) and frees the user to join another shop.
 */
export class Barber {
  private constructor(private props: BarberProps) {}

  static create(input: { shopId: string; userId: string }, now: Date): Barber {
    return new Barber({
      id: randomUUID(),
      shopId: input.shopId,
      userId: input.userId,
      bio: '',
      avatarFileId: null,
      createdAt: now,
      removedAt: null,
    });
  }

  static restore(props: BarberProps): Barber {
    return new Barber({ ...props });
  }

  updateProfile(patch: { bio?: string; avatarFileId?: string | null }): void {
    if (patch.bio !== undefined) this.props.bio = bio(patch.bio);
    if (patch.avatarFileId !== undefined) this.props.avatarFileId = patch.avatarFileId;
  }

  remove(now: Date): void {
    this.props.removedAt = now;
  }

  get isActive() {
    return this.props.removedAt === null;
  }
  get id() {
    return this.props.id;
  }
  get shopId() {
    return this.props.shopId;
  }
  get userId() {
    return this.props.userId;
  }
  get bio() {
    return this.props.bio;
  }
  get avatarFileId() {
    return this.props.avatarFileId;
  }
  get createdAt() {
    return this.props.createdAt;
  }
  get removedAt() {
    return this.props.removedAt;
  }
}
