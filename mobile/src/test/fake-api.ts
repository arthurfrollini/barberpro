type Variables = Record<string, unknown>;
type FakeError = { __fakeError: { code: string; message: string } };
type HandlerResult = unknown | FakeError | Response;
export type FakeHandler = (
  variables: Variables,
  request: { authorization: string | null },
) => HandlerResult | Promise<HandlerResult>;

export type FakeCall = { operation: string; variables: Variables; authorization: string | null };

/** A GraphQL error with this `extensions.code`, as the API sends it. */
export const gqlError = (code: string, message = code): FakeError => ({
  __fakeError: { code, message },
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/**
 * A `fetch` for the real API client that answers GraphQL operations by name. Tests exercise
 * the client, the hooks and the screens; only the server is fake. An operation without a
 * handler answers with the code NO_FAKE_<name> and is listed in `missing`.
 */
export function fakeApi(handlers: Record<string, FakeHandler> = {}) {
  const calls: FakeCall[] = [];
  const missing: string[] = [];
  const fetch = (async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { query: string; variables?: Variables };
    const operation = /(?:query|mutation)\s+(\w+)/.exec(body.query)?.[1] ?? 'anonymous';
    const headers = new Headers(init?.headers);
    const call = {
      operation,
      variables: body.variables ?? {},
      authorization: headers.get('authorization'),
    };
    calls.push(call);
    const handler = handlers[operation];
    if (!handler) {
      missing.push(operation);
      return json({
        errors: [{ message: 'no fake', extensions: { code: `NO_FAKE_${operation}` } }],
      });
    }
    const result = await handler(call.variables, { authorization: call.authorization });
    if (result instanceof Response) return result;
    if (result && typeof result === 'object' && '__fakeError' in result) {
      const { code, message } = (result as FakeError).__fakeError;
      return json({ errors: [{ message, extensions: { code } }], data: null });
    }
    return json({ data: result });
  }) as typeof globalThis.fetch;

  return {
    fetch,
    calls,
    missing,
    /** Adds or replaces handlers mid-test. */
    use(more: Record<string, FakeHandler>) {
      Object.assign(handlers, more);
    },
    /** The variables of every call to an operation, in order. */
    variablesOf: (operation: string) =>
      calls.filter((c) => c.operation === operation).map((c) => c.variables),
  };
}

export type FakeApi = ReturnType<typeof fakeApi>;
