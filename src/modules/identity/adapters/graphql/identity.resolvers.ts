import { requireUser } from '../../../../shared/adapters/graphql/context.js';
import type { Resolvers } from '../../../../shared/adapters/graphql/generated/resolvers.js';
import type { GraphQLModule } from '../../../../shared/adapters/graphql/yoga.js';
import { loadSdl } from '../../../../shared/adapters/graphql/sdl.js';
import { getMe } from '../../application/get-me.js';
import type { IdentityDeps } from '../../application/ports.js';
import { refreshSession } from '../../application/refresh-session.js';
import { signIn } from '../../application/sign-in.js';
import { signUp } from '../../application/sign-up.js';
import { updateProfile } from '../../application/update-profile.js';

export function identityGraphQL(deps: IdentityDeps): GraphQLModule {
  const resolvers: Resolvers = {
    Query: {
      me: (_, __, ctx) => getMe(deps, requireUser(ctx)),
    },
    Mutation: {
      signUp: (_, { input }) => signUp(deps, input),
      signIn: (_, { input }) => signIn(deps, input),
      refreshToken: (_, { token }) => refreshSession(deps, token),
      updateProfile: (_, { input }, ctx) => updateProfile(deps, requireUser(ctx), input),
    },
    User: {
      email: (user) => user.email.value,
    },
  };
  return { typeDefs: loadSdl(import.meta.url, 'identity.graphql'), resolvers };
}
