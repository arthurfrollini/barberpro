import { describe, expect, it } from 'vitest';
import { Email } from '../../identity/domain/email.js';
import { Barber } from './barber.js';
import { Barbershop } from './barbershop.js';
import { Invite } from './invite.js';
import { Location } from './location.js';
import { Service } from './service.js';

const now = new Date('2026-11-02T12:00:00Z');
const code = (c: string) => expect.objectContaining({ code: c });
const DAY = 24 * 60 * 60 * 1000;

describe('Location', () => {
  it('accepts valid coordinates', () => {
    expect(Location.of(-23.5614, -46.6559)).toMatchObject({
      latitude: -23.5614,
      longitude: -46.6559,
    });
  });

  it.each([
    [91, 0],
    [0, -181],
    [Number.NaN, 0],
  ])('rejects %d,%d', (lat, lng) => {
    expect(() => Location.of(lat, lng)).toThrow(code('INVALID_LOCATION'));
  });
});

describe('Barbershop', () => {
  const valid = {
    ownerId: 'owner',
    name: ' Mega Barbearia SP ',
    description: 'Cortes clássicos desde 1998.',
    foundedYear: 1998,
    logoFileId: null,
    address: 'Av. Paulista, 1000',
    location: Location.of(-23.5614, -46.6559),
    timezone: 'America/Sao_Paulo',
  };

  it('creates a shop with trimmed fields and counts years active', () => {
    const shop = Barbershop.create(valid, now);

    expect(shop.name).toBe('Mega Barbearia SP');
    expect(shop.yearsActive(now)).toBe(28);
    expect(shop.createdAt).toEqual(now);
  });

  it.each([
    [{ name: '' }, 'INVALID_SHOP_NAME'],
    [{ name: 'x'.repeat(81) }, 'INVALID_SHOP_NAME'],
    [{ description: 'x'.repeat(1001) }, 'INVALID_DESCRIPTION'],
    [{ foundedYear: 1899 }, 'INVALID_FOUNDED_YEAR'],
    [{ foundedYear: 2027 }, 'INVALID_FOUNDED_YEAR'],
    [{ address: ' ' }, 'INVALID_ADDRESS'],
    [{ timezone: 'Mars/Olympus' }, 'INVALID_TIMEZONE'],
  ])('rejects %j', (patch, expected) => {
    expect(() => Barbershop.create({ ...valid, ...patch }, now)).toThrow(code(expected));
  });

  it('updates only the fields given and validates them', () => {
    const shop = Barbershop.create(valid, now);
    const later = new Date('2026-12-01T00:00:00Z');

    shop.update({ name: 'Mega Barbearia', foundedYear: 2000 }, later);

    expect(shop.name).toBe('Mega Barbearia');
    expect(shop.foundedYear).toBe(2000);
    expect(shop.address).toBe('Av. Paulista, 1000');
    expect(shop.updatedAt).toEqual(later);
    expect(() => shop.update({ name: '' }, later)).toThrow(code('INVALID_SHOP_NAME'));
  });
});

describe('Barber', () => {
  it('is active until removed', () => {
    const barber = Barber.create({ shopId: 's', userId: 'u' }, now);
    expect(barber.isActive).toBe(true);

    barber.remove(now);

    expect(barber.isActive).toBe(false);
    expect(barber.removedAt).toEqual(now);
  });

  it('updates the profile and limits the bio to 500 characters', () => {
    const barber = Barber.create({ shopId: 's', userId: 'u' }, now);

    barber.updateProfile({ bio: ' Especialista em degradê ', avatarFileId: 'f1' });

    expect(barber.bio).toBe('Especialista em degradê');
    expect(barber.avatarFileId).toBe('f1');
    expect(() => barber.updateProfile({ bio: 'x'.repeat(501) })).toThrow(code('INVALID_BIO'));
  });
});

describe('Service', () => {
  const corte = {
    barberId: 'b',
    name: 'Corte',
    description: '',
    priceCents: 5000,
    durationMinutes: 15,
  };

  it('keeps price in cents and duration in minutes', () => {
    const service = Service.create(corte, now);

    expect(service.priceCents).toBe(5000);
    expect(service.durationMinutes).toBe(15);
    expect(service.isArchived).toBe(false);
  });

  it.each([
    [{ priceCents: -1 }, 'INVALID_PRICE'],
    [{ priceCents: 10.5 }, 'INVALID_PRICE'],
    [{ durationMinutes: 0 }, 'INVALID_DURATION'],
    [{ durationMinutes: 485 }, 'INVALID_DURATION'],
    [{ durationMinutes: 17 }, 'INVALID_DURATION'],
    [{ name: '' }, 'INVALID_SERVICE_NAME'],
    [{ description: 'x'.repeat(501) }, 'INVALID_DESCRIPTION'],
  ])('rejects %j', (patch, expected) => {
    expect(() => Service.create({ ...corte, ...patch }, now)).toThrow(code(expected));
  });

  it('accepts the bounds 5 and 480 minutes', () => {
    expect(Service.create({ ...corte, durationMinutes: 5 }, now).durationMinutes).toBe(5);
    expect(Service.create({ ...corte, durationMinutes: 480 }, now).durationMinutes).toBe(480);
  });

  it('archives and updates', () => {
    const service = Service.create(corte, now);

    service.update({ priceCents: 6000 }, now);
    service.archive(now);

    expect(service.priceCents).toBe(6000);
    expect(service.isArchived).toBe(true);
  });
});

describe('Invite', () => {
  const invite = () =>
    Invite.create(
      { shopId: 's', email: Email.parse('Jose@X.com'), tokenHash: 'h', invitedBy: 'owner' },
      now,
    );

  it('is pending for 7 days, then expired', () => {
    const i = invite();

    expect(i.email.value).toBe('jose@x.com');
    expect(i.expiresAt).toEqual(new Date(now.getTime() + 7 * DAY));
    expect(i.status(now)).toBe('pending');
    expect(i.status(new Date(now.getTime() + 7 * DAY))).toBe('expired');
  });

  it('can be accepted once', () => {
    const i = invite();

    i.accept(now);

    expect(i.status(now)).toBe('accepted');
    expect(() => i.accept(now)).toThrow(code('INVITE_NOT_FOUND'));
  });

  it('cannot be accepted after it expires or is revoked', () => {
    const expired = invite();
    expect(() => expired.accept(new Date(now.getTime() + 8 * DAY))).toThrow(code('INVITE_EXPIRED'));

    const revoked = invite();
    revoked.revoke(now);
    expect(revoked.status(now)).toBe('revoked');
    expect(() => revoked.accept(now)).toThrow(code('INVITE_NOT_FOUND'));
  });
});
