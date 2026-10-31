/* eslint-disable */
import * as types from './graphql';



/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  mutation SignIn($input: SignInInput!) {\n    signIn(input: $input) {\n      accessToken\n      accessTokenExpiresAt\n      refreshToken\n      user {\n        id\n        name\n        email\n      }\n    }\n  }\n": typeof types.SignInDocument,
    "\n  mutation SignUp($input: SignUpInput!) {\n    signUp(input: $input) {\n      accessToken\n      accessTokenExpiresAt\n      refreshToken\n      user {\n        id\n        name\n        email\n      }\n    }\n  }\n": typeof types.SignUpDocument,
    "\n  query Me {\n    me {\n      id\n      name\n      email\n    }\n  }\n": typeof types.MeDocument,
    "\n  query Roles {\n    myBarberProfile {\n      id\n      name\n      avatarUrl\n      barbershop {\n        id\n        name\n        timezone\n        logoUrl\n      }\n    }\n    myBarbershop {\n      id\n      name\n      timezone\n      logoUrl\n    }\n  }\n": typeof types.RolesDocument,
    "\n  mutation RefreshToken($token: String!) {\n    refreshToken(token: $token) {\n      accessToken\n      accessTokenExpiresAt\n      refreshToken\n    }\n  }\n": typeof types.RefreshTokenDocument,
};
const documents: Documents = {
    "\n  mutation SignIn($input: SignInInput!) {\n    signIn(input: $input) {\n      accessToken\n      accessTokenExpiresAt\n      refreshToken\n      user {\n        id\n        name\n        email\n      }\n    }\n  }\n": types.SignInDocument,
    "\n  mutation SignUp($input: SignUpInput!) {\n    signUp(input: $input) {\n      accessToken\n      accessTokenExpiresAt\n      refreshToken\n      user {\n        id\n        name\n        email\n      }\n    }\n  }\n": types.SignUpDocument,
    "\n  query Me {\n    me {\n      id\n      name\n      email\n    }\n  }\n": types.MeDocument,
    "\n  query Roles {\n    myBarberProfile {\n      id\n      name\n      avatarUrl\n      barbershop {\n        id\n        name\n        timezone\n        logoUrl\n      }\n    }\n    myBarbershop {\n      id\n      name\n      timezone\n      logoUrl\n    }\n  }\n": types.RolesDocument,
    "\n  mutation RefreshToken($token: String!) {\n    refreshToken(token: $token) {\n      accessToken\n      accessTokenExpiresAt\n      refreshToken\n    }\n  }\n": types.RefreshTokenDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SignIn($input: SignInInput!) {\n    signIn(input: $input) {\n      accessToken\n      accessTokenExpiresAt\n      refreshToken\n      user {\n        id\n        name\n        email\n      }\n    }\n  }\n"): typeof import('./graphql').SignInDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SignUp($input: SignUpInput!) {\n    signUp(input: $input) {\n      accessToken\n      accessTokenExpiresAt\n      refreshToken\n      user {\n        id\n        name\n        email\n      }\n    }\n  }\n"): typeof import('./graphql').SignUpDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Me {\n    me {\n      id\n      name\n      email\n    }\n  }\n"): typeof import('./graphql').MeDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Roles {\n    myBarberProfile {\n      id\n      name\n      avatarUrl\n      barbershop {\n        id\n        name\n        timezone\n        logoUrl\n      }\n    }\n    myBarbershop {\n      id\n      name\n      timezone\n      logoUrl\n    }\n  }\n"): typeof import('./graphql').RolesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RefreshToken($token: String!) {\n    refreshToken(token: $token) {\n      accessToken\n      accessTokenExpiresAt\n      refreshToken\n    }\n  }\n"): typeof import('./graphql').RefreshTokenDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
