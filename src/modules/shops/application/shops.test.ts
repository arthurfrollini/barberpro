import { beforeEach, describe, expect, it } from 'vitest';
import { FixedClock } from '../../../shared/testing/fixed-clock.js';
import { Email } from '../../identity/domain/email.js';
import { User } from '../../identity/domain/user.js';
import { inMemoryShopsDeps } from '../testing/in-memory.js';
import { becomeBarber, removeBarber, updateBarberProfile } from './barbers.js';
import {
  createBarbershop,
  findNearby,
  getBarbershop,
  searchBarbershops,
  updateBarbershop,
} from './barbershops.js';
import { acceptInvite, inviteBarber, revokeInvite } from './invites.js';
import { archiveService, createService, updateService } from './services.js';

const code = (c: string) => expect.objectContaining({ code: c });
const DAY_MIN = 24 * 60;

const paulista = { latitude: -23.5614, longitude: -46.6559 };
const pinheiros = { latitude: -23.567, longitude: -46.692 };
const itaquera = { latitude: -23.54, longitude: -46.456 };

const shopInput = (over: Record<string, unknown> = {}) => ({
  name: 'Mega Barbearia SP',
  description: '',
  foundedYear: 2010,
  logoFileId: null,
  address: 'Av. Paulista, 1000',
  ...paulista,
  timezone: 'America/Sao_Paulo',
  ...over,
});

