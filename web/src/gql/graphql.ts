/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type AgendaChangeType =
  | 'BOOKED'
  | 'CANCELED'
  | 'RESCHEDULED';

export type AppointmentStatus =
  | 'BOOKED'
  | 'CANCELED';

export type CancelReason =
  | 'BARBER'
  | 'BARBER_REMOVED'
  | 'CUSTOMER'
  | 'DAY_BLOCKED'
  | 'SCHEDULE_CHANGED';

export type CreateBarbershopInput = {
  address: string;
  description?: string | null | undefined;
  foundedYear: number;
  latitude: number;
  /** Id returned by POST /uploads. */
  logoFileId?: string | number | null | undefined;
  longitude: number;
  name: string;
  timezone?: string | null | undefined;
};

export type CreateServiceInput = {
  description?: string | null | undefined;
  /** 5 to 480, in steps of 5. */
  durationMinutes: number;
  name: string;
  priceCents: number;
};

export type InviteStatus =
  | 'ACCEPTED'
  | 'EXPIRED'
  | 'PENDING'
  | 'REVOKED';

export type NotificationType =
  | 'APPOINTMENT_BOOKED'
  | 'APPOINTMENT_CANCELED'
  | 'APPOINTMENT_REMINDER'
  | 'APPOINTMENT_RESCHEDULED';

export type SignInInput = {
  email: string;
  password: string;
};

export type SignUpInput = {
  email: string;
  name: string;
  /** 8 to 128 characters. */
  password: string;
};

export type UpdateBarberProfileInput = {
  /** Id returned by POST /uploads; null removes the photo. */
  avatarFileId?: string | number | null | undefined;
  bio?: string | null | undefined;
};

export type UpdateBarbershopInput = {
  address?: string | null | undefined;
  description?: string | null | undefined;
  foundedYear?: number | null | undefined;
  latitude?: number | null | undefined;
  /** null removes the logo. */
  logoFileId?: string | number | null | undefined;
  longitude?: number | null | undefined;
  name?: string | null | undefined;
  timezone?: string | null | undefined;
};

export type UpdateProfileInput = {
  name: string;
};

export type UpdateServiceInput = {
  description?: string | null | undefined;
  durationMinutes?: number | null | undefined;
  name?: string | null | undefined;
  priceCents?: number | null | undefined;
};

export type WeeklyIntervalInput = {
  /** HH:MM, up to 24:00. */
  endTime: string;
  /** HH:MM, in steps of 5 minutes. */
  startTime: string;
  weekday: number;
};

export type AgendaAppointmentFragment = { id: string, startsAt: string, endsAt: string, status: AppointmentStatus, serviceName: string, priceCents: number, durationMinutes: number, reminderLeadMinutes: number | null, cancelReason: CancelReason | null, canceledAt: string | null, customer: { id: string, name: string } };

export type BarberAgendaQueryVariables = Exact<{
  date: string;
}>;


export type BarberAgendaQuery = { barberAgenda: Array<{ id: string, startsAt: string, endsAt: string, status: AppointmentStatus, serviceName: string, priceCents: number, durationMinutes: number, reminderLeadMinutes: number | null, cancelReason: CancelReason | null, canceledAt: string | null, customer: { id: string, name: string } }> };

export type CancelAppointmentMutationVariables = Exact<{
  id: string | number;
}>;


export type CancelAppointmentMutation = { cancelAppointment: { id: string, startsAt: string, endsAt: string, status: AppointmentStatus, serviceName: string, priceCents: number, durationMinutes: number, reminderLeadMinutes: number | null, cancelReason: CancelReason | null, canceledAt: string | null, customer: { id: string, name: string } } };

export type RescheduleAppointmentMutationVariables = Exact<{
  id: string | number;
  startsAt: string;
}>;


export type RescheduleAppointmentMutation = { rescheduleAppointment: { id: string, startsAt: string, endsAt: string, status: AppointmentStatus, serviceName: string, priceCents: number, durationMinutes: number, reminderLeadMinutes: number | null, cancelReason: CancelReason | null, canceledAt: string | null, customer: { id: string, name: string } } };

export type RescheduleSlotsQueryVariables = Exact<{
  id: string | number;
  date: string;
}>;


export type RescheduleSlotsQuery = { rescheduleSlots: Array<string> };

export type AgendaChangedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type AgendaChangedSubscription = { agendaChanged: { type: AgendaChangeType, previousStartsAt: string | null, appointment: { id: string, startsAt: string, endsAt: string, status: AppointmentStatus, serviceName: string, priceCents: number, durationMinutes: number, reminderLeadMinutes: number | null, cancelReason: CancelReason | null, canceledAt: string | null, customer: { id: string, name: string } } } };

