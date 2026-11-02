import type { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { schedulingRepositories } from '../../../src/modules/scheduling/adapters/persistence/repositories.js';
import {
  bookAppointment,
  cancelAppointment,
  rescheduleAppointment,
} from '../../../src/modules/scheduling/application/booking.js';
import type {
  SchedulingDeps,
  SchedulingRepositories,
} from '../../../src/modules/scheduling/application/ports.js';
import { blockDate } from '../../../src/modules/scheduling/application/schedule.js';
import { WeeklySchedule } from '../../../src/modules/scheduling/domain/weekly-schedule.js';
import { RecordingEvents } from '../../../src/modules/scheduling/testing/in-memory.js';
import { shopsRepositories } from '../../../src/modules/shops/adapters/persistence/repositories.js';
import { removeBarber } from '../../../src/modules/shops/application/barbers.js';
import { FixedClock } from '../../../src/shared/testing/fixed-clock.js';
import { createTestApp } from '../../support/app.js';
import { closeTestDataSource, testDataSource, truncateAll } from '../../support/db.js';
import { seedShop } from '../../support/seed.js';

const at = (iso: string) => new Date(iso);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Pauses the first busyFor call after `arm()`: availability is checked, the write has not
 * happened yet. That is the window where a concurrent change can slip in.
 */
function gate() {
  let armed = false;
  let reached!: () => void;
  let release!: () => void;
  const reachedP = new Promise<void>((r) => (reached = r));
  const releaseP = new Promise<void>((r) => (release = r));
  const wrap = (repos: SchedulingRepositories): SchedulingRepositories => {
    const busyFor = repos.appointments.busyFor.bind(repos.appointments);
    repos.appointments.busyFor = async (...args) => {
      if (armed) {
        armed = false;
        reached();
        await releaseP;
      }
      return busyFor(...args);
    };
    return repos;
  };
  return { wrap, arm: () => (armed = true), reached: reachedP, release: () => release() };
}

describe('scheduling under concurrency', () => {
  let ds: DataSource;
  const clock = new FixedClock(at('2026-11-02T09:00:00Z')); // Monday 06:00 in São Paulo

  beforeAll(async () => {
    ds = await testDataSource();
  });
  beforeEach(() => truncateAll(ds));
  afterAll(closeTestDataSource);

  const setup = async () => {
    const seed = await seedShop(ds);
    const jose = await seed.addBarber('jose');
    const ana = await seed.user('ana');
    await schedulingRepositories(ds.manager).schedules.replaceWeekly(
      jose.barber.id,
      WeeklySchedule.of([{ weekday: 1, startMinute: 8 * 60, endMinute: 20 * 60 }]),
    );
    const g = gate();
    const shops = shopsRepositories(ds.manager);
    const deps: SchedulingDeps = {
      ...g.wrap(schedulingRepositories(ds.manager)),
      transaction: (work) => ds.transaction((m) => work(g.wrap(schedulingRepositories(m)))),
      directory: {
        barber: (id) => shops.barbers.findById(id),
        shop: (id) => shops.shops.findById(id),
        service: (id) => shops.services.findById(id),
      },
      events: new RecordingEvents(),
      clock,
    };
    const book = (startsAt: string) =>
      bookAppointment(deps, ana.id, {
        barberId: jose.barber.id,
        serviceId: jose.service.id,
        startsAt: at(startsAt),
        reminderLeadMinutes: null,
      });
    return { deps, g, jose, ana, book };
  };

  it('a cancel that succeeds while a reschedule is in flight stays canceled', async () => {
    const { deps, g, jose, ana, book } = await setup();
    const appointment = await book('2026-11-02T17:00:00Z');

    g.arm();
    const reschedule = rescheduleAppointment(
      deps,
      ana.id,
      appointment.id,
      at('2026-11-02T18:00:00Z'),
    );
    await g.reached;
    const cancel = cancelAppointment(deps, jose.user.id, appointment.id);
    await sleep(150);
    g.release();
    const [, canceled] = await Promise.allSettled([reschedule, cancel]);

    const final = await deps.appointments.findById(appointment.id);
    if (canceled.status === 'fulfilled') expect(final?.status).toBe('canceled');
  });

  it('a booking in flight while the day is blocked does not survive on the blocked day', async () => {
    const { deps, g, jose, book } = await setup();

    g.arm();
    const booking = book('2026-11-02T17:00:00Z');
    await g.reached;
    const block = blockDate(deps, jose.user.id, jose.barber.id, '2026-11-02');
    await sleep(150);
    g.release();
    await Promise.allSettled([booking, block]);

    const day = await deps.appointments.forBarberBetween(
      jose.barber.id,
      at('2026-11-02T03:00:00Z'),
      at('2026-11-03T03:00:00Z'),
    );
    expect(day.filter((a) => a.status === 'booked')).toEqual([]);
  });

  it('removing a barber is all or nothing with the cancellations', async () => {
    const t = await createTestApp(undefined, { clock });
    try {
      const seed = await seedShop(t.container.dataSource);
      const jose = await seed.addBarber('jose');
      const ana = await seed.user('ana');
      await t.container.scheduling.schedules.replaceWeekly(
        jose.barber.id,
        WeeklySchedule.of([{ weekday: 1, startMinute: 8 * 60, endMinute: 20 * 60 }]),
      );
      await bookAppointment(t.container.scheduling, ana.id, {
        barberId: jose.barber.id,
        serviceId: jose.service.id,
        startsAt: at('2026-11-02T17:00:00Z'),
        reminderLeadMinutes: null,
      });
      // make the cancellation step fail inside the database
      await t.container.dataSource.query(`
        CREATE FUNCTION fail_update() RETURNS trigger AS $$
        BEGIN RAISE EXCEPTION 'simulated failure'; END $$ LANGUAGE plpgsql;
        CREATE TRIGGER fail_update BEFORE UPDATE ON appointments
          FOR EACH ROW EXECUTE FUNCTION fail_update();`);

      await expect(
        removeBarber(t.container.shops, seed.owner.id, jose.barber.id),
      ).rejects.toThrow();

      expect((await t.container.shops.barbers.findById(jose.barber.id))?.isActive).toBe(true);
    } finally {
      await t.container.dataSource.query(
        'DROP TRIGGER IF EXISTS fail_update ON appointments; DROP FUNCTION IF EXISTS fail_update();',
      );
      await t.close();
    }
  });

  it('never books one person at two shops at the same time', async () => {
    const seed = await seedShop(ds);
    const jose = await seed.addBarber('jose');
    const otherShop = await seed.addShop('Filial');
    const joseThere = await seed.addBarber('jose', { existing: jose.user, shopId: otherShop.id });
    const hours = WeeklySchedule.of([{ weekday: 1, startMinute: 8 * 60, endMinute: 20 * 60 }]);
    const schedules = schedulingRepositories(ds.manager).schedules;
    await schedules.replaceWeekly(jose.barber.id, hours);
    await schedules.replaceWeekly(joseThere.barber.id, hours);
    const [ana, bia] = [await seed.user('ana'), await seed.user('bia')];
    // pause the first booking after it read José's free time and before it writes, so the
    // second booking, at the other shop, commits in between: only the database can refuse it
    let armed = true;
    let reached!: () => void;
    let release!: () => void;
    const reachedP = new Promise<void>((r) => (reached = r));
    const releaseP = new Promise<void>((r) => (release = r));
    const pauseAfterRead = (repos: SchedulingRepositories): SchedulingRepositories => {
      const busyFor = repos.appointments.busyFor.bind(repos.appointments);
      repos.appointments.busyFor = async (...args) => {
        const busy = await busyFor(...args);
        if (armed) {
          armed = false;
          reached();
          await releaseP;
        }
        return busy;
      };
      return repos;
    };
    const shops = shopsRepositories(ds.manager);
    const deps: SchedulingDeps = {
      ...schedulingRepositories(ds.manager),
      transaction: (work) => ds.transaction((m) => work(pauseAfterRead(schedulingRepositories(m)))),
      directory: {
        barber: (id) => shops.barbers.findById(id),
        shop: (id) => shops.shops.findById(id),
        service: (id) => shops.services.findById(id),
      },
      events: new RecordingEvents(),
      clock,
    };

    const first = bookAppointment(deps, ana.id, {
      barberId: jose.barber.id,
      serviceId: jose.service.id,
      startsAt: at('2026-11-02T17:00:00Z'),
      reminderLeadMinutes: null,
    });
    await reachedP;
    const second = await bookAppointment(deps, bia.id, {
      barberId: joseThere.barber.id,
      serviceId: joseThere.service.id,
      startsAt: at('2026-11-02T17:15:00Z'),
      reminderLeadMinutes: null,
    });
    release();
    const results = [
      { status: 'fulfilled' as const, value: second },
      ...(await Promise.allSettled([first])),
    ];

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failed = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(failed.reason).toMatchObject({ code: 'SLOT_UNAVAILABLE' });
  });
});
