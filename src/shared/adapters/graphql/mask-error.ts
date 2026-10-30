import { GraphQLError } from 'graphql';
import { DomainError } from '../../domain/domain-error.js';

/**
 * Decides what a client may see of an error:
 * - a DomainError keeps its message and exposes its code in `extensions.code`;
 * - errors GraphQL itself raises (syntax, validation) pass through;
 * - anything else is logged and replaced by a generic error, so stacks and SQL never leak.
 */
export function createMaskError(logError: (error: unknown) => void) {
  return (error: unknown): Error => {
    const original =
      error instanceof GraphQLError && error.originalError ? error.originalError : error;
    const located = error instanceof GraphQLError ? { nodes: error.nodes, path: error.path } : {};

    if (original instanceof DomainError) {
      return new GraphQLError(original.message, {
        ...located,
        extensions: { code: original.code },
      });
    }
    if (original instanceof GraphQLError) {
      return original;
    }
    logError(original);
    return new GraphQLError('Unexpected error.', { ...located, extensions: { code: 'INTERNAL' } });
  };
}
