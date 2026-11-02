import { PostgresQueryRunner } from 'typeorm/driver/postgres/PostgresQueryRunner.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeMailer } from '../../src/modules/shops/testing/in-memory.js';
import { createTestApp, type TestApp } from '../support/app.js';
import { truncateAll } from '../support/db.js';
import { errorCode, gql } from '../support/gql.js';
import { multipartFile, tinyPng } from '../support/multipart.js';

const paulista = { latitude: -23.5614, longitude: -46.6559 };

describe('shops over GraphQL', () => {
  let t: TestApp;
  const mailer = new FakeMailer();

  beforeAll(async () => {
    t = await createTestApp(undefined, { mailer });
  });
  beforeEach(async () => {
    await truncateAll(t.container.dataSource);
    mailer.sent.length = 0;
  });
  afterAll(() => t.close());

  const signUp = async (name: string, email: string): Promise<string> => {
    const res = await gql(
      t.app,
      'mutation ($input: SignUpInput!) { signUp(input: $input) { accessToken } }',
      { input: { name, email, password: 'correct horse' } },
    );
    return res.data!.signUp.accessToken;
  };

  const createShop = (
    token: string,
    name = 'Mega Barbearia SP',
    at = paulista,
    logoFileId?: string,
  ) =>
    gql(
      t.app,
      `mutation ($input: CreateBarbershopInput!) {
        createBarbershop(input: $input) { id name yearsActive logoUrl latitude longitude timezone }
      }`,
      {
        input: { name, foundedYear: 2010, address: 'Av. Paulista, 1000', ...at, logoFileId },
      },
      token,
    );

  const inviteCode = () => mailer.sent.at(-1)!.text.match(/code: (\S+)/)![1]!;

  it('runs the whole story: shop, invite, barber, services, public browsing', async () => {
    const owner = await signUp('Marcos', 'marcos@x.com');
    const upload = multipartFile(tinyPng, 'logo.png', 'image/png');
    const logo = await t.app.inject({
      method: 'POST',
      url: '/uploads',
      payload: upload.payload,
      headers: { ...upload.headers, authorization: `Bearer ${owner}` },
    });

    const created = await createShop(owner, 'Mega Barbearia SP', paulista, logo.json().id);
    const shop = created.data!.createBarbershop;
    expect(shop).toMatchObject({
      name: 'Mega Barbearia SP',
      timezone: 'America/Sao_Paulo',
      logoUrl: logo.json().url,
    });
    expect(shop.yearsActive).toBeGreaterThanOrEqual(16);

    const invited = await gql(
      t.app,
      'mutation { inviteBarber(email: "Jose@X.com") { email status } }',
      {},
      owner,
    );
    expect(invited.data!.inviteBarber).toEqual({ email: 'jose@x.com', status: 'PENDING' });
    expect(mailer.sent.at(-1)!.subject).toBe('You were invited to join Mega Barbearia SP');

    const jose = await signUp('José', 'jose@x.com');
    const accepted = await gql(
      t.app,
      'mutation ($token: String!) { acceptInvite(token: $token) { name barbershop { name } } }',
      { token: inviteCode() },
      jose,
    );
    expect(accepted.data!.acceptInvite).toEqual({
      name: 'José',
      barbershop: { name: 'Mega Barbearia SP' },
    });

    await gql(
      t.app,
      `mutation { createService(input: { name: "Corte", priceCents: 5000, durationMinutes: 15 }) { id } }`,
      {},
      jose,
    );
    await gql(t.app, 'mutation { becomeBarber { id } }', {}, owner);

    // a stranger, without a token
    const nearby = await gql(
      t.app,
      `{ barbershopsNearby(latitude: -23.567, longitude: -46.692, radiusKm: 10) {
          distanceKm barbershop { name barbers { name services { name priceCents durationMinutes } } }
      } }`,
    );
    const found = nearby.data!.barbershopsNearby;
    expect(found).toHaveLength(1);
    expect(found[0].distanceKm).toBeGreaterThan(3);
    expect(found[0].barbershop.barbers).toEqual([
      { name: 'José', services: [{ name: 'Corte', priceCents: 5000, durationMinutes: 15 }] },
      { name: 'Marcos', services: [] },
    ]);

    const search = await gql(t.app, '{ searchBarbershops(query: "barbaria") { id } }');
    expect(search.data!.searchBarbershops).toEqual([{ id: shop.id }]);

    const joseBarber = await gql(t.app, '{ myBarberProfile { id } }', {}, jose);
    await gql(
      t.app,
      'mutation ($id: ID!) { removeBarber(id: $id) { id } }',
      { id: joseBarber.data!.myBarberProfile.id },
      owner,
    );
    const after = await gql(t.app, '{ barbershop(id: "' + shop.id + '") { barbers { name } } }');
    expect(after.data!.barbershop.barbers).toEqual([{ name: 'Marcos' }]);
  });

  it('keeps owner operations to the owner', async () => {
    const owner = await signUp('Marcos', 'marcos@x.com');
    await createShop(owner);
    const ana = await signUp('Ana', 'ana@x.com');

    const res = await gql(t.app, 'mutation { inviteBarber(email: "jose@x.com") { id } }', {}, ana);
    expect(errorCode(res)).toBe('NOT_SHOP_OWNER');

    const shopId = (await gql(t.app, '{ myBarbershop { id } }', {}, owner)).data!.myBarbershop.id;
    const invites = await gql(t.app, `{ barbershop(id: "${shopId}") { invites { id } } }`, {}, ana);
    expect(errorCode(invites)).toBe('NOT_SHOP_OWNER');
  });

  it('refuses an invite accepted by someone signed in with another email', async () => {
    const owner = await signUp('Marcos', 'marcos@x.com');
    await createShop(owner);
    await gql(t.app, 'mutation { inviteBarber(email: "jose@x.com") { id } }', {}, owner);
    const ana = await signUp('Ana', 'ana@x.com');

    const res = await gql(
      t.app,
      'mutation ($token: String!) { acceptInvite(token: $token) { id } }',
      { token: inviteCode() },
      ana,
    );

    expect(errorCode(res)).toBe('INVITE_EMAIL_MISMATCH');
  });

  it('answers null, not an error, for a malformed or unknown shop id', async () => {
    const res = await gql(
      t.app,
      '{ a: barbershop(id: "nope") { id } b: barbershop(id: "6f1c1f0e-0000-4000-8000-000000000000") { id } }',
    );

    expect(res.errors).toBeUndefined();
    expect(res.data).toEqual({ a: null, b: null });
  });

  it('loads barbers and services in batches, not once per shop', async () => {
    for (const [i, email] of ['a@x.com', 'b@x.com', 'c@x.com'].entries()) {
      const token = await signUp(`Owner ${i}`, email);
      await createShop(token, `Barbearia ${i}`);
      await gql(t.app, 'mutation { becomeBarber { id } }', {}, token);
      await gql(
        t.app,
        `mutation { createService(input: { name: "Corte", priceCents: 5000, durationMinutes: 30 }) { id } }`,
        {},
        token,
      );
    }
    const query = vi.spyOn(PostgresQueryRunner.prototype, 'query');

    const res = await gql(
      t.app,
      '{ searchBarbershops(query: "barbearia") { name barbers { name services { name } } } }',
    );

    expect(res.data!.searchBarbershops).toHaveLength(3);
    // search, barbers of all shops, their users, their services
    expect(query.mock.calls.length).toBeLessThanOrEqual(4);
    query.mockRestore();
  });
});

