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
    "\n  query MyAppointments($upcoming: Boolean!) {\n    myAppointments(upcoming: $upcoming) {\n      id\n      startsAt\n      endsAt\n      status\n      serviceName\n      priceCents\n      durationMinutes\n      reminderLeadMinutes\n      cancelReason\n      canceledAt\n      barber {\n        id\n        name\n        avatarUrl\n        barbershop {\n          id\n          name\n          address\n          timezone\n          latitude\n          longitude\n        }\n      }\n    }\n  }\n": typeof types.MyAppointmentsDocument,
    "\n  mutation CancelAppointment($id: ID!) {\n    cancelAppointment(id: $id) {\n      id\n      status\n      cancelReason\n      canceledAt\n    }\n  }\n": typeof types.CancelAppointmentDocument,
    "\n  query RescheduleSlots($appointmentId: ID!, $date: String!) {\n    rescheduleSlots(appointmentId: $appointmentId, date: $date)\n  }\n": typeof types.RescheduleSlotsDocument,
    "\n  mutation RescheduleAppointment($id: ID!, $startsAt: DateTime!) {\n    rescheduleAppointment(id: $id, startsAt: $startsAt) {\n      id\n      startsAt\n    }\n  }\n": typeof types.RescheduleAppointmentDocument,
    "\n  mutation SignIn($input: SignInInput!) {\n    signIn(input: $input) {\n      accessToken\n      accessTokenExpiresAt\n      refreshToken\n      user {\n        id\n        name\n        email\n      }\n    }\n  }\n": typeof types.SignInDocument,
    "\n  mutation SignUp($input: SignUpInput!) {\n    signUp(input: $input) {\n      accessToken\n      accessTokenExpiresAt\n      refreshToken\n      user {\n        id\n        name\n        email\n      }\n    }\n  }\n": typeof types.SignUpDocument,
    "\n  query Me {\n    me {\n      id\n      name\n      email\n    }\n  }\n": typeof types.MeDocument,
    "\n  query AvailableSlots($barberId: ID!, $serviceId: ID!, $date: String!) {\n    availableSlots(barberId: $barberId, serviceId: $serviceId, date: $date)\n  }\n": typeof types.AvailableSlotsDocument,
    "\n  mutation BookAppointment($input: BookAppointmentInput!) {\n    bookAppointment(input: $input) {\n      id\n    }\n  }\n": typeof types.BookAppointmentDocument,
    "\n  query NearbyBarbershops($latitude: Float!, $longitude: Float!) {\n    barbershopsNearby(latitude: $latitude, longitude: $longitude, radiusKm: 10, limit: 30) {\n      distanceKm\n      barbershop {\n        id\n        name\n        address\n        logoUrl\n      }\n    }\n  }\n": typeof types.NearbyBarbershopsDocument,
    "\n  query SearchBarbershops($query: String!) {\n    searchBarbershops(query: $query, limit: 30) {\n      id\n      name\n      address\n      logoUrl\n    }\n  }\n": typeof types.SearchBarbershopsDocument,
    "\n  query Barbershop($id: ID!) {\n    barbershop(id: $id) {\n      id\n      name\n      description\n      yearsActive\n      logoUrl\n      address\n      latitude\n      longitude\n      timezone\n      barbers {\n        id\n        name\n        bio\n        avatarUrl\n      }\n    }\n  }\n": typeof types.BarbershopDocument,
    "\n  query Barber($id: ID!) {\n    barber(id: $id) {\n      id\n      name\n      bio\n      avatarUrl\n      barbershop {\n        id\n        name\n        address\n        timezone\n      }\n      services {\n        id\n        name\n        description\n        priceCents\n        durationMinutes\n      }\n    }\n  }\n": typeof types.BarberDocument,
    "\n  mutation RefreshToken($token: String!) {\n    refreshToken(token: $token) {\n      accessToken\n      accessTokenExpiresAt\n      refreshToken\n    }\n  }\n": typeof types.RefreshTokenDocument,
};
const documents: Documents = {
    "\n  mutation UpdateProfile($input: UpdateProfileInput!) {\n    updateProfile(input: $input) {\n      id\n      name\n      email\n    }\n  }\n": types.UpdateProfileDocument,
    "\n  query MyAppointments($upcoming: Boolean!) {\n    myAppointments(upcoming: $upcoming) {\n      id\n      startsAt\n      endsAt\n      status\n      serviceName\n      priceCents\n      durationMinutes\n      reminderLeadMinutes\n      cancelReason\n      canceledAt\n      barber {\n        id\n        name\n        avatarUrl\n        barbershop {\n          id\n          name\n          address\n          timezone\n          latitude\n          longitude\n        }\n      }\n    }\n  }\n": types.MyAppointmentsDocument,
    "\n  mutation CancelAppointment($id: ID!) {\n    cancelAppointment(id: $id) {\n      id\n      status\n      cancelReason\n      canceledAt\n    }\n  }\n": types.CancelAppointmentDocument,
    "\n  query RescheduleSlots($appointmentId: ID!, $date: String!) {\n    rescheduleSlots(appointmentId: $appointmentId, date: $date)\n  }\n": types.RescheduleSlotsDocument,
    "\n  mutation RescheduleAppointment($id: ID!, $startsAt: DateTime!) {\n    rescheduleAppointment(id: $id, startsAt: $startsAt) {\n      id\n      startsAt\n    }\n  }\n": types.RescheduleAppointmentDocument,
    "\n  mutation SignIn($input: SignInInput!) {\n    signIn(input: $input) {\n      accessToken\n      accessTokenExpiresAt\n      refreshToken\n      user {\n        id\n        name\n        email\n      }\n    }\n  }\n": types.SignInDocument,
    "\n  mutation SignUp($input: SignUpInput!) {\n    signUp(input: $input) {\n      accessToken\n      accessTokenExpiresAt\n      refreshToken\n      user {\n        id\n        name\n        email\n      }\n    }\n  }\n": types.SignUpDocument,
    "\n  query Me {\n    me {\n      id\n      name\n      email\n    }\n  }\n": types.MeDocument,
    "\n  query AvailableSlots($barberId: ID!, $serviceId: ID!, $date: String!) {\n    availableSlots(barberId: $barberId, serviceId: $serviceId, date: $date)\n  }\n": types.AvailableSlotsDocument,
    "\n  mutation BookAppointment($input: BookAppointmentInput!) {\n    bookAppointment(input: $input) {\n      id\n    }\n  }\n": types.BookAppointmentDocument,
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
export function graphql(source: "\n  query MyAppointments($upcoming: Boolean!) {\n    myAppointments(upcoming: $upcoming) {\n      id\n      startsAt\n      endsAt\n      status\n      serviceName\n      priceCents\n      durationMinutes\n      reminderLeadMinutes\n      cancelReason\n      canceledAt\n      barber {\n        id\n        name\n        avatarUrl\n        barbershop {\n          id\n          name\n          address\n          timezone\n          latitude\n          longitude\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').MyAppointmentsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CancelAppointment($id: ID!) {\n    cancelAppointment(id: $id) {\n      id\n      status\n      cancelReason\n      canceledAt\n    }\n  }\n"): typeof import('./graphql').CancelAppointmentDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query RescheduleSlots($appointmentId: ID!, $date: String!) {\n    rescheduleSlots(appointmentId: $appointmentId, date: $date)\n  }\n"): typeof import('./graphql').RescheduleSlotsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RescheduleAppointment($id: ID!, $startsAt: DateTime!) {\n    rescheduleAppointment(id: $id, startsAt: $startsAt) {\n      id\n      startsAt\n    }\n  }\n"): typeof import('./graphql').RescheduleAppointmentDocument;
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
export function graphql(source: "\n  query AvailableSlots($barberId: ID!, $serviceId: ID!, $date: String!) {\n    availableSlots(barberId: $barberId, serviceId: $serviceId, date: $date)\n  }\n"): typeof import('./graphql').AvailableSlotsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation BookAppointment($input: BookAppointmentInput!) {\n    bookAppointment(input: $input) {\n      id\n    }\n  }\n"): typeof import('./graphql').BookAppointmentDocument;
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
