import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../support/app.js';
import { gql } from '../support/gql.js';
import { multipartFile, tinyPng } from '../support/multipart.js';

describe('uploads', () => {
  let t: TestApp;
  let token: string;

  beforeAll(async () => {
    t = await createTestApp();
    const res = await gql(
      t.app,
      'mutation { signUp(input: { name: "Ana", email: "ana@x.com", password: "correct horse" }) { accessToken } }',
    );
    token = res.data!.signUp.accessToken;
  });
  afterAll(() => t.close());

  const upload = (bytes: Uint8Array, auth = true) => {
    const { payload, headers } = multipartFile(bytes, 'logo.png', 'image/png');
    return t.app.inject({
      method: 'POST',
      url: '/uploads',
      payload,
      headers: auth ? { ...headers, authorization: `Bearer ${token}` } : headers,
    });
  };

  it('stores an image and serves the same bytes back', async () => {
    const res = await upload(tinyPng);

    expect(res.statusCode).toBe(201);
    const { id, url } = res.json();
    expect(url).toBe(`http://localhost:4000/files/${id}`);

    const file = await t.app.inject({ method: 'GET', url: `/files/${id}` });
    expect(file.statusCode).toBe(200);
    expect(file.headers['content-type']).toBe('image/png');
    expect(file.headers['x-content-type-options']).toBe('nosniff');
    expect(Buffer.compare(file.rawPayload, tinyPng)).toBe(0);
  });

  it('requires a signed-in user', async () => {
    expect((await upload(tinyPng, false)).statusCode).toBe(401);
  });

  it('rejects a file whose bytes are not an image, whatever its name says', async () => {
    const res = await upload(new TextEncoder().encode('<!doctype html><script>alert(1)</script>'));

    expect(res.statusCode).toBe(415);
    expect(res.json().code).toBe('UNSUPPORTED_FILE_TYPE');
  });

  it('rejects files over 2 MB', async () => {
    const big = Buffer.concat([tinyPng, Buffer.alloc(2 * 1024 * 1024)]);

    const res = await upload(big);

    expect(res.statusCode).toBe(413);
    expect(res.json().code).toBe('FILE_TOO_LARGE');
  });

  it('answers 404 for an unknown or malformed id', async () => {
    expect((await t.app.inject({ method: 'GET', url: `/files/${randomUUID()}` })).statusCode).toBe(
      404,
    );
    expect((await t.app.inject({ method: 'GET', url: '/files/nope' })).statusCode).toBe(404);
  });
});
