import { DomainError } from '../../../shared/domain/domain-error.js';
import { Email } from '../../identity/domain/email.js';
import { Barber } from '../domain/barber.js';
import { Invite } from '../domain/invite.js';
import { assertNotBarbering, requireOwnedShop } from './guards.js';
import type { ShopsDeps } from './ports.js';

const notFound = () => new DomainError('INVITE_NOT_FOUND', 'This invite is no longer valid.');

/**
 * Emails an invite to join the owner's shop. The email carries a single-use code; only its
 * hash is stored. A pending invite blocks a second one; an expired one is replaced.
 */
export async function inviteBarber(
  deps: ShopsDeps,
  actorId: string,
  rawEmail: string,
): Promise<Invite> {
  const shop = await requireOwnedShop(deps, actorId);
  const email = Email.parse(rawEmail);
  const now = deps.clock.now();

  const invitee = await deps.users.findByEmail(email);
  const barber = invitee ? await deps.barbers.findActiveByUser(invitee.id) : null;
  if (barber?.shopId === shop.id) {
    throw new DomainError('ALREADY_A_BARBER', 'This person is already a barber in your shop.');
  }

  const open = await deps.invites.findOpen(shop.id, email);
  if (open?.status(now) === 'pending') {
    throw new DomainError('INVITE_ALREADY_SENT', 'An invite to this email is still pending.');
  }
  if (open) {
    open.revoke(now);
    await deps.invites.save(open);
  }

  const token = deps.secrets.random();
  const invite = Invite.create(
    { shopId: shop.id, email, tokenHash: deps.secrets.hash(token), invitedBy: actorId },
    now,
  );
  await deps.invites.save(invite);
  await deps.mailer.send({
    to: email.value,
    subject: `You were invited to join ${shop.name}`,
    text:
      `You were invited to join ${shop.name} as a barber on BarberPro.\n\n` +
      `Sign in with this email and accept the invite with this code: ${token}\n\n` +
      `The invite expires on ${invite.expiresAt.toISOString().slice(0, 10)}.`,
  });
  return invite;
}

export async function revokeInvite(deps: ShopsDeps, actorId: string, inviteId: string) {
  const shop = await requireOwnedShop(deps, actorId);
  const invite = await deps.invites.findById(inviteId);
  if (!invite || invite.shopId !== shop.id) throw notFound();
  invite.revoke(deps.clock.now());
  await deps.invites.save(invite);
  return invite;
}

export async function listInvites(deps: ShopsDeps, actorId: string) {
  const shop = await requireOwnedShop(deps, actorId);
  return deps.invites.listByShop(shop.id);
}

export async function acceptInvite(deps: ShopsDeps, actorId: string, token: string) {
  const invite = await deps.invites.findByTokenHash(deps.secrets.hash(token));
  if (!invite) throw notFound();
  const user = await deps.users.findById(actorId);
  if (!user || !user.email.equals(invite.email)) {
    throw new DomainError(
      'INVITE_EMAIL_MISMATCH',
      'This invite was sent to another email. Sign in with that email to accept it.',
    );
  }
  const now = deps.clock.now();
  invite.accept(now);
  await assertNotBarbering(deps, actorId);

  const barber = Barber.create({ shopId: invite.shopId, userId: actorId }, now);
  // the barber row first: its unique index is what stops a double accept
  await deps.barbers.save(barber);
  await deps.invites.save(invite);
  return barber;
}
