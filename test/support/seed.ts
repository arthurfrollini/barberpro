import type { DataSource } from 'typeorm';
import { TypeOrmUserRepository } from '../../src/modules/identity/adapters/persistence/typeorm-user-repository.js';
import { Email } from '../../src/modules/identity/domain/email.js';
import { User } from '../../src/modules/identity/domain/user.js';
import { shopsRepositories } from '../../src/modules/shops/adapters/persistence/repositories.js';
import { Barber } from '../../src/modules/shops/domain/barber.js';
import { Barbershop } from '../../src/modules/shops/domain/barbershop.js';
import { Location } from '../../src/modules/shops/domain/location.js';
import { Service } from '../../src/modules/shops/domain/service.js';

const now = new Date('2026-11-01T12:00:00Z');

/** Rows the scheduling tests need: users, a shop, a barber and a 30-minute service. */
export async function seedShop(ds: DataSource) {
  const users = new TypeOrmUserRepository(ds.manager);
  const shops = shopsRepositories(ds.manager);
  const user = async (name: string) => {
    const u = User.create({ name, email: Email.parse(`${name}@x.com`), passwordHash: 'h', now });
    await users.save(u);
    return u;
  };
  const owner = await user('owner');
  const shop = Barbershop.create(
    {
      ownerId: owner.id,
      name: 'Mega',
      description: '',
      foundedYear: 2010,
      logoFileId: null,
      address: 'Rua 1',
      location: Location.of(-23.56, -46.65),
      timezone: 'America/Sao_Paulo',
    },
    now,
  );
  await shops.shops.save(shop);
  const addBarber = async (name: string) => {
    const u = await user(name);
    const barber = Barber.create({ shopId: shop.id, userId: u.id }, now);
    await shops.barbers.save(barber);
    const service = Service.create(
      {
        barberId: barber.id,
        name: 'Corte',
        description: '',
        priceCents: 6000,
        durationMinutes: 30,
      },
      now,
    );
    await shops.services.save(service);
    return { user: u, barber, service };
  };
  return { owner, shop, user, addBarber };
}
