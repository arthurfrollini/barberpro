import type { TypedDocumentString } from '@/gql/graphql';
import { ApiError } from './errors';
import type { SessionStore } from './session';

type GraphQLResponse<R> = {
  data?: R | null;
  errors?: { message: string; extensions?: { code?: string } }[];
};

/** `timeoutMs` bounds a GraphQL call, body included; an upload gets four times as long. */
type Transport = { baseUrl: string; fetch: typeof fetch; timeoutMs: number };

/** Long enough for a slow phone connection, short enough that a hung request ends. */
export const REQUEST_TIMEOUT_MS = 15_000;

const networkError = () =>
  new ApiError('NETWORK_ERROR', 'Could not reach the API or it failed to answer.');

// a timeout is told apart: a mutation that timed out may still have been applied. Checked by
// name, since the DOMException class differs between realms (jsdom, Node's fetch)
const isTimeout = (error: unknown) => error instanceof Error && error.name === 'TimeoutError';
const failure = (error: unknown) =>
  isTimeout(error) ? new ApiError('TIMEOUT', 'The API did not answer in time.') : networkError();

/** One POST to /graphql. Throws NETWORK_ERROR when there is no usable GraphQL answer. */
export async function postGraphQL<R, V>(
  transport: Transport,
  document: TypedDocumentString<R, V>,
  variables: V | undefined,
  token: string | null,
): Promise<GraphQLResponse<R>> {
  const signal = AbortSignal.timeout(transport.timeoutMs);
  let response: Response;
  try {
    response = await transport.fetch(`${transport.baseUrl}/graphql`, {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        accept: 'application/graphql-response+json, application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query: document.toString(), variables }),
    });
  } catch (error) {
    throw failure(error);
  }
  if (response.status >= 500) throw networkError();
  try {
    return (await response.json()) as GraphQLResponse<R>;
  } catch (error) {
    throw failure(error);
  }
}

type UploadBody = { id: string; url: string } | { code: string; message: string };

async function postUpload(
  transport: Transport,
  file: File,
  token: string | null,
): Promise<{ status: number; body: UploadBody }> {
  const body = new FormData();
  body.append('file', file);
  let response: Response;
  let json: UploadBody | null;
  try {
    response = await transport.fetch(`${transport.baseUrl}/uploads`, {
      method: 'POST',
      signal: AbortSignal.timeout(transport.timeoutMs * 4),
      headers: token ? { authorization: `Bearer ${token}` } : {},
      body,
    });
    if (response.status >= 500) throw networkError();
    json = (await response.json().catch((error: unknown) => {
      if (isTimeout(error)) throw error;
      return null;
    })) as UploadBody | null;
  } catch (error) {
    throw error instanceof ApiError ? error : failure(error);
  }
  if (!json) throw networkError();
  return { status: response.status, body: json };
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
  onSessionExpired?: () => void;
  baseUrl?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}) {
  const { session, onSessionExpired } = options;
  const transport: Transport = {
    baseUrl: options.baseUrl ?? window.location.origin,
    fetch: options.fetch ?? ((...args) => fetch(...args)),
    timeoutMs: options.timeoutMs ?? REQUEST_TIMEOUT_MS,
  };
  const expire = () => {
    session.clear();
    onSessionExpired?.();
  };

  return {
    async request<R, V>(document: TypedDocumentString<R, V>, variables?: V): Promise<R> {
      const token = await session.accessToken();
      let result = await postGraphQL(transport, document, variables, token);
      if (token && isUnauthenticated(result)) {
        const renewed = await session.accessToken({ force: true });
        if (!renewed) {
          expire();
          return unwrap(result);
        }
        result = await postGraphQL(transport, document, variables, renewed);
        if (isUnauthenticated(result)) expire();
      }
      return unwrap(result);
    },

    /**
     * POST /uploads: an image for a logo or avatar. Returns the id the mutations take. A 401
     * gets the same single refresh and retry as a GraphQL call.
     */
    async upload(file: File): Promise<{ id: string; url: string }> {
      const token = await session.accessToken();
      let result = await postUpload(transport, file, token);
      if (token && result.status === 401) {
        const renewed = await session.accessToken({ force: true });
        if (renewed) result = await postUpload(transport, file, renewed);
        if (!renewed || result.status === 401) expire();
      }
      if ('code' in result.body) throw new ApiError(result.body.code, result.body.message);
      return result.body;
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
