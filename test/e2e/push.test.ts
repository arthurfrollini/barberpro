import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FakeMailer } from '../../src/modules/shops/testing/in-memory.js';
import { createTestApp, type TestApp } from '../support/app.js';
import { truncateAll } from '../support/db.js';
import { errorCode, gql } from '../support/gql.js';

const REGISTER =
  'mutation ($token: String!, $platform: PushPlatform!) { registerPushToken(token: $token, platform: $platform) }';
const UNREGISTER = 'mutation ($token: String!) { unregisterPushToken(token: $token) }';

describe('push tokens over GraphQL', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp(undefined, { mailer: new FakeMailer() });
  });
  beforeEach(() => truncateAll(t.container.dataSource));
  afterAll(() => t.close());

  const signUp = async (name: string) => {
    const result = await gql(
      t.app,
      'mutation ($input: SignUpInput!) { signUp(input: $input) { accessToken user { id } } }',
      { input: { name, email: `${name}@x.com`, password: 'correct horse' } },
    );
    return result.data!.signUp as { accessToken: string; user: { id: string } };
  };
  const tokensOf = (userId: string) => t.container.notifications.pushTokens.forUser(userId);

  it('registers the phone of the signed-in user', async () => {
    const ana = await signUp('ana');
    const result = await gql(
      t.app,
      REGISTER,
      { token: 'ExpoPushToken[ana-phone]', platform: 'IOS' },
      ana.accessToken,
    );
    expect(result.data).toEqual({ registerPushToken: true });
    expect(await tokensOf(ana.user.id)).toEqual([
      { token: 'ExpoPushToken[ana-phone]', platform: 'ios' },
    ]);
  });

  it('moves a phone to whoever signs in on it next', async () => {
    const ana = await signUp('ana');
    const bia = await signUp('bia');
    await gql(
      t.app,
      REGISTER,
      { token: 'ExpoPushToken[shared]', platform: 'ANDROID' },
      ana.accessToken,
    );
    await gql(
      t.app,
      REGISTER,
      { token: 'ExpoPushToken[shared]', platform: 'ANDROID' },
      bia.accessToken,
    );
    expect(await tokensOf(ana.user.id)).toEqual([]);
    expect(await tokensOf(bia.user.id)).toHaveLength(1);
  });

  it('unregisters only its own phone', async () => {
    const ana = await signUp('ana');
    const bia = await signUp('bia');
    await gql(
      t.app,
      REGISTER,
      { token: 'ExpoPushToken[ana-phone]', platform: 'IOS' },
      ana.accessToken,
    );

    expect(
      (await gql(t.app, UNREGISTER, { token: 'ExpoPushToken[ana-phone]' }, bia.accessToken)).data,
    ).toEqual({
      unregisterPushToken: false,
    });
    expect(
      (await gql(t.app, UNREGISTER, { token: 'ExpoPushToken[ana-phone]' }, ana.accessToken)).data,
    ).toEqual({
      unregisterPushToken: true,
    });
    expect(await tokensOf(ana.user.id)).toEqual([]);
  });

  it('needs a session and a real Expo token', async () => {
    expect(
      errorCode(await gql(t.app, REGISTER, { token: 'ExpoPushToken[x]', platform: 'IOS' })),
    ).toBe('UNAUTHENTICATED');
    const ana = await signUp('ana');
    expect(
      errorCode(
        await gql(t.app, REGISTER, { token: 'not-a-token', platform: 'IOS' }, ana.accessToken),
      ),
    ).toBe('INVALID_PUSH_TOKEN');
  });
});
