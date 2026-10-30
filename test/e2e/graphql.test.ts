import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { GraphQLContext } from '../../src/shared/adapters/graphql/context.js';
import { createGraphQLServer, type GraphQLModule } from '../../src/shared/adapters/graphql/yoga.js';
import { DomainError } from '../../src/shared/domain/domain-error.js';
import { createTestApp, type TestApp } from '../support/app.js';

describe('GraphQL endpoint', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it('answers queries on POST /graphql', async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: '/graphql',
      payload: { query: '{ health }' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ data: { health: 'ok' } });
  });
});

describe('GraphQL error mapping', () => {
  const logged: unknown[] = [];
  const yoga = createGraphQLServer({
    modules: [
      {
        typeDefs: 'extend type Query { ruleBroken: String, crashed: String }',
        resolvers: {
          Query: {
            ruleBroken: () => {
              throw new DomainError('NOT_SHOP_OWNER', 'Only the owner can do this.');
            },
            crashed: () => {
              throw new Error('db password is hunter2');
            },
          },
        } as GraphQLModule['resolvers'],
      },
    ],
    context: async () => ({ currentUserId: null, loaders: {} as GraphQLContext['loaders'] }),
    logError: (error) => logged.push(error),
  });

  const run = async (query: string) => {
    const res = await yoga.fetch('http://test/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    return res.json();
  };

  it('exposes a domain error with its code and message', async () => {
    const body = await run('{ ruleBroken }');

    expect(body.errors[0].message).toBe('Only the owner can do this.');
    expect(body.errors[0].extensions.code).toBe('NOT_SHOP_OWNER');
  });

  it('hides unexpected errors behind a generic message and logs them', async () => {
    const body = await run('{ crashed }');

    expect(body.errors[0].message).toBe('Unexpected error.');
    expect(body.errors[0].extensions.code).toBe('INTERNAL');
    expect(JSON.stringify(body)).not.toContain('hunter2');
    expect(logged).toHaveLength(1);
  });

  it('keeps GraphQL validation errors as they are', async () => {
    const body = await run('{ nope }');

    expect(body.errors[0].message).toContain('nope');
  });
});
