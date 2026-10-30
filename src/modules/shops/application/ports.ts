import type { Clock } from '../../../shared/application/clock.js';
import type { FileRepository } from '../../../shared/application/files.js';
import type { Secrets, UserRepository } from '../../identity/application/ports.js';
import type { Email } from '../../identity/domain/email.js';
import type { Barber } from '../domain/barber.js';
import type { Barbershop } from '../domain/barbershop.js';
import type { Invite } from '../domain/invite.js';
import type { Location } from '../domain/location.js';
import type { Service } from '../domain/service.js';

export interface BarbershopRepository {
  findById(id: string): Promise<Barbershop | null>;
  findByIds(ids: readonly string[]): Promise<Barbershop[]>;
  findByOwner(ownerId: string): Promise<Barbershop | null>;
  /** Nearest first, only shops within `radiusKm`. */
  findNearby(
    from: Location,
    radiusKm: number,
    limit: number,
  ): Promise<{ shop: Barbershop; distanceKm: number }[]>;
  /** Fuzzy match on the name (typos and partial words), best match first. */
  search(query: string, limit: number, offset: number): Promise<Barbershop[]>;
  save(shop: Barbershop): Promise<void>;
}

export interface BarberRepository {
  findById(id: string): Promise<Barber | null>;
  findByIds(ids: readonly string[]): Promise<Barber[]>;
  findActiveByUser(userId: string): Promise<Barber | null>;
  findActiveByShops(shopIds: readonly string[]): Promise<Barber[]>;
  save(barber: Barber): Promise<void>;
}

export interface InviteRepository {
  findById(id: string): Promise<Invite | null>;
  findByTokenHash(tokenHash: string): Promise<Invite | null>;
  /** The invite for this email that was neither accepted nor revoked (it may have expired). */
  findOpen(shopId: string, email: Email): Promise<Invite | null>;
  listByShop(shopId: string): Promise<Invite[]>;
  save(invite: Invite): Promise<void>;
}

export interface ServiceRepository {
  findById(id: string): Promise<Service | null>;
  /** Active services of each barber; archived ones only when asked. */
  findByBarbers(barberIds: readonly string[], includeArchived?: boolean): Promise<Service[]>;
  save(service: Service): Promise<void>;
}

export type MailMessage = { to: string; subject: string; text: string };

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

export type ShopsDeps = {
  shops: BarbershopRepository;
  barbers: BarberRepository;
  invites: InviteRepository;
  services: ServiceRepository;
  files: FileRepository;
  users: Pick<UserRepository, 'findById' | 'findByEmail'>;
  mailer: Mailer;
  secrets: Secrets;
  clock: Clock;
};