export type SignInMutationVariables = Exact<{
  input: SignInInput;
}>;


export type SignInMutation = { signIn: { accessToken: string, accessTokenExpiresAt: string, refreshToken: string, user: { id: string, name: string, email: string } } };

export type SignUpMutationVariables = Exact<{
  input: SignUpInput;
}>;


export type SignUpMutation = { signUp: { accessToken: string, accessTokenExpiresAt: string, refreshToken: string, user: { id: string, name: string, email: string } } };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { me: { id: string, name: string, email: string } };

export type UnreadNotificationCountQueryVariables = Exact<{ [key: string]: never; }>;


export type UnreadNotificationCountQuery = { unreadNotificationCount: number };

export type NotificationsQueryVariables = Exact<{
  limit?: number | null | undefined;
}>;


export type NotificationsQuery = { notifications: Array<{ id: string, type: NotificationType, title: string, body: string, read: boolean, createdAt: string, appointmentStartsAt: string | null, appointment: { id: string, startsAt: string, serviceName: string, cancelReason: CancelReason | null, customer: { id: string, name: string }, barber: { name: string } } | null }> };

export type MarkNotificationReadMutationVariables = Exact<{
  id: string | number;
}>;


export type MarkNotificationReadMutation = { markNotificationRead: boolean };

export type UpdateProfileMutationVariables = Exact<{
  input: UpdateProfileInput;
}>;


export type UpdateProfileMutation = { updateProfile: { id: string, name: string, email: string } };

export type UpdateBarberProfileMutationVariables = Exact<{
  input: UpdateBarberProfileInput;
}>;


export type UpdateBarberProfileMutation = { updateBarberProfile: { id: string, bio: string, avatarUrl: string | null } };

export type RolesQueryVariables = Exact<{ [key: string]: never; }>;


export type RolesQuery = { myBarberProfile: { id: string, name: string, bio: string, avatarUrl: string | null, barbershop: { id: string, name: string, timezone: string, logoUrl: string | null } } | null, myBarbershop: { id: string, name: string, timezone: string, logoUrl: string | null } | null };

export type MyScheduleQueryVariables = Exact<{ [key: string]: never; }>;


export type MyScheduleQuery = { mySchedule: { blockedDates: Array<string>, weekly: Array<{ weekday: number, startTime: string, endTime: string }> } };

export type SetWeeklyScheduleMutationVariables = Exact<{
  intervals: Array<WeeklyIntervalInput> | WeeklyIntervalInput;
}>;


export type SetWeeklyScheduleMutation = { setWeeklySchedule: { weekly: Array<{ weekday: number, startTime: string, endTime: string }>, canceledAppointments: Array<{ id: string, startsAt: string, endsAt: string, status: AppointmentStatus, serviceName: string, priceCents: number, durationMinutes: number, reminderLeadMinutes: number | null, cancelReason: CancelReason | null, canceledAt: string | null, customer: { id: string, name: string } }> } };

export type BlockDateMutationVariables = Exact<{
  date: string;
}>;


export type BlockDateMutation = { blockDate: Array<{ id: string, startsAt: string, endsAt: string, status: AppointmentStatus, serviceName: string, priceCents: number, durationMinutes: number, reminderLeadMinutes: number | null, cancelReason: CancelReason | null, canceledAt: string | null, customer: { id: string, name: string } }> };

export type UnblockDateMutationVariables = Exact<{
  date: string;
}>;


export type UnblockDateMutation = { unblockDate: boolean };

export type ServiceFieldsFragment = { id: string, name: string, description: string, priceCents: number, durationMinutes: number, archived: boolean };

export type MyServicesQueryVariables = Exact<{ [key: string]: never; }>;


export type MyServicesQuery = { myBarberProfile: { id: string, services: Array<{ id: string, name: string, description: string, priceCents: number, durationMinutes: number, archived: boolean }> } | null };

export type CreateServiceMutationVariables = Exact<{
  input: CreateServiceInput;
}>;


export type CreateServiceMutation = { createService: { id: string, name: string, description: string, priceCents: number, durationMinutes: number, archived: boolean } };

export type UpdateServiceMutationVariables = Exact<{
  id: string | number;
  input: UpdateServiceInput;
}>;


export type UpdateServiceMutation = { updateService: { id: string, name: string, description: string, priceCents: number, durationMinutes: number, archived: boolean } };

export type ArchiveServiceMutationVariables = Exact<{
  id: string | number;
}>;


export type ArchiveServiceMutation = { archiveService: { id: string, name: string, description: string, priceCents: number, durationMinutes: number, archived: boolean } };

