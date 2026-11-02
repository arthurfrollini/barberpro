import type { TypedDocumentString } from '@/gql/graphql';
import { ApiError } from './errors';
import type { SessionStore } from './session';

type GraphQLResponse<R> = {
  data?: R | null;
  errors?: { message: string; extensions?: { code?: string } }[];
};

type Transport = { baseUrl: string; fetch: typeof fetch };

const networkError = () =>
  new ApiError('NETWORK_ERROR', 'Could not reach the API or it failed to answer.');

/** One POST to /graphql. Throws NETWORK_ERROR when there is no usable GraphQL answer. */
export async function postGraphQL<R, V>(
  transport: Transport,
  document: TypedDocumentString<R, V>,
  variables: V | undefined,
  token: string | null,
): Promise<GraphQLResponse<R>> {
  let response: Response;
  try {
    response = await transport.fetch(`${transport.baseUrl}/graphql`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/graphql-response+json, application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query: document.toString(), variables }),
    });
  } catch {
    throw networkError();
  }
  if (response.status >= 500) throw networkError();
  try {
    return (await response.json()) as GraphQLResponse<R>;
  } catch {
    throw networkError();
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
  try {
    response = await transport.fetch(`${transport.baseUrl}/uploads`, {
      method: 'POST',
      headers: token ? { authorization: `Bearer ${token}` } : {},
      body,
    });
  } catch {
    throw networkError();
  }
  if (response.status >= 500) throw networkError();
  const json = (await response.json().catch(() => null)) as UploadBody | null;
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
}) {
  const { session, onSessionExpired } = options;
  const transport: Transport = {
    baseUrl: options.baseUrl ?? window.location.origin,
    fetch: options.fetch ?? ((...args) => fetch(...args)),
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
