import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FixedClock } from '../../src/shared/testing/fixed-clock.js';
import { createTestApp, type TestApp } from '../support/app.js';
import { truncateAll } from '../support/db.js';
import { errorCode, gql } from '../support/gql.js';

const AUTH_FIELDS = 'accessToken accessTokenExpiresAt refreshToken user { id name email }';
const SIGN_UP = `mutation ($input: SignUpInput!) { signUp(input: $input) { ${AUTH_FIELDS} } }`;
const SIGN_IN = `mutation ($input: SignInInput!) { signIn(input: $input) { ${AUTH_FIELDS} } }`;
const REFRESH = `mutation ($token: String!) { refreshToken(token: $token) { ${AUTH_FIELDS} } }`;
const ME = '{ me { id name email createdAt } }';

describe('identity over GraphQL', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(() => truncateAll(t.container.dataSource));
  afterAll(() => t.close());

  const signUp = (email = 'ana@x.com') =>
    gql(t.app, SIGN_UP, { input: { name: 'Ana', email, password: 'correct horse' } });

  it('signs up and reads the profile with the access token', async () => {
    const res = await signUp('Ana@X.com');
    const auth = res.data!.signUp;

    expect(auth.user).toMatchObject({ name: 'Ana', email: 'ana@x.com' });
    expect(new Date(auth.accessTokenExpiresAt).getTime()).toBeGreaterThan(Date.now());

    const me = await gql(t.app, ME, {}, auth.accessToken);
    expect(me.data!.me).toMatchObject({ id: auth.user.id, email: 'ana@x.com' });
  });

  it('rejects a second account with the same email', async () => {
    await signUp('ana@x.com');

    expect(errorCode(await signUp('ANA@x.com'))).toBe('EMAIL_TAKEN');
  });

  it('signs in with the email in another case', async () => {
    await signUp();

    const res = await gql(t.app, SIGN_IN, {
      input: { email: 'ANA@X.COM', password: 'correct horse' },
    });

    expect(res.data!.signIn.user.email).toBe('ana@x.com');
    const wrong = await gql(t.app, SIGN_IN, {
      input: { email: 'ana@x.com', password: 'nope1234' },
    });
    expect(errorCode(wrong)).toBe('INVALID_CREDENTIALS');
  });

  it('rotates the refresh token and refuses the old one', async () => {
    const first = (await signUp()).data!.signUp;

    const second = await gql(t.app, REFRESH, { token: first.refreshToken });
    expect(second.data!.refreshToken.user.id).toBe(first.user.id);

    const reused = await gql(t.app, REFRESH, { token: first.refreshToken });
    expect(errorCode(reused)).toBe('INVALID_REFRESH_TOKEN');
  });

  it('answers UNAUTHENTICATED without a token or with a bad one', async () => {
    expect(errorCode(await gql(t.app, ME))).toBe('UNAUTHENTICATED');
    expect(errorCode(await gql(t.app, ME, {}, 'garbage'))).toBe('UNAUTHENTICATED');
  });

  it('updates the profile name', async () => {
    const { accessToken } = (await signUp()).data!.signUp;

    const res = await gql(
      t.app,
      'mutation { updateProfile(input: { name: "Ana Souza" }) { name } }',
      {},
      accessToken,
    );

    expect(res.data!.updateProfile.name).toBe('Ana Souza');
  });

  it('rejects input that breaks a rule with its code', async () => {
    const res = await gql(t.app, SIGN_UP, {
      input: { name: 'Ana', email: 'not-an-email', password: 'correct horse' },
    });

    expect(errorCode(res)).toBe('INVALID_EMAIL');
  });
});

describe('identity under concurrency and time', () => {
  let t: TestApp;
  const clock = new FixedClock(new Date('2026-11-02T12:00:00Z'));
  beforeAll(async () => {
    t = await createTestApp(undefined, { clock });
  });
  beforeEach(() => truncateAll(t.container.dataSource));
  afterAll(() => t.close());

  const signUp = () =>
    gql(t.app, SIGN_UP, { input: { name: 'Ana', email: 'ana@x.com', password: 'correct horse' } });

  it('answers EMAIL_TAKEN, not INTERNAL, to a double-submitted sign-up', async () => {
    const results = await Promise.all([signUp(), signUp(), signUp()]);

    expect(results.filter((r) => r.data?.signUp)).toHaveLength(1);
    expect(results.filter((r) => errorCode(r) === 'EMAIL_TAKEN')).toHaveLength(2);
  });

  it('leaves no live session when one refresh token is used twice at once', async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      await truncateAll(t.container.dataSource);
      const first = (await signUp()).data!.signUp;

      const results = await Promise.all([
        gql(t.app, REFRESH, { token: first.refreshToken }),
        gql(t.app, REFRESH, { token: first.refreshToken }),
      ]);

      for (const winner of results.filter((r) => r.data?.refreshToken)) {
        const again = await gql(t.app, REFRESH, { token: winner.data!.refreshToken.refreshToken });
        expect(errorCode(again)).toBe('INVALID_REFRESH_TOKEN');
      }
    }
  });

  it('answers UNAUTHENTICATED once the access token expires', async () => {
    const { accessToken } = (await signUp()).data!.signUp;
    expect((await gql(t.app, ME, {}, accessToken)).data?.me).toBeTruthy();

    clock.advanceMinutes(16);

    expect(errorCode(await gql(t.app, ME, {}, accessToken))).toBe('UNAUTHENTICATED');
  });
});