export type ShopFieldsFragment = { id: string, name: string, description: string, foundedYear: number, logoUrl: string | null, address: string, latitude: number, longitude: number, timezone: string };

export type MyShopQueryVariables = Exact<{ [key: string]: never; }>;


export type MyShopQuery = { myBarbershop: { id: string, name: string, description: string, foundedYear: number, logoUrl: string | null, address: string, latitude: number, longitude: number, timezone: string, barbers: Array<{ id: string, name: string, avatarUrl: string | null }>, invites: Array<{ id: string, email: string, status: InviteStatus, expiresAt: string, createdAt: string }> } | null };

export type CreateBarbershopMutationVariables = Exact<{
  input: CreateBarbershopInput;
}>;


export type CreateBarbershopMutation = { createBarbershop: { id: string, name: string, description: string, foundedYear: number, logoUrl: string | null, address: string, latitude: number, longitude: number, timezone: string } };

export type UpdateBarbershopMutationVariables = Exact<{
  input: UpdateBarbershopInput;
}>;


export type UpdateBarbershopMutation = { updateBarbershop: { id: string, name: string, description: string, foundedYear: number, logoUrl: string | null, address: string, latitude: number, longitude: number, timezone: string } };

export type BecomeBarberMutationVariables = Exact<{ [key: string]: never; }>;


export type BecomeBarberMutation = { becomeBarber: { id: string } };

export type RefreshTokenMutationVariables = Exact<{
  token: string;
}>;


export type RefreshTokenMutation = { refreshToken: { accessToken: string, accessTokenExpiresAt: string, refreshToken: string } };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}
export const AgendaAppointmentFragmentDoc = new TypedDocumentString(`
    fragment AgendaAppointment on Appointment {
  id
  startsAt
  endsAt
  status
  serviceName
  priceCents
  durationMinutes
  reminderLeadMinutes
  cancelReason
  canceledAt
  customer {
    id
    name
  }
}
    `, {"fragmentName":"AgendaAppointment"}) as unknown as TypedDocumentString<AgendaAppointmentFragment, unknown>;
export const ServiceFieldsFragmentDoc = new TypedDocumentString(`
    fragment ServiceFields on Service {
  id
  name
  description
  priceCents
  durationMinutes
  archived
}
    `, {"fragmentName":"ServiceFields"}) as unknown as TypedDocumentString<ServiceFieldsFragment, unknown>;
export const ShopFieldsFragmentDoc = new TypedDocumentString(`
    fragment ShopFields on Barbershop {
  id
  name
  description
  foundedYear
  logoUrl
  address
  latitude
  longitude
  timezone
}
    `, {"fragmentName":"ShopFields"}) as unknown as TypedDocumentString<ShopFieldsFragment, unknown>;
export const BarberAgendaDocument = new TypedDocumentString(`
    query BarberAgenda($date: String!) {
  barberAgenda(date: $date) {
    ...AgendaAppointment
  }
}
    fragment AgendaAppointment on Appointment {
  id
  startsAt
  endsAt
  status
  serviceName
  priceCents
  durationMinutes
  reminderLeadMinutes
  cancelReason
  canceledAt
  customer {
    id
    name
  }
}`) as unknown as TypedDocumentString<BarberAgendaQuery, BarberAgendaQueryVariables>;
export const CancelAppointmentDocument = new TypedDocumentString(`
    mutation CancelAppointment($id: ID!) {
  cancelAppointment(id: $id) {
    ...AgendaAppointment
  }
}
    fragment AgendaAppointment on Appointment {
  id
  startsAt
  endsAt
  status
  serviceName
  priceCents
  durationMinutes
  reminderLeadMinutes
  cancelReason
  canceledAt
  customer {
    id
    name
  }
}`) as unknown as TypedDocumentString<CancelAppointmentMutation, CancelAppointmentMutationVariables>;
export const RescheduleAppointmentDocument = new TypedDocumentString(`
    mutation RescheduleAppointment($id: ID!, $startsAt: DateTime!) {
  rescheduleAppointment(id: $id, startsAt: $startsAt) {
    ...AgendaAppointment
  }
}
    fragment AgendaAppointment on Appointment {
  id
  startsAt
  endsAt
  status
  serviceName
  priceCents
  durationMinutes
  reminderLeadMinutes
  cancelReason
  canceledAt
  customer {
    id
    name
  }
}`) as unknown as TypedDocumentString<RescheduleAppointmentMutation, RescheduleAppointmentMutationVariables>;
export const RescheduleSlotsDocument = new TypedDocumentString(`
    query RescheduleSlots($id: ID!, $date: String!) {
  rescheduleSlots(appointmentId: $id, date: $date)
}
    `) as unknown as TypedDocumentString<RescheduleSlotsQuery, RescheduleSlotsQueryVariables>;
