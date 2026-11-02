import { HttpResponse } from 'msw';
import { graphql, type GraphQLResponseBody } from 'msw/graphql';

/** MSW handlers for the dashboard's GraphQL endpoint, whatever origin the test runs on. */
export const api = graphql.link('*/graphql');

type Body = GraphQLResponseBody<Record<string, unknown>>;

export const gqlData = (data: Record<string, unknown>) => HttpResponse.json<Body>({ data });

export const gqlError = (code: string, message = code) =>
  HttpResponse.json<Body>({ errors: [{ message, extensions: { code } }] });
