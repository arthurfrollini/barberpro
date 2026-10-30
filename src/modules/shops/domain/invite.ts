import { randomUUID } from 'node:crypto';
import { DomainError } from '../../../shared/domain/domain-error.js';
import type { Email } from '../../identity/domain/email.js';

export const INVITE_TTL_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export type InviteProps = {
  id: string;
  shopId: string;
  email: Email;
  tokenHash: string;
  invitedBy: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

/** An owner's invitation for someone to join the shop as a barber, valid for 7 days. */
export class Invite {
  private constructor(private props: InviteProps) {}

  static create(
    input: { shopId: string; email: Email; tokenHash: string; invitedBy: string },
    now: Date,
  ): Invite {
    return new Invite({
      id: randomUUID(),
      ...input,
      expiresAt: new Date(now.getTime() + INVITE_TTL_DAYS * DAY_MS),
      acceptedAt: null,
      revokedAt: null,
      createdAt: now,
    });
  }

  static restore(props: InviteProps): Invite {
    return new Invite({ ...props });
  }

  status(now: Date): InviteStatus {
    if (this.props.acceptedAt) return 'accepted';
    if (this.props.revokedAt) return 'revoked';
    return now >= this.props.expiresAt ? 'expired' : 'pending';
  }

  accept(now: Date): void {
    const status = this.status(now);
    if (status === 'expired') {
      throw new DomainError(
        'INVITE_EXPIRED',
        'This invite has expired. Ask the owner for a new one.',
      );
    }
    if (status !== 'pending') {
      throw new DomainError('INVITE_NOT_FOUND', 'This invite is no longer valid.');
    }
    this.props.acceptedAt = now;
  }

  revoke(now: Date): void {
    if (!this.props.acceptedAt && !this.props.revokedAt) this.props.revokedAt = now;
  }

  get id() {
    return this.props.id;
  }
  get shopId() {
    return this.props.shopId;
  }
  get email() {
    return this.props.email;
  }
  get tokenHash() {
    return this.props.tokenHash;
  }
  get invitedBy() {
    return this.props.invitedBy;
  }
  get expiresAt() {
    return this.props.expiresAt;
  }
  get acceptedAt() {
    return this.props.acceptedAt;
  }
  get revokedAt() {
    return this.props.revokedAt;
  }
  get createdAt() {
    return this.props.createdAt;
  }
}
