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
    "\n  mutation UpdateProfile($input: UpdateProfileInput!) {\n    updateProfile(input: $input) {\n      id\n      name\n      email\n    }\n  }\n": typeof types.UpdateProfileDocument,
    "\n  mutation SignIn($input: SignInInput!) {\n    signIn(input: $input) {\n      accessToken\n      accessTokenExpiresAt\n      refreshToken\n      user {\n        id\n        name\n        email\n      }\n    }\n  }\n": typeof types.SignInDocument,
    "\n  mutation SignUp($input: SignUpInput!) {\n    signUp(input: $input) {\n      accessToken\n      accessTokenExpiresAt\n      refreshToken\n      user {\n        id\n        name\n        email\n      }\n    }\n  }\n": typeof types.SignUpDocument,
    "\n  query Me {\n    me {\n      id\n      name\n      email\n    }\n  }\n": typeof types.MeDocument,
    "\n  query NearbyBarbershops($latitude: Float!, $longitude: Float!) {\n    barbershopsNearby(latitude: $latitude, longitude: $longitude, radiusKm: 10, limit: 30) {\n      distanceKm\n      barbershop {\n        id\n        name\n        address\n        logoUrl\n      }\n    }\n  }\n": typeof types.NearbyBarbershopsDocument,
    "\n  query SearchBarbershops($query: String!) {\n    searchBarbershops(query: $query, limit: 30) {\n      id\n      name\n      address\n      logoUrl\n    }\n  }\n": typeof types.SearchBarbershopsDocument,
    "\n  query Barbershop($id: ID!) {\n    barbershop(id: $id) {\n      id\n      name\n      description\n      yearsActive\n      logoUrl\n      address\n      latitude\n      longitude\n      timezone\n      barbers {\n        id\n        name\n        bio\n        avatarUrl\n      }\n    }\n  }\n": typeof types.BarbershopDocument,
    "\n  query Barber($id: ID!) {\n    barber(id: $id) {\n      id\n      name\n      bio\n      avatarUrl\n      barbershop {\n        id\n        name\n        address\n        timezone\n      }\n      services {\n        id\n        name\n        description\n        priceCents\n        durationMinutes\n      }\n    }\n  }\n": typeof types.BarberDocument,
    "\n  mutation RefreshToken($token: String!) {\n    refreshToken(token: $token) {\n      accessToken\n      accessTokenExpiresAt\n      refreshToken\n    }\n  }\n": typeof types.RefreshTokenDocument,
};
const documents: Documents = {
    "\n  mutation UpdateProfile($input: UpdateProfileInput!) {\n    updateProfile(input: $input) {\n      id\n      name\n      email\n    }\n  }\n": types.UpdateProfileDocument,
    "\n  mutation SignIn($input: SignInInput!) {\n    signIn(input: $input) {\n      accessToken\n      accessTokenExpiresAt\n      refreshToken\n      user {\n        id\n        name\n        email\n      }\n    }\n  }\n": types.SignInDocument,
    "\n  mutation SignUp($input: SignUpInput!) {\n    signUp(input: $input) {\n      accessToken\n      accessTokenExpiresAt\n      refreshToken\n      user {\n        id\n        name\n        email\n      }\n    }\n  }\n": types.SignUpDocument,
    "\n  query Me {\n    me {\n      id\n      name\n      email\n    }\n  }\n": types.MeDocument,
    "\n  query NearbyBarbershops($latitude: Float!, $longitude: Float!) {\n    barbershopsNearby(latitude: $latitude, longitude: $longitude, radiusKm: 10, limit: 30) {\n      distanceKm\n      barbershop {\n        id\n        name\n        address\n        logoUrl\n      }\n    }\n  }\n": types.NearbyBarbershopsDocument,
    "\n  query SearchBarbershops($query: String!) {\n    searchBarbershops(query: $query, limit: 30) {\n      id\n      name\n      address\n      logoUrl\n    }\n  }\n": types.SearchBarbershopsDocument,
    "\n  query Barbershop($id: ID!) {\n    barbershop(id: $id) {\n      id\n      name\n      description\n      yearsActive\n      logoUrl\n      address\n      latitude\n      longitude\n      timezone\n      barbers {\n        id\n        name\n        bio\n        avatarUrl\n      }\n    }\n  }\n": types.BarbershopDocument,
    "\n  query Barber($id: ID!) {\n    barber(id: $id) {\n      id\n      name\n      bio\n      avatarUrl\n      barbershop {\n        id\n        name\n        address\n        timezone\n      }\n      services {\n        id\n        name\n        description\n        priceCents\n        durationMinutes\n      }\n    }\n  }\n": types.BarberDocument,
    "\n  mutation RefreshToken($token: String!) {\n    refreshToken(token: $token) {\n      accessToken\n      accessTokenExpiresAt\n      refreshToken\n    }\n  }\n": types.RefreshTokenDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateProfile($input: UpdateProfileInput!) {\n    updateProfile(input: $input) {\n      id\n      name\n      email\n    }\n  }\n"): typeof import('./graphql').UpdateProfileDocument;
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
export function graphql(source: "\n  query NearbyBarbershops($latitude: Float!, $longitude: Float!) {\n    barbershopsNearby(latitude: $latitude, longitude: $longitude, radiusKm: 10, limit: 30) {\n      distanceKm\n      barbershop {\n        id\n        name\n        address\n        logoUrl\n      }\n    }\n  }\n"): typeof import('./graphql').NearbyBarbershopsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SearchBarbershops($query: String!) {\n    searchBarbershops(query: $query, limit: 30) {\n      id\n      name\n      address\n      logoUrl\n    }\n  }\n"): typeof import('./graphql').SearchBarbershopsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Barbershop($id: ID!) {\n    barbershop(id: $id) {\n      id\n      name\n      description\n      yearsActive\n      logoUrl\n      address\n      latitude\n      longitude\n      timezone\n      barbers {\n        id\n        name\n        bio\n        avatarUrl\n      }\n    }\n  }\n"): typeof import('./graphql').BarbershopDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Barber($id: ID!) {\n    barber(id: $id) {\n      id\n      name\n      bio\n      avatarUrl\n      barbershop {\n        id\n        name\n        address\n        timezone\n      }\n      services {\n        id\n        name\n        description\n        priceCents\n        durationMinutes\n      }\n    }\n  }\n"): typeof import('./graphql').BarberDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RefreshToken($token: String!) {\n    refreshToken(token: $token) {\n      accessToken\n      accessTokenExpiresAt\n      refreshToken\n    }\n  }\n"): typeof import('./graphql').RefreshTokenDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