export const AgendaChangedDocument = new TypedDocumentString(`
    subscription AgendaChanged {
  agendaChanged {
    type
    previousStartsAt
    appointment {
      ...AgendaAppointment
    }
  }
}
    fragment AgendaAppointment on Appointment {
  id
  startsAt
  endsAt
  status
  serviceName
  priceCents
  durationMinutes
  reminderLeadMinutes
  cancelReason
  canceledAt
  customer {
    id
    name
  }
}`) as unknown as TypedDocumentString<AgendaChangedSubscription, AgendaChangedSubscriptionVariables>;
export const SignInDocument = new TypedDocumentString(`
    mutation SignIn($input: SignInInput!) {
  signIn(input: $input) {
    accessToken
    accessTokenExpiresAt
    refreshToken
    user {
      id
      name
      email
    }
  }
}
    `) as unknown as TypedDocumentString<SignInMutation, SignInMutationVariables>;
export const SignUpDocument = new TypedDocumentString(`
    mutation SignUp($input: SignUpInput!) {
  signUp(input: $input) {
    accessToken
    accessTokenExpiresAt
    refreshToken
    user {
      id
      name
      email
    }
  }
}
    `) as unknown as TypedDocumentString<SignUpMutation, SignUpMutationVariables>;
export const MeDocument = new TypedDocumentString(`
    query Me {
  me {
    id
    name
    email
  }
}
    `) as unknown as TypedDocumentString<MeQuery, MeQueryVariables>;
export const UnreadNotificationCountDocument = new TypedDocumentString(`
    query UnreadNotificationCount {
  unreadNotificationCount
}
    `) as unknown as TypedDocumentString<UnreadNotificationCountQuery, UnreadNotificationCountQueryVariables>;
export const NotificationsDocument = new TypedDocumentString(`
    query Notifications($limit: Int) {
  notifications(limit: $limit) {
    id
    type
    title
    body
    read
    createdAt
    appointmentStartsAt
    appointment {
      id
      startsAt
      serviceName
      cancelReason
      customer {
        id
        name
      }
      barber {
        name
      }
    }
  }
}
    `) as unknown as TypedDocumentString<NotificationsQuery, NotificationsQueryVariables>;
export const MarkNotificationReadDocument = new TypedDocumentString(`
    mutation MarkNotificationRead($id: ID!) {
  markNotificationRead(id: $id)
}
    `) as unknown as TypedDocumentString<MarkNotificationReadMutation, MarkNotificationReadMutationVariables>;
export const UpdateProfileDocument = new TypedDocumentString(`
    mutation UpdateProfile($input: UpdateProfileInput!) {
  updateProfile(input: $input) {
    id
    name
    email
  }
}
    `) as unknown as TypedDocumentString<UpdateProfileMutation, UpdateProfileMutationVariables>;
export const UpdateBarberProfileDocument = new TypedDocumentString(`
    mutation UpdateBarberProfile($input: UpdateBarberProfileInput!) {
  updateBarberProfile(input: $input) {
    id
    bio
    avatarUrl
  }
}
    `) as unknown as TypedDocumentString<UpdateBarberProfileMutation, UpdateBarberProfileMutationVariables>;
export const RolesDocument = new TypedDocumentString(`
    query Roles {
  myBarberProfile {
    id
    name
    bio
    avatarUrl
    barbershop {
      id
      name
      timezone
      logoUrl
    }
  }
  myBarbershop {
    id
    name
    timezone
    logoUrl
  }
}
    `) as unknown as TypedDocumentString<RolesQuery, RolesQueryVariables>;
export const MyScheduleDocument = new TypedDocumentString(`
    query MySchedule {
  mySchedule {
    weekly {
      weekday
      startTime
      endTime
    }
    blockedDates
  }
}
    `) as unknown as TypedDocumentString<MyScheduleQuery, MyScheduleQueryVariables>;
