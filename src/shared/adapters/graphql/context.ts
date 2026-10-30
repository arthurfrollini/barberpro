import type { ShopsLoaders } from '../../../modules/shops/adapters/graphql/loaders.js';
import { DomainError } from '../../domain/domain-error.js';

export type GraphQLContext = {
  /** Set from a valid `Authorization: Bearer <access token>`; null for anonymous requests. */
  currentUserId: string | null;
  /** DataLoaders, created fresh for every request. */
  loaders: ShopsLoaders;
};

export function requireUser(ctx: GraphQLContext): string {
  if (!ctx.currentUserId) {
    throw new DomainError('UNAUTHENTICATED', 'Sign in to continue.');
  }
  return ctx.currentUserId;
}
