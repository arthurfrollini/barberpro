import type { TypedDocumentString } from '@/gql/graphql';
import { ApiError } from './errors';
import type { SessionStore } from './session';

type GraphQLResponse<R> = {
  data?: R | null;
  errors?: { message: string; extensions?: { code?: string } }[];
};

/** `timeoutMs` bounds a GraphQL call, body included. */
export type Transport = { baseUrl: string; fetch: typeof fetch; timeoutMs: number };

/** Long enough for a slow phone connection, short enough that a hung request ends. */
export const REQUEST_TIMEOUT_MS = 15_000;

const networkError = () =>
  new ApiError('NETWORK_ERROR', 'Could not reach the API or it failed to answer.');
const timeoutError = () => new ApiError('TIMEOUT', 'The API did not answer in time.');

/**
 * One POST to /graphql. Throws NETWORK_ERROR when there is no usable GraphQL answer, TIMEOUT
 * when none came in time (a mutation that timed out may still have been applied). The timer
 * is our own: `AbortSignal.timeout` is missing from some React Native runtimes.
 */
export async function postGraphQL<R, V>(
  transport: Transport,
  document: TypedDocumentString<R, V>,
  variables: V | undefined,
  token: string | null,
): Promise<GraphQLResponse<R>> {
  const controller = new AbortController();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(timeoutError());
    }, transport.timeoutMs);
  });
  const call = (async () => {
    let response: Response;
    try {
      response = await transport.fetch(`${transport.baseUrl}/graphql`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          accept: 'application/graphql-response+json, application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query: document.toString(), variables }),
      });
    } catch {
      throw timedOut ? timeoutError() : networkError();
    }
    if (response.status >= 500) throw networkError();
    try {
      return (await response.json()) as GraphQLResponse<R>;
    } catch {
      throw timedOut ? timeoutError() : networkError();
    }
  })();
  try {
    return await Promise.race([call, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

export function unwrap<R>(result: GraphQLResponse<R>): R {
  const error = result.errors?.[0];
  if (error) throw new ApiError(error.extensions?.code ?? 'INTERNAL', error.message);
  if (!result.data) throw new ApiError('INTERNAL', 'The API returned no data.');
  return result.data;
}

const isUnauthenticated = (result: GraphQLResponse<unknown>) =>
  result.errors?.[0]?.extensions?.code === 'UNAUTHENTICATED';

/**
 * The only code that talks to the API. Adds the access token, and when the API rejects it
 * (expired or revoked early), refreshes once and retries; a second rejection signs out.
 */
export function createApiClient(options: {
  session: SessionStore;
  baseUrl: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}) {
  const { session } = options;
  const transport: Transport = {
    baseUrl: options.baseUrl,
    fetch: options.fetch ?? ((...args) => fetch(...args)),
    timeoutMs: options.timeoutMs ?? REQUEST_TIMEOUT_MS,
  };

  return {
    async request<R, V>(document: TypedDocumentString<R, V>, variables?: V): Promise<R> {
      const token = await session.accessToken();
      let result = await postGraphQL(transport, document, variables, token);
      if (token && isUnauthenticated(result)) {
        const renewed = await session.accessToken({ force: true });
        if (!renewed) {
          session.clear();
          return unwrap(result);
        }
        result = await postGraphQL(transport, document, variables, renewed);
        if (isUnauthenticated(result)) session.clear();
      }
      return unwrap(result);
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
