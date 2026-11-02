import { GraphQLError, GraphQLScalarType, Kind } from 'graphql';

// an instant must say which zone it is in; "2026-11-02T10:00:00" alone would be read in
// the server's zone, which is a bug waiting for the first deploy outside Brazil
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/;

function parse(value: unknown): Date {
  const date = typeof value === 'string' && ISO_INSTANT.test(value) ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    throw new GraphQLError('DateTime must be ISO 8601 with Z or an offset (2026-11-02T13:30:00Z).');
  }
  return date;
}

export const DateTimeScalar = new GraphQLScalarType<Date, string>({
  name: 'DateTime',
  serialize: (value) => (value instanceof Date ? value : parse(value)).toISOString(),
  parseValue: parse,
  parseLiteral: (ast) => parse(ast.kind === Kind.STRING ? ast.value : null),
});
