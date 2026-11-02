import type { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { schedulingRepositories } from '../../../src/modules/scheduling/adapters/persistence/repositories.js';
import { Appointment } from '../../../src/modules/scheduling/domain/appointment.js';
import { WeeklySchedule } from '../../../src/modules/scheduling/domain/weekly-schedule.js';
import { closeTestDataSource, testDataSource, truncateAll } from '../../support/db.js';
import { seedShop } from '../../support/seed.js';

const now = new Date('2026-11-02T09:00:00Z');
const at = (iso: string) => new Date(iso);

describe('scheduling repositories', () => {
  let ds: DataSource;
  let repos: ReturnType<typeof schedulingRepositories>;
  let seed: Awaited<ReturnType<typeof seedShop>>;

  beforeAll(async () => {
    ds = await testDataSource();
    repos = schedulingRepositories(ds.manager);
  });
  beforeEach(async () => {
    await truncateAll(ds);
    seed = await seedShop(ds);
  });
  afterAll(closeTestDataSource);

  const booking = (
    barber: { id: string; userId: string },
    service: { id: string },
    customerId: string,
    startsAt: string,
  ) =>
    Appointment.book(
      {
        barberId: barber.id,
        barberUserId: barber.userId,
        customerId,
        service: { id: service.id, name: 'Corte', priceCents: 6000, durationMinutes: 30 },
        startsAt: at(startsAt),
        reminderLeadMinutes: 15,
      },
      now,
    );

  it('replaces the weekly schedule and keeps blocked dates', async () => {
    const { barber } = await seed.addBarber('joao');
    await repos.schedules.replaceWeekly(
      barber.id,
      WeeklySchedule.of([
        { weekday: 1, startMinute: 600, endMinute: 720 },
        { weekday: 1, startMinute: 840, endMinute: 1320 },
      ]),
    );
    await repos.schedules.replaceWeekly(
      barber.id,
      WeeklySchedule.of([{ weekday: 2, startMinute: 480, endMinute: 1200 }]),
    );
    await repos.schedules.block(barber.id, '2026-11-04');
    await repos.schedules.block(barber.id, '2026-11-04');

    const { schedule, blockedDates } = await repos.schedules.get(barber.id);

    expect(schedule.intervals).toEqual([{ weekday: 2, startMinute: 480, endMinute: 1200 }]);
    expect([...blockedDates]).toEqual(['2026-11-04']);
    await repos.schedules.unblock(barber.id, '2026-11-04');
    expect((await repos.schedules.get(barber.id)).blockedDates.size).toBe(0);
  });

  it('round-trips an appointment and lists busy times', async () => {
    const { barber, service } = await seed.addBarber('joao');
    const ana = await seed.user('ana');
    const a = booking(barber, service, ana.id, '2026-11-02T17:00:00Z');
    await repos.appointments.insert(a);

    const found = await repos.appointments.findById(a.id);
    expect(found).toMatchObject({ serviceName: 'Corte', priceCents: 6000, status: 'booked' });
    expect(found?.endsAt).toEqual(at('2026-11-02T17:30:00Z'));

    const busy = await repos.appointments.busyFor(
      barber.userId,
      at('2026-11-02T00:00:00Z'),
      at('2026-11-03T00:00:00Z'),
    );
    expect(busy).toEqual([
      { startsAt: at('2026-11-02T17:00:00Z'), endsAt: at('2026-11-02T17:30:00Z') },
    ]);
    expect(
      await repos.appointments.busyFor(
        barber.userId,
        at('2026-11-02T00:00:00Z'),
        at('2026-11-03T00:00:00Z'),
        a.id,
      ),
    ).toEqual([]);
  });

  it('refuses an overlapping booking for the same barber until the first is canceled', async () => {
    const { barber, service } = await seed.addBarber('joao');
    const ana = await seed.user('ana');
    const bia = await seed.user('bia');
    const first = booking(barber, service, ana.id, '2026-11-02T17:00:00Z');
    await repos.appointments.insert(first);

    await expect(
      repos.appointments.insert(booking(barber, service, bia.id, '2026-11-02T17:15:00Z')),
    ).rejects.toEqual(expect.objectContaining({ code: 'SLOT_UNAVAILABLE' }));

    first.cancel({ userId: ana.id, reason: 'customer' }, now);
    await repos.appointments.update(first);
    await repos.appointments.insert(booking(barber, service, bia.id, '2026-11-02T17:15:00Z'));
  });

  it('refuses a customer two overlapping appointments with different barbers', async () => {
    const joao = await seed.addBarber('joao');
    const jose = await seed.addBarber('jose');
    const ana = await seed.user('ana');
    await repos.appointments.insert(
      booking(joao.barber, joao.service, ana.id, '2026-11-02T17:00:00Z'),
    );

    await expect(
      repos.appointments.insert(booking(jose.barber, jose.service, ana.id, '2026-11-02T17:15:00Z')),
    ).rejects.toEqual(expect.objectContaining({ code: 'CUSTOMER_BUSY' }));
  });

  it('lets exactly one of two simultaneous bookings for the same slot win', async () => {
    const { barber, service } = await seed.addBarber('joao');
    const ana = await seed.user('ana');
    const bia = await seed.user('bia');

    const results = await Promise.allSettled([
      repos.appointments.insert(booking(barber, service, ana.id, '2026-11-02T17:00:00Z')),
      schedulingRepositories(ds.manager).appointments.insert(
        booking(barber, service, bia.id, '2026-11-02T17:00:00Z'),
      ),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ code: 'SLOT_UNAVAILABLE' });
  });

  it('lists appointments for the customer and the barber in time order', async () => {
    const { barber, service } = await seed.addBarber('joao');
    const ana = await seed.user('ana');
    await repos.appointments.insert(booking(barber, service, ana.id, '2026-11-02T19:00:00Z'));
    await repos.appointments.insert(booking(barber, service, ana.id, '2026-11-02T17:00:00Z'));

    const mine = await repos.appointments.forCustomer(ana.id, at('2026-11-02T18:00:00Z'));
    expect(mine.map((a) => a.startsAt.toISOString())).toEqual(['2026-11-02T19:00:00.000Z']);

    const day = await repos.appointments.forBarberBetween(
      barber.id,
      at('2026-11-02T03:00:00Z'),
      at('2026-11-03T03:00:00Z'),
    );
    expect(day.map((a) => a.startsAt.toISOString())).toEqual([
      '2026-11-02T17:00:00.000Z',
      '2026-11-02T19:00:00.000Z',
    ]);
    expect(await repos.appointments.bookedFrom(barber.id, at('2026-11-02T18:00:00Z'))).toHaveLength(
      1,
    );
  });
});
