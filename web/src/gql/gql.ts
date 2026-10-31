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
    "\n  fragment AgendaAppointment on Appointment {\n    id\n    startsAt\n    endsAt\n    status\n    serviceName\n    priceCents\n    durationMinutes\n    reminderLeadMinutes\n    cancelReason\n    canceledAt\n    customer {\n      id\n      name\n    }\n  }\n": typeof types.AgendaAppointmentFragmentDoc,
    "\n  query BarberAgenda($date: String!) {\n    barberAgenda(date: $date) {\n      ...AgendaAppointment\n    }\n  }\n": typeof types.BarberAgendaDocument,
    "\n  mutation CancelAppointment($id: ID!) {\n    cancelAppointment(id: $id) {\n      ...AgendaAppointment\n    }\n  }\n": typeof types.CancelAppointmentDocument,
    "\n  mutation RescheduleAppointment($id: ID!, $startsAt: DateTime!) {\n    rescheduleAppointment(id: $id, startsAt: $startsAt) {\n      ...AgendaAppointment\n    }\n  }\n": typeof types.RescheduleAppointmentDocument,
    "\n  query RescheduleSlots($id: ID!, $date: String!) {\n    rescheduleSlots(appointmentId: $id, date: $date)\n  }\n": typeof types.RescheduleSlotsDocument,
    "\n  subscription AgendaChanged {\n    agendaChanged {\n      type\n      previousStartsAt\n      appointment {\n        ...AgendaAppointment\n      }\n    }\n  }\n": typeof types.AgendaChangedDocument,
    "\n  mutation SignIn($input: SignInInput!) {\n    signIn(input: $input) {\n      accessToken\n      accessTokenExpiresAt\n      refreshToken\n      user {\n        id\n        name\n        email\n      }\n    }\n  }\n": typeof types.SignInDocument,
    "\n  mutation SignUp($input: SignUpInput!) {\n    signUp(input: $input) {\n      accessToken\n      accessTokenExpiresAt\n      refreshToken\n      user {\n        id\n        name\n        email\n      }\n    }\n  }\n": typeof types.SignUpDocument,
    "\n  query Me {\n    me {\n      id\n      name\n      email\n    }\n  }\n": typeof types.MeDocument,
    "\n  mutation AcceptInvite($token: String!) {\n    acceptInvite(token: $token) {\n      id\n      barbershop {\n        name\n      }\n    }\n  }\n": typeof types.AcceptInviteDocument,
    "\n  query UnreadNotificationCount {\n    unreadNotificationCount\n  }\n": typeof types.UnreadNotificationCountDocument,
    "\n  query Notifications($limit: Int) {\n    notifications(limit: $limit) {\n      id\n      type\n      title\n      body\n      read\n      createdAt\n      appointmentStartsAt\n      appointment {\n        id\n        startsAt\n        serviceName\n        cancelReason\n        customer {\n          id\n          name\n        }\n        barber {\n          name\n        }\n      }\n    }\n  }\n": typeof types.NotificationsDocument,
    "\n  mutation MarkNotificationRead($id: ID!) {\n    markNotificationRead(id: $id)\n  }\n": typeof types.MarkNotificationReadDocument,
    "\n  mutation UpdateProfile($input: UpdateProfileInput!) {\n    updateProfile(input: $input) {\n      id\n      name\n      email\n    }\n  }\n": typeof types.UpdateProfileDocument,
    "\n  mutation UpdateBarberProfile($input: UpdateBarberProfileInput!) {\n    updateBarberProfile(input: $input) {\n      id\n      bio\n      avatarUrl\n    }\n  }\n": typeof types.UpdateBarberProfileDocument,
    "\n  query Roles {\n    myBarberProfile {\n      id\n      name\n      bio\n      avatarUrl\n      barbershop {\n        id\n        name\n        timezone\n        logoUrl\n      }\n    }\n    myBarbershop {\n      id\n      name\n      timezone\n      logoUrl\n    }\n  }\n": typeof types.RolesDocument,
    "\n  query MySchedule {\n    mySchedule {\n      weekly {\n        weekday\n        startTime\n        endTime\n      }\n      blockedDates\n    }\n  }\n": typeof types.MyScheduleDocument,
    "\n  mutation SetWeeklySchedule($intervals: [WeeklyIntervalInput!]!) {\n    setWeeklySchedule(intervals: $intervals) {\n      weekly {\n        weekday\n        startTime\n        endTime\n      }\n      canceledAppointments {\n        ...AgendaAppointment\n      }\n    }\n  }\n": typeof types.SetWeeklyScheduleDocument,
    "\n  mutation BlockDate($date: String!) {\n    blockDate(date: $date) {\n      ...AgendaAppointment\n    }\n  }\n": typeof types.BlockDateDocument,
    "\n  mutation UnblockDate($date: String!) {\n    unblockDate(date: $date)\n  }\n": typeof types.UnblockDateDocument,
    "\n  fragment ServiceFields on Service {\n    id\n    name\n    description\n    priceCents\n    durationMinutes\n    archived\n  }\n": typeof types.ServiceFieldsFragmentDoc,
    "\n  query MyServices {\n    myBarberProfile {\n      id\n      services {\n        ...ServiceFields\n      }\n    }\n  }\n": typeof types.MyServicesDocument,
    "\n  mutation CreateService($input: CreateServiceInput!) {\n    createService(input: $input) {\n      ...ServiceFields\n    }\n  }\n": typeof types.CreateServiceDocument,
    "\n  mutation UpdateService($id: ID!, $input: UpdateServiceInput!) {\n    updateService(id: $id, input: $input) {\n      ...ServiceFields\n    }\n  }\n": typeof types.UpdateServiceDocument,
    "\n  mutation ArchiveService($id: ID!) {\n    archiveService(id: $id) {\n      ...ServiceFields\n    }\n  }\n": typeof types.ArchiveServiceDocument,
    "\n  fragment ShopFields on Barbershop {\n    id\n    name\n    description\n    foundedYear\n    logoUrl\n    address\n    latitude\n    longitude\n    timezone\n  }\n": typeof types.ShopFieldsFragmentDoc,
    "\n  query MyShop {\n    myBarbershop {\n      ...ShopFields\n      barbers {\n        id\n        name\n        avatarUrl\n      }\n      invites {\n        id\n        email\n        status\n        expiresAt\n        createdAt\n      }\n    }\n  }\n": typeof types.MyShopDocument,
    "\n  mutation CreateBarbershop($input: CreateBarbershopInput!) {\n    createBarbershop(input: $input) {\n      ...ShopFields\n    }\n  }\n": typeof types.CreateBarbershopDocument,
    "\n  mutation UpdateBarbershop($input: UpdateBarbershopInput!) {\n    updateBarbershop(input: $input) {\n      ...ShopFields\n    }\n  }\n": typeof types.UpdateBarbershopDocument,
    "\n  mutation BecomeBarber {\n    becomeBarber {\n      id\n    }\n  }\n": typeof types.BecomeBarberDocument,
    "\n  mutation RefreshToken($token: String!) {\n    refreshToken(token: $token) {\n      accessToken\n      accessTokenExpiresAt\n      refreshToken\n    }\n  }\n": typeof types.RefreshTokenDocument,
};
const documents: Documents = {
    "\n  fragment AgendaAppointment on Appointment {\n    id\n    startsAt\n    endsAt\n    status\n    serviceName\n    priceCents\n    durationMinutes\n    reminderLeadMinutes\n    cancelReason\n    canceledAt\n    customer {\n      id\n      name\n    }\n  }\n": types.AgendaAppointmentFragmentDoc,
    "\n  query BarberAgenda($date: String!) {\n    barberAgenda(date: $date) {\n      ...AgendaAppointment\n    }\n  }\n": types.BarberAgendaDocument,
    "\n  mutation CancelAppointment($id: ID!) {\n    cancelAppointment(id: $id) {\n      ...AgendaAppointment\n    }\n  }\n": types.CancelAppointmentDocument,
    "\n  mutation RescheduleAppointment($id: ID!, $startsAt: DateTime!) {\n    rescheduleAppointment(id: $id, startsAt: $startsAt) {\n      ...AgendaAppointment\n    }\n  }\n": types.RescheduleAppointmentDocument,
    "\n  query RescheduleSlots($id: ID!, $date: String!) {\n    rescheduleSlots(appointmentId: $id, date: $date)\n  }\n": types.RescheduleSlotsDocument,
    "\n  subscription AgendaChanged {\n    agendaChanged {\n      type\n      previousStartsAt\n      appointment {\n        ...AgendaAppointment\n      }\n    }\n  }\n": types.AgendaChangedDocument,
    "\n  mutation SignIn($input: SignInInput!) {\n    signIn(input: $input) {\n      accessToken\n      accessTokenExpiresAt\n      refreshToken\n      user {\n        id\n        name\n        email\n      }\n    }\n  }\n": types.SignInDocument,
    "\n  mutation SignUp($input: SignUpInput!) {\n    signUp(input: $input) {\n      accessToken\n      accessTokenExpiresAt\n      refreshToken\n      user {\n        id\n        name\n        email\n      }\n    }\n  }\n": types.SignUpDocument,
    "\n  query Me {\n    me {\n      id\n      name\n      email\n    }\n  }\n": types.MeDocument,
    "\n  mutation AcceptInvite($token: String!) {\n    acceptInvite(token: $token) {\n      id\n      barbershop {\n        name\n      }\n    }\n  }\n": types.AcceptInviteDocument,
    "\n  query UnreadNotificationCount {\n    unreadNotificationCount\n  }\n": types.UnreadNotificationCountDocument,
    "\n  query Notifications($limit: Int) {\n    notifications(limit: $limit) {\n      id\n      type\n      title\n      body\n      read\n      createdAt\n      appointmentStartsAt\n      appointment {\n        id\n        startsAt\n        serviceName\n        cancelReason\n        customer {\n          id\n          name\n        }\n        barber {\n          name\n        }\n      }\n    }\n  }\n": types.NotificationsDocument,
    "\n  mutation MarkNotificationRead($id: ID!) {\n    markNotificationRead(id: $id)\n  }\n": types.MarkNotificationReadDocument,
    "\n  mutation UpdateProfile($input: UpdateProfileInput!) {\n    updateProfile(input: $input) {\n      id\n      name\n      email\n    }\n  }\n": types.UpdateProfileDocument,
    "\n  mutation UpdateBarberProfile($input: UpdateBarberProfileInput!) {\n    updateBarberProfile(input: $input) {\n      id\n      bio\n      avatarUrl\n    }\n  }\n": types.UpdateBarberProfileDocument,
    "\n  query Roles {\n    myBarberProfile {\n      id\n      name\n      bio\n      avatarUrl\n      barbershop {\n        id\n        name\n        timezone\n        logoUrl\n      }\n    }\n    myBarbershop {\n      id\n      name\n      timezone\n      logoUrl\n    }\n  }\n": types.RolesDocument,
    "\n  query MySchedule {\n    mySchedule {\n      weekly {\n        weekday\n        startTime\n        endTime\n      }\n      blockedDates\n    }\n  }\n": types.MyScheduleDocument,
    "\n  mutation SetWeeklySchedule($intervals: [WeeklyIntervalInput!]!) {\n    setWeeklySchedule(intervals: $intervals) {\n      weekly {\n        weekday\n        startTime\n        endTime\n      }\n      canceledAppointments {\n        ...AgendaAppointment\n      }\n    }\n  }\n": types.SetWeeklyScheduleDocument,
    "\n  mutation BlockDate($date: String!) {\n    blockDate(date: $date) {\n      ...AgendaAppointment\n    }\n  }\n": types.BlockDateDocument,
    "\n  mutation UnblockDate($date: String!) {\n    unblockDate(date: $date)\n  }\n": types.UnblockDateDocument,
    "\n  fragment ServiceFields on Service {\n    id\n    name\n    description\n    priceCents\n    durationMinutes\n    archived\n  }\n": types.ServiceFieldsFragmentDoc,
    "\n  query MyServices {\n    myBarberProfile {\n      id\n      services {\n        ...ServiceFields\n      }\n    }\n  }\n": types.MyServicesDocument,
    "\n  mutation CreateService($input: CreateServiceInput!) {\n    createService(input: $input) {\n      ...ServiceFields\n    }\n  }\n": types.CreateServiceDocument,
    "\n  mutation UpdateService($id: ID!, $input: UpdateServiceInput!) {\n    updateService(id: $id, input: $input) {\n      ...ServiceFields\n    }\n  }\n": types.UpdateServiceDocument,
    "\n  mutation ArchiveService($id: ID!) {\n    archiveService(id: $id) {\n      ...ServiceFields\n    }\n  }\n": types.ArchiveServiceDocument,
    "\n  fragment ShopFields on Barbershop {\n    id\n    name\n    description\n    foundedYear\n    logoUrl\n    address\n    latitude\n    longitude\n    timezone\n  }\n": types.ShopFieldsFragmentDoc,
    "\n  query MyShop {\n    myBarbershop {\n      ...ShopFields\n      barbers {\n        id\n        name\n        avatarUrl\n      }\n      invites {\n        id\n        email\n        status\n        expiresAt\n        createdAt\n      }\n    }\n  }\n": types.MyShopDocument,
    "\n  mutation CreateBarbershop($input: CreateBarbershopInput!) {\n    createBarbershop(input: $input) {\n      ...ShopFields\n    }\n  }\n": types.CreateBarbershopDocument,
    "\n  mutation UpdateBarbershop($input: UpdateBarbershopInput!) {\n    updateBarbershop(input: $input) {\n      ...ShopFields\n    }\n  }\n": types.UpdateBarbershopDocument,
    "\n  mutation BecomeBarber {\n    becomeBarber {\n      id\n    }\n  }\n": types.BecomeBarberDocument,
    "\n  mutation RefreshToken($token: String!) {\n    refreshToken(token: $token) {\n      accessToken\n      accessTokenExpiresAt\n      refreshToken\n    }\n  }\n": types.RefreshTokenDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment AgendaAppointment on Appointment {\n    id\n    startsAt\n    endsAt\n    status\n    serviceName\n    priceCents\n    durationMinutes\n    reminderLeadMinutes\n    cancelReason\n    canceledAt\n    customer {\n      id\n      name\n    }\n  }\n"): typeof import('./graphql').AgendaAppointmentFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query BarberAgenda($date: String!) {\n    barberAgenda(date: $date) {\n      ...AgendaAppointment\n    }\n  }\n"): typeof import('./graphql').BarberAgendaDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CancelAppointment($id: ID!) {\n    cancelAppointment(id: $id) {\n      ...AgendaAppointment\n    }\n  }\n"): typeof import('./graphql').CancelAppointmentDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RescheduleAppointment($id: ID!, $startsAt: DateTime!) {\n    rescheduleAppointment(id: $id, startsAt: $startsAt) {\n      ...AgendaAppointment\n    }\n  }\n"): typeof import('./graphql').RescheduleAppointmentDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query RescheduleSlots($id: ID!, $date: String!) {\n    rescheduleSlots(appointmentId: $id, date: $date)\n  }\n"): typeof import('./graphql').RescheduleSlotsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  subscription AgendaChanged {\n    agendaChanged {\n      type\n      previousStartsAt\n      appointment {\n        ...AgendaAppointment\n      }\n    }\n  }\n"): typeof import('./graphql').AgendaChangedDocument;
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
export function graphql(source: "\n  mutation AcceptInvite($token: String!) {\n    acceptInvite(token: $token) {\n      id\n      barbershop {\n        name\n      }\n    }\n  }\n"): typeof import('./graphql').AcceptInviteDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query UnreadNotificationCount {\n    unreadNotificationCount\n  }\n"): typeof import('./graphql').UnreadNotificationCountDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Notifications($limit: Int) {\n    notifications(limit: $limit) {\n      id\n      type\n      title\n      body\n      read\n      createdAt\n      appointmentStartsAt\n      appointment {\n        id\n        startsAt\n        serviceName\n        cancelReason\n        customer {\n          id\n          name\n        }\n        barber {\n          name\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').NotificationsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation MarkNotificationRead($id: ID!) {\n    markNotificationRead(id: $id)\n  }\n"): typeof import('./graphql').MarkNotificationReadDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateProfile($input: UpdateProfileInput!) {\n    updateProfile(input: $input) {\n      id\n      name\n      email\n    }\n  }\n"): typeof import('./graphql').UpdateProfileDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateBarberProfile($input: UpdateBarberProfileInput!) {\n    updateBarberProfile(input: $input) {\n      id\n      bio\n      avatarUrl\n    }\n  }\n"): typeof import('./graphql').UpdateBarberProfileDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Roles {\n    myBarberProfile {\n      id\n      name\n      bio\n      avatarUrl\n      barbershop {\n        id\n        name\n        timezone\n        logoUrl\n      }\n    }\n    myBarbershop {\n      id\n      name\n      timezone\n      logoUrl\n    }\n  }\n"): typeof import('./graphql').RolesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query MySchedule {\n    mySchedule {\n      weekly {\n        weekday\n        startTime\n        endTime\n      }\n      blockedDates\n    }\n  }\n"): typeof import('./graphql').MyScheduleDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetWeeklySchedule($intervals: [WeeklyIntervalInput!]!) {\n    setWeeklySchedule(intervals: $intervals) {\n      weekly {\n        weekday\n        startTime\n        endTime\n      }\n      canceledAppointments {\n        ...AgendaAppointment\n      }\n    }\n  }\n"): typeof import('./graphql').SetWeeklyScheduleDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation BlockDate($date: String!) {\n    blockDate(date: $date) {\n      ...AgendaAppointment\n    }\n  }\n"): typeof import('./graphql').BlockDateDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UnblockDate($date: String!) {\n    unblockDate(date: $date)\n  }\n"): typeof import('./graphql').UnblockDateDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ServiceFields on Service {\n    id\n    name\n    description\n    priceCents\n    durationMinutes\n    archived\n  }\n"): typeof import('./graphql').ServiceFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query MyServices {\n    myBarberProfile {\n      id\n      services {\n        ...ServiceFields\n      }\n    }\n  }\n"): typeof import('./graphql').MyServicesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateService($input: CreateServiceInput!) {\n    createService(input: $input) {\n      ...ServiceFields\n    }\n  }\n"): typeof import('./graphql').CreateServiceDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateService($id: ID!, $input: UpdateServiceInput!) {\n    updateService(id: $id, input: $input) {\n      ...ServiceFields\n    }\n  }\n"): typeof import('./graphql').UpdateServiceDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ArchiveService($id: ID!) {\n    archiveService(id: $id) {\n      ...ServiceFields\n    }\n  }\n"): typeof import('./graphql').ArchiveServiceDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ShopFields on Barbershop {\n    id\n    name\n    description\n    foundedYear\n    logoUrl\n    address\n    latitude\n    longitude\n    timezone\n  }\n"): typeof import('./graphql').ShopFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query MyShop {\n    myBarbershop {\n      ...ShopFields\n      barbers {\n        id\n        name\n        avatarUrl\n      }\n      invites {\n        id\n        email\n        status\n        expiresAt\n        createdAt\n      }\n    }\n  }\n"): typeof import('./graphql').MyShopDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateBarbershop($input: CreateBarbershopInput!) {\n    createBarbershop(input: $input) {\n      ...ShopFields\n    }\n  }\n"): typeof import('./graphql').CreateBarbershopDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateBarbershop($input: UpdateBarbershopInput!) {\n    updateBarbershop(input: $input) {\n      ...ShopFields\n    }\n  }\n"): typeof import('./graphql').UpdateBarbershopDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation BecomeBarber {\n    becomeBarber {\n      id\n    }\n  }\n"): typeof import('./graphql').BecomeBarberDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RefreshToken($token: String!) {\n    refreshToken(token: $token) {\n      accessToken\n      accessTokenExpiresAt\n      refreshToken\n    }\n  }\n"): typeof import('./graphql').RefreshTokenDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