describe('shops use cases', () => {
  let clock: FixedClock;
  let deps: ReturnType<typeof inMemoryShopsDeps>;
  let owner: User;
  let jose: User;
  let ana: User;

  const addUser = async (name: string, email: string) => {
    const user = User.create({
      name,
      email: Email.parse(email),
      passwordHash: 'h',
      now: clock.now(),
    });
    await deps.users.save(user);
    return user;
  };

  beforeEach(async () => {
    clock = new FixedClock(new Date('2026-11-02T12:00:00Z'));
    deps = inMemoryShopsDeps(clock);
    owner = await addUser('Owner', 'owner@x.com');
    jose = await addUser('José', 'jose@x.com');
    ana = await addUser('Ana', 'ana@x.com');
  });

  describe('barbershops', () => {
    it('lets a user own one shop', async () => {
      const shop = await createBarbershop(deps, owner.id, shopInput());

      expect(shop.ownerId).toBe(owner.id);
      expect((await getBarbershop(deps, shop.id)).name).toBe('Mega Barbearia SP');
      await expect(createBarbershop(deps, owner.id, shopInput())).rejects.toEqual(
        code('SHOP_ALREADY_OWNED'),
      );
    });

    it('only accepts a logo the owner uploaded', async () => {
      await deps.files.create({
        id: 'f-ana',
        ownerId: ana.id,
        contentType: 'image/png',
        sizeBytes: 10,
        createdAt: clock.now(),
      });

      await expect(
        createBarbershop(deps, owner.id, shopInput({ logoFileId: 'f-ana' })),
      ).rejects.toEqual(code('FILE_NOT_FOUND'));
    });

    it('updates the shop of the signed-in owner only', async () => {
      await createBarbershop(deps, owner.id, shopInput());

      const updated = await updateBarbershop(deps, owner.id, { name: 'Mega Barbearia' });

      expect(updated.name).toBe('Mega Barbearia');
      await expect(updateBarbershop(deps, ana.id, { name: 'x' })).rejects.toEqual(
        code('NOT_SHOP_OWNER'),
      );
    });

    it('answers SHOP_NOT_FOUND for an unknown id', async () => {
      await expect(getBarbershop(deps, 'nope')).rejects.toEqual(code('SHOP_NOT_FOUND'));
    });

    it('lists nearby shops, nearest first, within the radius', async () => {
      await createBarbershop(deps, owner.id, shopInput({ name: 'Paulista' }));
      await createBarbershop(deps, ana.id, shopInput({ name: 'Pinheiros', ...pinheiros }));
      await createBarbershop(deps, jose.id, shopInput({ name: 'Itaquera', ...itaquera }));

      const near = await findNearby(deps, { ...paulista, radiusKm: 10, limit: 20 });

      expect(near.map((n) => n.shop.name)).toEqual(['Paulista', 'Pinheiros']);
      expect(near[1]!.distanceKm).toBeGreaterThan(3);
      await expect(findNearby(deps, { ...paulista, radiusKm: 51, limit: 20 })).rejects.toEqual(
        code('INVALID_RADIUS'),
      );
    });

    it('searches by name and asks for at least 2 characters', async () => {
      await createBarbershop(deps, owner.id, shopInput());

      expect(
        (await searchBarbershops(deps, { query: 'mega', limit: 20, offset: 0 }))[0]!.name,
      ).toBe('Mega Barbearia SP');
      await expect(searchBarbershops(deps, { query: ' m ', limit: 20, offset: 0 })).rejects.toEqual(
        code('INVALID_SEARCH'),
      );
    });
  });

  describe('invites', () => {
    beforeEach(() => createBarbershop(deps, owner.id, shopInput()));

    const inviteJose = async () => {
      await inviteBarber(deps, owner.id, 'Jose@X.com');
      const mail = deps.mailer.sent.at(-1)!;
      return mail.text.match(/code: (\S+)/)![1]!;
    };

    it('emails the invite and lets the invited user join as a barber', async () => {
      const token = await inviteJose();

      expect(deps.mailer.sent.at(-1)).toMatchObject({
        to: 'jose@x.com',
        subject: 'You were invited to join Mega Barbearia SP',
      });
      const barber = await acceptInvite(deps, jose.id, token);

      expect(barber.userId).toBe(jose.id);
      expect(barber.isActive).toBe(true);
    });

    it('is only for the shop owner', async () => {
      await expect(inviteBarber(deps, ana.id, 'jose@x.com')).rejects.toEqual(
        code('NOT_SHOP_OWNER'),
      );
    });

    it('refuses a user signed in with another email', async () => {
      const token = await inviteJose();

      await expect(acceptInvite(deps, ana.id, token)).rejects.toEqual(
        code('INVITE_EMAIL_MISMATCH'),
      );
    });

    it('works once, and not after 7 days or a revoke', async () => {
      const token = await inviteJose();
      await acceptInvite(deps, jose.id, token);
      await expect(acceptInvite(deps, jose.id, token)).rejects.toEqual(code('INVITE_NOT_FOUND'));

      await inviteBarber(deps, owner.id, 'ana@x.com');
      const anaToken = deps.mailer.sent.at(-1)!.text.match(/code: (\S+)/)![1]!;
      clock.advanceMinutes(7 * DAY_MIN);
      await expect(acceptInvite(deps, ana.id, anaToken)).rejects.toEqual(code('INVITE_EXPIRED'));
    });

    it('can be revoked by the owner', async () => {
      const invite = await inviteBarber(deps, owner.id, 'jose@x.com');
      const token = deps.mailer.sent.at(-1)!.text.match(/code: (\S+)/)![1]!;

      await revokeInvite(deps, owner.id, invite.id);

      await expect(acceptInvite(deps, jose.id, token)).rejects.toEqual(code('INVITE_NOT_FOUND'));
    });

    it('does not send a second invite while one is pending, but replaces an expired one', async () => {
      await inviteJose();
      await expect(inviteBarber(deps, owner.id, 'jose@x.com')).rejects.toEqual(
        code('INVITE_ALREADY_SENT'),
      );

      clock.advanceMinutes(8 * DAY_MIN);
      const token = await inviteJose();

      expect((await acceptInvite(deps, jose.id, token)).userId).toBe(jose.id);
    });

    it('does not leave a stuck invite when the email fails', async () => {
      const send = deps.mailer.send.bind(deps.mailer);
      deps.mailer.send = async () => {
        throw new Error('SMTP down');
      };
      await expect(inviteBarber(deps, owner.id, 'jose@x.com')).rejects.toEqual(
        code('EMAIL_NOT_SENT'),
      );

      deps.mailer.send = send;
      const token = await inviteJose();
      expect((await acceptInvite(deps, jose.id, token)).userId).toBe(jose.id);
    });

    it('refuses to invite someone already barbering in the shop', async () => {
      await acceptInvite(deps, jose.id, await inviteJose());

      await expect(inviteBarber(deps, owner.id, 'jose@x.com')).rejects.toEqual(
        code('ALREADY_A_BARBER'),
      );
    });

    it('refuses a user who already barbers in another shop', async () => {
      await createBarbershop(deps, ana.id, shopInput({ name: 'Ana Cortes' }));
      await becomeBarber(deps, ana.id);
      await inviteBarber(deps, owner.id, 'ana@x.com');
      const token = deps.mailer.sent.at(-1)!.text.match(/code: (\S+)/)![1]!;

      await expect(acceptInvite(deps, ana.id, token)).rejects.toEqual(code('ALREADY_A_BARBER'));
    });
  });

  describe('barbers and services', () => {
    beforeEach(() => createBarbershop(deps, owner.id, shopInput()));

    it('lets the owner barber in their own shop, once', async () => {
      const barber = await becomeBarber(deps, owner.id);

      expect(barber.userId).toBe(owner.id);
      await expect(becomeBarber(deps, owner.id)).rejects.toEqual(code('ALREADY_A_BARBER'));
    });

    it('lets a barber edit their profile and services, and nobody else', async () => {
      await becomeBarber(deps, owner.id);
      await updateBarberProfile(deps, owner.id, { bio: 'Degradê' });

      const corte = await createService(deps, owner.id, {
        name: 'Corte',
        description: '',
        priceCents: 5000,
        durationMinutes: 15,
      });
      await updateService(deps, owner.id, corte.id, { priceCents: 5500 });

      expect((await deps.services.findById(corte.id))!.priceCents).toBe(5500);
      await expect(updateService(deps, ana.id, corte.id, { priceCents: 1 })).rejects.toEqual(
        code('NOT_SERVICE_OWNER'),
      );
      await expect(
        createService(deps, ana.id, {
          name: 'X',
          description: '',
          priceCents: 1,
          durationMinutes: 5,
        }),
      ).rejects.toEqual(code('NOT_A_BARBER'));
      await expect(updateBarberProfile(deps, ana.id, { bio: 'x' })).rejects.toEqual(
        code('NOT_A_BARBER'),
      );

      await archiveService(deps, owner.id, corte.id);
      expect((await deps.services.findById(corte.id))!.isArchived).toBe(true);
      await expect(archiveService(deps, owner.id, 'nope')).rejects.toEqual(
        code('SERVICE_NOT_FOUND'),
      );
    });

    it('removes a barber, who then cannot manage services', async () => {
      const barber = await becomeBarber(deps, owner.id);

      await removeBarber(deps, owner.id, barber.id);

      expect((await deps.barbers.findById(barber.id))!.isActive).toBe(false);
      await expect(
        createService(deps, owner.id, {
          name: 'X',
          description: '',
          priceCents: 1,
          durationMinutes: 5,
        }),
      ).rejects.toEqual(code('NOT_A_BARBER'));
    });

    it('only removes barbers of the owner shop', async () => {
      await createBarbershop(deps, ana.id, shopInput({ name: 'Ana Cortes' }));
      const anaBarber = await becomeBarber(deps, ana.id);

      await expect(removeBarber(deps, owner.id, anaBarber.id)).rejects.toEqual(
        code('BARBER_NOT_FOUND'),
      );
    });
  });
});
