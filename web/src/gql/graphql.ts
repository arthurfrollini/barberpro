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

export type AgendaAppointmentFragment = { id: string, startsAt: string, endsAt: string, status: AppointmentStatus, serviceName: string, priceCents: number, durationMinutes: number, reminderLeadMinutes: number | null, cancelReason: CancelReason | null, canceledAt: string | null, customer: { id: string, name: string } };

export type BarberAgendaQueryVariables = Exact<{
  date: string;
}>;


export type BarberAgendaQuery = { barberAgenda: Array<{ id: string, startsAt: string, endsAt: string, status: AppointmentStatus, serviceName: string, priceCents: number, durationMinutes: number, reminderLeadMinutes: number | null, cancelReason: CancelReason | null, canceledAt: string | null, customer: { id: string, name: string } }> };

export type MyScheduleQueryVariables = Exact<{ [key: string]: never; }>;


export type MyScheduleQuery = { mySchedule: { blockedDates: Array<string>, weekly: Array<{ weekday: number, startTime: string, endTime: string }> } };

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


export type NotificationsQuery = { notifications: Array<{ id: string, type: NotificationType, title: string, body: string, read: boolean, createdAt: string, appointment: { id: string, startsAt: string, serviceName: string, cancelReason: CancelReason | null, customer: { id: string, name: string }, barber: { name: string } } | null }> };

export type MarkNotificationReadMutationVariables = Exact<{
  id: string | number;
}>;


export type MarkNotificationReadMutation = { markNotificationRead: boolean };

export type RolesQueryVariables = Exact<{ [key: string]: never; }>;


export type RolesQuery = { myBarberProfile: { id: string, name: string, avatarUrl: string | null, barbershop: { id: string, name: string, timezone: string, logoUrl: string | null } } | null, myBarbershop: { id: string, name: string, timezone: string, logoUrl: string | null } | null };

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
export const RolesDocument = new TypedDocumentString(`
    query Roles {
  myBarberProfile {
    id
    name
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
export const RefreshTokenDocument = new TypedDocumentString(`
    mutation RefreshToken($token: String!) {
  refreshToken(token: $token) {
    accessToken
    accessTokenExpiresAt
    refreshToken
  }
}
    `) as unknown as TypedDocumentString<RefreshTokenMutation, RefreshTokenMutationVariables>;