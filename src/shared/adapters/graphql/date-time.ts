import { GraphQLError, GraphQLScalarType, Kind } from 'graphql';

function parse(value: unknown): Date {
  const date = typeof value === 'string' ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    throw new GraphQLError('DateTime must be an ISO 8601 string.');
  }
  return date;
}

export const DateTimeScalar = new GraphQLScalarType<Date, string>({
  name: 'DateTime',
  serialize: (value) => (value instanceof Date ? value : parse(value)).toISOString(),
  parseValue: parse,
  parseLiteral: (ast) => parse(ast.kind === Kind.STRING ? ast.value : null),
});
