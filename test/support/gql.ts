import type { FastifyInstance } from 'fastify';

export type GqlResult<T = Record<string, any>> = {
  data?: T;
  errors?: { message: string; extensions?: { code?: string } }[];
};

/** Sends one GraphQL operation through the real HTTP stack. */
export async function gql<T = Record<string, any>>(
  app: FastifyInstance,
  query: string,
  variables: Record<string, unknown> = {},
  token?: string,
): Promise<GqlResult<T>> {
  const res = await app.inject({
    method: 'POST',
    url: '/graphql',
    headers: token ? { authorization: `Bearer ${token}` } : {},
    payload: { query, variables },
  });
  return res.json();
}

export const errorCode = (result: GqlResult) => result.errors?.[0]?.extensions?.code;