describe('shops review fixes', () => {
  let t: TestApp;
  const mailer = new FakeMailer();
  beforeAll(async () => {
    t = await createTestApp(undefined, { mailer });
  });
  beforeEach(() => truncateAll(t.container.dataSource));
  afterAll(() => t.close());

  const token = async (email: string) =>
    (
      await gql(
        t.app,
        'mutation ($input: SignUpInput!) { signUp(input: $input) { accessToken } }',
        { input: { name: email, email, password: 'correct horse' } },
      )
    ).data!.signUp.accessToken as string;

  it('answers FILE_NOT_FOUND for a malformed file id', async () => {
    const owner = await token('owner@x.com');

    const res = await gql(
      t.app,
      `mutation { createBarbershop(input: { name: "Mega", foundedYear: 2010, address: "Rua 1",
        latitude: -23.56, longitude: -46.65, logoFileId: "abc" }) { id } }`,
      {},
      owner,
    );

    expect(errorCode(res)).toBe('FILE_NOT_FOUND');
  });

  it('hides a removed barber from the public barber query', async () => {
    const owner = await token('owner@x.com');
    await gql(
      t.app,
      `mutation { createBarbershop(input: { name: "Mega", foundedYear: 2010, address: "Rua 1",
        latitude: -23.56, longitude: -46.65 }) { id } }`,
      {},
      owner,
    );
    const id = (await gql(t.app, 'mutation { becomeBarber { id } }', {}, owner)).data!.becomeBarber
      .id;
    await gql(t.app, 'mutation ($id: ID!) { removeBarber(id: $id) { id } }', { id }, owner);

    const res = await gql(t.app, 'query ($id: ID!) { barber(id: $id) { id } }', { id });

    expect(res.data!.barber).toBeNull();
  });
});