export const SetWeeklyScheduleDocument = new TypedDocumentString(`
    mutation SetWeeklySchedule($intervals: [WeeklyIntervalInput!]!) {
  setWeeklySchedule(intervals: $intervals) {
    weekly {
      weekday
      startTime
      endTime
    }
    canceledAppointments {
      ...AgendaAppointment
    }
  }
}
    fragment AgendaAppointment on Appointment {
  id
  startsAt
  endsAt
  status
  serviceName
  priceCents
  durationMinutes
  reminderLeadMinutes
  cancelReason
  canceledAt
  customer {
    id
    name
  }
}`) as unknown as TypedDocumentString<SetWeeklyScheduleMutation, SetWeeklyScheduleMutationVariables>;
export const BlockDateDocument = new TypedDocumentString(`
    mutation BlockDate($date: String!) {
  blockDate(date: $date) {
    ...AgendaAppointment
  }
}
    fragment AgendaAppointment on Appointment {
  id
  startsAt
  endsAt
  status
  serviceName
  priceCents
  durationMinutes
  reminderLeadMinutes
  cancelReason
  canceledAt
  customer {
    id
    name
  }
}`) as unknown as TypedDocumentString<BlockDateMutation, BlockDateMutationVariables>;
export const UnblockDateDocument = new TypedDocumentString(`
    mutation UnblockDate($date: String!) {
  unblockDate(date: $date)
}
    `) as unknown as TypedDocumentString<UnblockDateMutation, UnblockDateMutationVariables>;
export const MyServicesDocument = new TypedDocumentString(`
    query MyServices {
  myBarberProfile {
    id
    services {
      ...ServiceFields
    }
  }
}
    fragment ServiceFields on Service {
  id
  name
  description
  priceCents
  durationMinutes
  archived
}`) as unknown as TypedDocumentString<MyServicesQuery, MyServicesQueryVariables>;
export const CreateServiceDocument = new TypedDocumentString(`
    mutation CreateService($input: CreateServiceInput!) {
  createService(input: $input) {
    ...ServiceFields
  }
}
    fragment ServiceFields on Service {
  id
  name
  description
  priceCents
  durationMinutes
  archived
}`) as unknown as TypedDocumentString<CreateServiceMutation, CreateServiceMutationVariables>;
export const UpdateServiceDocument = new TypedDocumentString(`
    mutation UpdateService($id: ID!, $input: UpdateServiceInput!) {
  updateService(id: $id, input: $input) {
    ...ServiceFields
  }
}
    fragment ServiceFields on Service {
  id
  name
  description
  priceCents
  durationMinutes
  archived
}`) as unknown as TypedDocumentString<UpdateServiceMutation, UpdateServiceMutationVariables>;
export const ArchiveServiceDocument = new TypedDocumentString(`
    mutation ArchiveService($id: ID!) {
  archiveService(id: $id) {
    ...ServiceFields
  }
}
    fragment ServiceFields on Service {
  id
  name
  description
  priceCents
  durationMinutes
  archived
}`) as unknown as TypedDocumentString<ArchiveServiceMutation, ArchiveServiceMutationVariables>;
export const MyShopDocument = new TypedDocumentString(`
    query MyShop {
  myBarbershop {
    ...ShopFields
    barbers {
      id
      name
      avatarUrl
    }
    invites {
      id
      email
      status
      expiresAt
      createdAt
    }
  }
}
    fragment ShopFields on Barbershop {
  id
  name
  description
  foundedYear
  logoUrl
  address
  latitude
  longitude
  timezone
}`) as unknown as TypedDocumentString<MyShopQuery, MyShopQueryVariables>;
export const CreateBarbershopDocument = new TypedDocumentString(`
    mutation CreateBarbershop($input: CreateBarbershopInput!) {
  createBarbershop(input: $input) {
    ...ShopFields
  }
}
    fragment ShopFields on Barbershop {
  id
  name
  description
  foundedYear
  logoUrl
  address
  latitude
  longitude
  timezone
}`) as unknown as TypedDocumentString<CreateBarbershopMutation, CreateBarbershopMutationVariables>;
export const UpdateBarbershopDocument = new TypedDocumentString(`
    mutation UpdateBarbershop($input: UpdateBarbershopInput!) {
  updateBarbershop(input: $input) {
    ...ShopFields
  }
}
    fragment ShopFields on Barbershop {
  id
  name
  description
  foundedYear
  logoUrl
  address
  latitude
  longitude
  timezone
}`) as unknown as TypedDocumentString<UpdateBarbershopMutation, UpdateBarbershopMutationVariables>;
export const BecomeBarberDocument = new TypedDocumentString(`
    mutation BecomeBarber {
  becomeBarber {
    id
  }
}
    `) as unknown as TypedDocumentString<BecomeBarberMutation, BecomeBarberMutationVariables>;
export const RefreshTokenDocument = new TypedDocumentString(`
    mutation RefreshToken($token: String!) {
  refreshToken(token: $token) {
    accessToken
    accessTokenExpiresAt
    refreshToken
  }
}
    `) as unknown as TypedDocumentString<RefreshTokenMutation, RefreshTokenMutationVariables>;