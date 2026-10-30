import { Email } from '../../../identity/domain/email.js';
import { Barber } from '../../domain/barber.js';
import { Barbershop } from '../../domain/barbershop.js';
import { Invite } from '../../domain/invite.js';
import { Location } from '../../domain/location.js';
import { Service } from '../../domain/service.js';
import { BarberRecord, BarbershopRecord, InviteRecord, ServiceRecord } from './records.js';

const record = <T extends object>(cls: new () => T, values: T): T =>
  Object.assign(new cls(), values);

export const barbershopMapper = {
  toDomain: (r: BarbershopRecord) =>
    Barbershop.restore({
      ...r,
      location: Location.of(r.location.coordinates[1]!, r.location.coordinates[0]!),
    }),
  toRecord: (s: Barbershop) =>
    record(BarbershopRecord, {
      id: s.id,
      ownerId: s.ownerId,
      name: s.name,
      description: s.description,
      foundedYear: s.foundedYear,
      logoFileId: s.logoFileId,
      address: s.address,
      location: { type: 'Point', coordinates: [s.location.longitude, s.location.latitude] },
      timezone: s.timezone,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }),
};

export const barberMapper = {
  toDomain: (r: BarberRecord) => Barber.restore({ ...r }),
  toRecord: (b: Barber) =>
    record(BarberRecord, {
      id: b.id,
      shopId: b.shopId,
      userId: b.userId,
      bio: b.bio,
      avatarFileId: b.avatarFileId,
      createdAt: b.createdAt,
      removedAt: b.removedAt,
    }),
};

export const inviteMapper = {
  toDomain: (r: InviteRecord) => Invite.restore({ ...r, email: Email.parse(r.email) }),
  toRecord: (i: Invite) =>
    record(InviteRecord, {
      id: i.id,
      shopId: i.shopId,
      email: i.email.value,
      tokenHash: i.tokenHash,
      invitedBy: i.invitedBy,
      expiresAt: i.expiresAt,
      acceptedAt: i.acceptedAt,
      revokedAt: i.revokedAt,
      createdAt: i.createdAt,
    }),
};

export const serviceMapper = {
  toDomain: (r: ServiceRecord) => Service.restore({ ...r }),
  toRecord: (s: Service) =>
    record(ServiceRecord, {
      id: s.id,
      barberId: s.barberId,
      name: s.name,
      description: s.description,
      priceCents: s.priceCents,
      durationMinutes: s.durationMinutes,
      archivedAt: s.archivedAt,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }),
};
