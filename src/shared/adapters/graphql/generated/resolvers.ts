import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import type { User as UserModel } from '../../../../modules/identity/domain/user.js';
import type { Session as SessionModel } from '../../../../modules/identity/application/ports.js';
import type { Barbershop as BarbershopModel } from '../../../../modules/shops/domain/barbershop.js';
import type { NearbyShop as NearbyShopModel } from '../../../../modules/shops/application/ports.js';
import type { Barber as BarberModel } from '../../../../modules/shops/domain/barber.js';
import type { Service as ServiceModel } from '../../../../modules/shops/domain/service.js';
import type { Invite as InviteModel } from '../../../../modules/shops/domain/invite.js';
import type { Appointment as AppointmentModel } from '../../../../modules/scheduling/domain/appointment.js';
import type { WeeklyInterval as WeeklyIntervalModel } from '../../../../modules/scheduling/domain/weekly-schedule.js';
import type { ScheduleView as ScheduleViewModel, ScheduleUpdate as ScheduleUpdateModel } from '../../../../modules/scheduling/application/ports.js';
import type { Notification as NotificationModel } from '../../../../modules/notifications/domain/notification.js';
import type { AgendaChangeMessage as AgendaChangeMessageModel } from '../pubsub.js';
import type { GraphQLContext } from '../context.js';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** An instant in ISO 8601. Inputs must carry Z or an offset; outputs are always UTC (2026-11-02T13:30:00.000Z). */
  DateTime: { input: Date; output: Date; }
};

export type AgendaChange = {
  __typename?: 'AgendaChange';
  appointment: Appointment;
  /** Set for RESCHEDULED. */
  previousStartsAt?: Maybe<Scalars['DateTime']['output']>;
  type: AgendaChangeType;
};

export type AgendaChangeType =
  | 'BOOKED'
  | 'CANCELED'
  | 'RESCHEDULED';

export type Appointment = {
  __typename?: 'Appointment';
  barber: Barber;
  cancelReason?: Maybe<CancelReason>;
  canceledAt?: Maybe<Scalars['DateTime']['output']>;
  customer: Customer;
  durationMinutes: Scalars['Int']['output'];
  endsAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  priceCents: Scalars['Int']['output'];
  /** Minutes before the start to remind the customer; null for no reminder. */
  reminderLeadMinutes?: Maybe<Scalars['Int']['output']>;
  /** Name, price and duration as they were when booked. */
  serviceName: Scalars['String']['output'];
  startsAt: Scalars['DateTime']['output'];
  status: AppointmentStatus;
};

export type AppointmentStatus =
  | 'BOOKED'
  | 'CANCELED';

/** A signed-in session. Send accessToken as `Authorization: Bearer <token>`. */
export type AuthPayload = {
  __typename?: 'AuthPayload';
  accessToken: Scalars['String']['output'];
  accessTokenExpiresAt: Scalars['DateTime']['output'];
  /** Single use: exchange it with refreshToken before it expires (30 days). */
  refreshToken: Scalars['String']['output'];
  user: User;
};

export type Barber = {
  __typename?: 'Barber';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  barbershop: Barbershop;
  bio: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  /** Services that can be booked (archived ones are left out). */
  services: Array<Service>;
};

export type BarberSchedule = {
  __typename?: 'BarberSchedule';
  /** Days off, as YYYY-MM-DD in the shop's time zone. */
  blockedDates: Array<Scalars['String']['output']>;
  weekly: Array<WeeklyInterval>;
};

/** A shop's public page. Booking rules live with each barber, not here. */
export type Barbershop = {
  __typename?: 'Barbershop';
  address: Scalars['String']['output'];
  /** Active barbers, oldest first. */
  barbers: Array<Barber>;
  description: Scalars['String']['output'];
  foundedYear: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  /** Owner only. Errors: NOT_SHOP_OWNER. */
  invites: Array<Invite>;
  latitude: Scalars['Float']['output'];
  logoUrl?: Maybe<Scalars['String']['output']>;
  longitude: Scalars['Float']['output'];
  name: Scalars['String']['output'];
  /** IANA time zone; weekly schedules are in this zone. */
  timezone: Scalars['String']['output'];
  /** Years since the shop was founded. */
  yearsActive: Scalars['Int']['output'];
};

export type BookAppointmentInput = {
  barberId: Scalars['ID']['input'];
  /** 5 to 60 in steps of 5; leave out for no reminder. */
  reminderLeadMinutes?: InputMaybe<Scalars['Int']['input']>;
  serviceId: Scalars['ID']['input'];
  /** One of the times availableSlots returned. */
  startsAt: Scalars['DateTime']['input'];
};

export type CancelReason =
  | 'BARBER'
  | 'BARBER_REMOVED'
  | 'CUSTOMER'
  | 'DAY_BLOCKED'
  | 'SCHEDULE_CHANGED';

export type CreateBarbershopInput = {
  address: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  foundedYear: Scalars['Int']['input'];
  latitude: Scalars['Float']['input'];
  /** Id returned by POST /uploads. */
  logoFileId?: InputMaybe<Scalars['ID']['input']>;
  longitude: Scalars['Float']['input'];
  name: Scalars['String']['input'];
  timezone?: InputMaybe<Scalars['String']['input']>;
};

export type CreateServiceInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  /** 5 to 480, in steps of 5. */
  durationMinutes: Scalars['Int']['input'];
  name: Scalars['String']['input'];
  priceCents: Scalars['Int']['input'];
};

/** Who booked; barbers see the name only. */
export type Customer = {
  __typename?: 'Customer';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type Invite = {
  __typename?: 'Invite';
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  expiresAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  status: InviteStatus;
};

export type InviteStatus =
  | 'ACCEPTED'
  | 'EXPIRED'
  | 'PENDING'
  | 'REVOKED';

export type Mutation = {
  __typename?: 'Mutation';
  /** token is the code from the invite email. A person may barber in many shops, once in each. Errors: INVITE_NOT_FOUND, INVITE_EXPIRED, INVITE_EMAIL_MISMATCH, ALREADY_A_BARBER (already in that shop). */
  acceptInvite: Barber;
  archiveService: Service;
  /** The owner joins one of their shops as a barber. Errors: NOT_SHOP_OWNER, ALREADY_A_BARBER. */
  becomeBarber: Barber;
  /** Blocks a whole day for one barber profile (other shops are not affected) and returns the appointments it canceled (those 2 hours or more away). Errors: NOT_A_BARBER, INVALID_DATE. */
  blockDate: Array<Appointment>;
  /** SLOT_UNAVAILABLE also when the barber is booked at another of their shops. Errors: SLOT_UNAVAILABLE, SLOT_IN_PAST, BEYOND_BOOKING_HORIZON, CUSTOMER_BUSY, BARBER_CANNOT_BOOK_SELF, INVALID_REMINDER_LEAD, BARBER_NOT_FOUND, SERVICE_NOT_FOUND. */
  bookAppointment: Appointment;
  /** Customer or barber, up to 2 hours before. Errors: CANCELLATION_WINDOW_CLOSED, APPOINTMENT_NOT_FOUND. */
  cancelAppointment: Appointment;
  /** An owner may have many shops. Errors: FILE_NOT_FOUND, INVALID_* for each field. */
  createBarbershop: Barbershop;
  /** A service for one of the user's barber profiles. Errors: NOT_A_BARBER, INVALID_PRICE, INVALID_DURATION. */
  createService: Service;
  /** Emails a 7-day invite to this shop. Errors: NOT_SHOP_OWNER, ALREADY_A_BARBER (already in this shop), INVITE_ALREADY_SENT, EMAIL_NOT_SENT. */
  inviteBarber: Invite;
  /** Errors: NOTIFICATION_NOT_FOUND. */
  markNotificationRead: Scalars['Boolean']['output'];
  /** Swaps a refresh token for a new session. Errors: INVALID_REFRESH_TOKEN. */
  refreshToken: AuthPayload;
  /** This phone gets the signed-in user's notifications as pushes; a phone that was someone else's moves to them. token is what Expo's getExpoPushTokenAsync returns. Errors: INVALID_PUSH_TOKEN. */
  registerPushToken: Scalars['Boolean']['output'];
  /** Errors: NOT_SHOP_OWNER, BARBER_NOT_FOUND. */
  removeBarber: Barber;
  /** Same barber and service, new time. Errors: as bookAppointment, plus CANCELLATION_WINDOW_CLOSED. */
  rescheduleAppointment: Appointment;
  revokeInvite: Invite;
  /** Replaces the weekly hours. Errors: NOT_A_BARBER, INVALID_SCHEDULE. */
  setWeeklySchedule: ScheduleUpdate;
  /** Errors: INVALID_CREDENTIALS. */
  signIn: AuthPayload;
  /** Errors: INVALID_EMAIL, WEAK_PASSWORD, INVALID_NAME, EMAIL_TAKEN. */
  signUp: AuthPayload;
  /** Errors: NOT_A_BARBER. */
  unblockDate: Scalars['Boolean']['output'];
  /** Stops pushes to this phone, on sign-out. Works without a session too (signing out offline, an expired session): only the phone has its token. Signed in, removes only the user's own. False when there was nothing to remove. */
  unregisterPushToken: Scalars['Boolean']['output'];
  /** Bio and photo of one of the user's barber profiles. Errors: NOT_A_BARBER. */
  updateBarberProfile: Barber;
  /** Errors: NOT_SHOP_OWNER (also for an unknown id). */
  updateBarbershop: Barbershop;
  updateProfile: User;
  /** Errors: SERVICE_NOT_FOUND, NOT_SERVICE_OWNER. */
  updateService: Service;
};


export type MutationAcceptInviteArgs = {
  token: Scalars['String']['input'];
};


export type MutationArchiveServiceArgs = {
  id: Scalars['ID']['input'];
};


export type MutationBecomeBarberArgs = {
  shopId: Scalars['ID']['input'];
};


export type MutationBlockDateArgs = {
  barberId: Scalars['ID']['input'];
  date: Scalars['String']['input'];
};


export type MutationBookAppointmentArgs = {
  input: BookAppointmentInput;
};


export type MutationCancelAppointmentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCreateBarbershopArgs = {
  input: CreateBarbershopInput;
};


export type MutationCreateServiceArgs = {
  barberId: Scalars['ID']['input'];
  input: CreateServiceInput;
};


export type MutationInviteBarberArgs = {
  email: Scalars['String']['input'];
  shopId: Scalars['ID']['input'];
};


export type MutationMarkNotificationReadArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRefreshTokenArgs = {
  token: Scalars['String']['input'];
};


export type MutationRegisterPushTokenArgs = {
  platform: PushPlatform;
  token: Scalars['String']['input'];
};


export type MutationRemoveBarberArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRescheduleAppointmentArgs = {
  id: Scalars['ID']['input'];
  startsAt: Scalars['DateTime']['input'];
};


export type MutationRevokeInviteArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSetWeeklyScheduleArgs = {
  barberId: Scalars['ID']['input'];
  intervals: Array<WeeklyIntervalInput>;
};


export type MutationSignInArgs = {
  input: SignInInput;
};


export type MutationSignUpArgs = {
  input: SignUpInput;
};


export type MutationUnblockDateArgs = {
  barberId: Scalars['ID']['input'];
  date: Scalars['String']['input'];
};


export type MutationUnregisterPushTokenArgs = {
  token: Scalars['String']['input'];
};


export type MutationUpdateBarberProfileArgs = {
  barberId: Scalars['ID']['input'];
  input: UpdateBarberProfileInput;
};


export type MutationUpdateBarbershopArgs = {
  id: Scalars['ID']['input'];
  input: UpdateBarbershopInput;
};


export type MutationUpdateProfileArgs = {
  input: UpdateProfileInput;
};


export type MutationUpdateServiceArgs = {
  id: Scalars['ID']['input'];
  input: UpdateServiceInput;
};

export type NearbyBarbershop = {
  __typename?: 'NearbyBarbershop';
  barbershop: Barbershop;
  distanceKm: Scalars['Float']['output'];
};

/** An entry in the signed-in user's list. The same text also goes out by email. */
export type Notification = {
  __typename?: 'Notification';
  appointment?: Maybe<Appointment>;
  /** When the appointment started as this notification describes it. A later reschedule changes the appointment, not this. */
  appointmentStartsAt?: Maybe<Scalars['DateTime']['output']>;
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  read: Scalars['Boolean']['output'];
  title: Scalars['String']['output'];
  type: NotificationType;
};

export type NotificationType =
  | 'APPOINTMENT_BOOKED'
  | 'APPOINTMENT_CANCELED'
  | 'APPOINTMENT_REMINDER'
  | 'APPOINTMENT_RESCHEDULED';

export type PushPlatform =
  | 'ANDROID'
  | 'IOS';

export type Query = {
  __typename?: 'Query';
  /** Free start times on a date (YYYY-MM-DD in the shop's zone), every 15 minutes. Public. */
  availableSlots: Array<Scalars['DateTime']['output']>;
  barber?: Maybe<Barber>;
  /** Appointments of one of the user's barber profiles on a local date, canceled ones included. Errors: NOT_A_BARBER. */
  barberAgenda: Array<Appointment>;
  /** null when no shop has this id. */
  barbershop?: Maybe<Barbershop>;
  /** Nearest first. radiusKm up to 50, limit up to 50. Errors: INVALID_RADIUS, INVALID_LOCATION. */
  barbershopsNearby: Array<NearbyBarbershop>;
  /** Liveness of the GraphQL layer. Dependencies are checked by GET /health. */
  health: Scalars['String']['output'];
  /** The signed-in user. UNAUTHENTICATED without a valid access token. */
  me: User;
  /** The signed-in customer's appointments: upcoming soonest first, or the latest 100. */
  myAppointments: Array<Appointment>;
  /** The signed-in user's barber profiles, one per shop they work in, oldest first. Services, hours and agenda belong to each profile. */
  myBarberProfiles: Array<Barber>;
  /** The shops the signed-in user owns, oldest first. */
  myBarbershops: Array<Barbershop>;
  /** Weekly hours and days off of one of the user's barber profiles. Errors: NOT_A_BARBER. */
  mySchedule: BarberSchedule;
  /** Newest first; limit up to 50. */
  notifications: Array<Notification>;
  /** Free start times for moving an appointment to a date (YYYY-MM-DD in the shop's zone), using its own duration and ignoring its current slot. Errors: APPOINTMENT_NOT_FOUND, APPOINTMENT_CANCELED, CANCELLATION_WINDOW_CLOSED, INVALID_DATE, BARBER_NOT_FOUND. */
  rescheduleSlots: Array<Scalars['DateTime']['output']>;
  /** Matches names with typos. Errors: INVALID_SEARCH (fewer than 2 characters). */
  searchBarbershops: Array<Barbershop>;
  unreadNotificationCount: Scalars['Int']['output'];
};


export type QueryAvailableSlotsArgs = {
  barberId: Scalars['ID']['input'];
  date: Scalars['String']['input'];
  serviceId: Scalars['ID']['input'];
};


export type QueryBarberArgs = {
  id: Scalars['ID']['input'];
};


export type QueryBarberAgendaArgs = {
  barberId: Scalars['ID']['input'];
  date: Scalars['String']['input'];
};


export type QueryBarbershopArgs = {
  id: Scalars['ID']['input'];
};


export type QueryBarbershopsNearbyArgs = {
  latitude: Scalars['Float']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  longitude: Scalars['Float']['input'];
  radiusKm?: InputMaybe<Scalars['Float']['input']>;
};


export type QueryMyAppointmentsArgs = {
  upcoming?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryMyScheduleArgs = {
  barberId: Scalars['ID']['input'];
};


export type QueryNotificationsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryRescheduleSlotsArgs = {
  appointmentId: Scalars['ID']['input'];
  date: Scalars['String']['input'];
};


export type QuerySearchBarbershopsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
};

export type ScheduleUpdate = {
  __typename?: 'ScheduleUpdate';
  /** Appointments 2 hours or more away that no longer fit and were canceled. */
  canceledAppointments: Array<Appointment>;
  weekly: Array<WeeklyInterval>;
};

export type Service = {
  __typename?: 'Service';
  archived: Scalars['Boolean']['output'];
  description: Scalars['String']['output'];
  durationMinutes: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  /** Price in cents of BRL: 5000 is R$ 50,00. */
  priceCents: Scalars['Int']['output'];
};

export type SignInInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type SignUpInput = {
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  /** 8 to 128 characters. */
  password: Scalars['String']['input'];
};

export type Subscription = {
  __typename?: 'Subscription';
  /** One of the signed-in user's barber profiles, as its agenda changes: bookings, cancellations, reschedules. Errors: UNAUTHENTICATED, NOT_A_BARBER. */
  agendaChanged: AgendaChange;
};


export type SubscriptionAgendaChangedArgs = {
  barberId: Scalars['ID']['input'];
};

export type UpdateBarberProfileInput = {
  /** Id returned by POST /uploads; null removes the photo. */
  avatarFileId?: InputMaybe<Scalars['ID']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateBarbershopInput = {
  address?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  foundedYear?: InputMaybe<Scalars['Int']['input']>;
  latitude?: InputMaybe<Scalars['Float']['input']>;
  /** null removes the logo. */
  logoFileId?: InputMaybe<Scalars['ID']['input']>;
  longitude?: InputMaybe<Scalars['Float']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  timezone?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateProfileInput = {
  name: Scalars['String']['input'];
};

export type UpdateServiceInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  durationMinutes?: InputMaybe<Scalars['Int']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  priceCents?: InputMaybe<Scalars['Int']['input']>;
};

export type User = {
  __typename?: 'User';
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

/** Working hours on a weekday (0 = Sunday), as HH:MM in the shop's time zone. */
export type WeeklyInterval = {
  __typename?: 'WeeklyInterval';
  endTime: Scalars['String']['output'];
  startTime: Scalars['String']['output'];
  weekday: Scalars['Int']['output'];
};

export type WeeklyIntervalInput = {
  /** HH:MM, up to 24:00. */
  endTime: Scalars['String']['input'];
  /** HH:MM, in steps of 5 minutes. */
  startTime: Scalars['String']['input'];
  weekday: Scalars['Int']['input'];
};



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;





/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  AgendaChange: ResolverTypeWrapper<AgendaChangeMessageModel>;
  AgendaChangeType: AgendaChangeType;
  Appointment: ResolverTypeWrapper<AppointmentModel>;
  AppointmentStatus: AppointmentStatus;
  AuthPayload: ResolverTypeWrapper<SessionModel>;
  Barber: ResolverTypeWrapper<BarberModel>;
  BarberSchedule: ResolverTypeWrapper<ScheduleViewModel>;
  Barbershop: ResolverTypeWrapper<BarbershopModel>;
  BookAppointmentInput: BookAppointmentInput;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CancelReason: CancelReason;
  CreateBarbershopInput: CreateBarbershopInput;
  CreateServiceInput: CreateServiceInput;
  Customer: ResolverTypeWrapper<Customer>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Invite: ResolverTypeWrapper<InviteModel>;
  InviteStatus: InviteStatus;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  NearbyBarbershop: ResolverTypeWrapper<NearbyShopModel>;
  Notification: ResolverTypeWrapper<NotificationModel>;
  NotificationType: NotificationType;
  PushPlatform: PushPlatform;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  ScheduleUpdate: ResolverTypeWrapper<ScheduleUpdateModel>;
  Service: ResolverTypeWrapper<ServiceModel>;
  SignInInput: SignInInput;
  SignUpInput: SignUpInput;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Subscription: ResolverTypeWrapper<Record<PropertyKey, never>>;
  UpdateBarberProfileInput: UpdateBarberProfileInput;
  UpdateBarbershopInput: UpdateBarbershopInput;
  UpdateProfileInput: UpdateProfileInput;
  UpdateServiceInput: UpdateServiceInput;
  User: ResolverTypeWrapper<UserModel>;
  WeeklyInterval: ResolverTypeWrapper<WeeklyIntervalModel>;
  WeeklyIntervalInput: WeeklyIntervalInput;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  AgendaChange: AgendaChangeMessageModel;
  Appointment: AppointmentModel;
  AuthPayload: SessionModel;
  Barber: BarberModel;
  BarberSchedule: ScheduleViewModel;
  Barbershop: BarbershopModel;
  BookAppointmentInput: BookAppointmentInput;
  Boolean: Scalars['Boolean']['output'];
  CreateBarbershopInput: CreateBarbershopInput;
  CreateServiceInput: CreateServiceInput;
  Customer: Customer;
  DateTime: Scalars['DateTime']['output'];
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  Invite: InviteModel;
  Mutation: Record<PropertyKey, never>;
  NearbyBarbershop: NearbyShopModel;
  Notification: NotificationModel;
  Query: Record<PropertyKey, never>;
  ScheduleUpdate: ScheduleUpdateModel;
  Service: ServiceModel;
  SignInInput: SignInInput;
  SignUpInput: SignUpInput;
  String: Scalars['String']['output'];
  Subscription: Record<PropertyKey, never>;
  UpdateBarberProfileInput: UpdateBarberProfileInput;
  UpdateBarbershopInput: UpdateBarbershopInput;
  UpdateProfileInput: UpdateProfileInput;
  UpdateServiceInput: UpdateServiceInput;
  User: UserModel;
  WeeklyInterval: WeeklyIntervalModel;
  WeeklyIntervalInput: WeeklyIntervalInput;
};

export type AgendaChangeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AgendaChange'] = ResolversParentTypes['AgendaChange']> = {
  appointment?: Resolver<ResolversTypes['Appointment'], ParentType, ContextType>;
  previousStartsAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['AgendaChangeType'], ParentType, ContextType>;
};

export type AppointmentResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Appointment'] = ResolversParentTypes['Appointment']> = {
  barber?: Resolver<ResolversTypes['Barber'], ParentType, ContextType>;
  cancelReason?: Resolver<Maybe<ResolversTypes['CancelReason']>, ParentType, ContextType>;
  canceledAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  customer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  durationMinutes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  endsAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  priceCents?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  reminderLeadMinutes?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  serviceName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  startsAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['AppointmentStatus'], ParentType, ContextType>;
};

export type AuthPayloadResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AuthPayload'] = ResolversParentTypes['AuthPayload']> = {
  accessToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  accessTokenExpiresAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  refreshToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
};

export type BarberResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Barber'] = ResolversParentTypes['Barber']> = {
  avatarUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  barbershop?: Resolver<ResolversTypes['Barbershop'], ParentType, ContextType>;
  bio?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  services?: Resolver<Array<ResolversTypes['Service']>, ParentType, ContextType>;
};

export type BarberScheduleResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['BarberSchedule'] = ResolversParentTypes['BarberSchedule']> = {
  blockedDates?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  weekly?: Resolver<Array<ResolversTypes['WeeklyInterval']>, ParentType, ContextType>;
};

export type BarbershopResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Barbershop'] = ResolversParentTypes['Barbershop']> = {
  address?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  barbers?: Resolver<Array<ResolversTypes['Barber']>, ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  foundedYear?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  invites?: Resolver<Array<ResolversTypes['Invite']>, ParentType, ContextType>;
  latitude?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  logoUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  longitude?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  timezone?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  yearsActive?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type CustomerResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Customer'] = ResolversParentTypes['Customer']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type InviteResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Invite'] = ResolversParentTypes['Invite']> = {
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  expiresAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['InviteStatus'], ParentType, ContextType>;
};

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  acceptInvite?: Resolver<ResolversTypes['Barber'], ParentType, ContextType, RequireFields<MutationAcceptInviteArgs, 'token'>>;
  archiveService?: Resolver<ResolversTypes['Service'], ParentType, ContextType, RequireFields<MutationArchiveServiceArgs, 'id'>>;
  becomeBarber?: Resolver<ResolversTypes['Barber'], ParentType, ContextType, RequireFields<MutationBecomeBarberArgs, 'shopId'>>;
  blockDate?: Resolver<Array<ResolversTypes['Appointment']>, ParentType, ContextType, RequireFields<MutationBlockDateArgs, 'barberId' | 'date'>>;
  bookAppointment?: Resolver<ResolversTypes['Appointment'], ParentType, ContextType, RequireFields<MutationBookAppointmentArgs, 'input'>>;
  cancelAppointment?: Resolver<ResolversTypes['Appointment'], ParentType, ContextType, RequireFields<MutationCancelAppointmentArgs, 'id'>>;
  createBarbershop?: Resolver<ResolversTypes['Barbershop'], ParentType, ContextType, RequireFields<MutationCreateBarbershopArgs, 'input'>>;
  createService?: Resolver<ResolversTypes['Service'], ParentType, ContextType, RequireFields<MutationCreateServiceArgs, 'barberId' | 'input'>>;
  inviteBarber?: Resolver<ResolversTypes['Invite'], ParentType, ContextType, RequireFields<MutationInviteBarberArgs, 'email' | 'shopId'>>;
  markNotificationRead?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationMarkNotificationReadArgs, 'id'>>;
  refreshToken?: Resolver<ResolversTypes['AuthPayload'], ParentType, ContextType, RequireFields<MutationRefreshTokenArgs, 'token'>>;
  registerPushToken?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationRegisterPushTokenArgs, 'platform' | 'token'>>;
  removeBarber?: Resolver<ResolversTypes['Barber'], ParentType, ContextType, RequireFields<MutationRemoveBarberArgs, 'id'>>;
  rescheduleAppointment?: Resolver<ResolversTypes['Appointment'], ParentType, ContextType, RequireFields<MutationRescheduleAppointmentArgs, 'id' | 'startsAt'>>;
  revokeInvite?: Resolver<ResolversTypes['Invite'], ParentType, ContextType, RequireFields<MutationRevokeInviteArgs, 'id'>>;
  setWeeklySchedule?: Resolver<ResolversTypes['ScheduleUpdate'], ParentType, ContextType, RequireFields<MutationSetWeeklyScheduleArgs, 'barberId' | 'intervals'>>;
  signIn?: Resolver<ResolversTypes['AuthPayload'], ParentType, ContextType, RequireFields<MutationSignInArgs, 'input'>>;
  signUp?: Resolver<ResolversTypes['AuthPayload'], ParentType, ContextType, RequireFields<MutationSignUpArgs, 'input'>>;
  unblockDate?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationUnblockDateArgs, 'barberId' | 'date'>>;
  unregisterPushToken?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationUnregisterPushTokenArgs, 'token'>>;
  updateBarberProfile?: Resolver<ResolversTypes['Barber'], ParentType, ContextType, RequireFields<MutationUpdateBarberProfileArgs, 'barberId' | 'input'>>;
  updateBarbershop?: Resolver<ResolversTypes['Barbershop'], ParentType, ContextType, RequireFields<MutationUpdateBarbershopArgs, 'id' | 'input'>>;
  updateProfile?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationUpdateProfileArgs, 'input'>>;
  updateService?: Resolver<ResolversTypes['Service'], ParentType, ContextType, RequireFields<MutationUpdateServiceArgs, 'id' | 'input'>>;
};

export type NearbyBarbershopResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['NearbyBarbershop'] = ResolversParentTypes['NearbyBarbershop']> = {
  barbershop?: Resolver<ResolversTypes['Barbershop'], ParentType, ContextType>;
  distanceKm?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type NotificationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Notification'] = ResolversParentTypes['Notification']> = {
  appointment?: Resolver<Maybe<ResolversTypes['Appointment']>, ParentType, ContextType>;
  appointmentStartsAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  body?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  read?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['NotificationType'], ParentType, ContextType>;
};

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  availableSlots?: Resolver<Array<ResolversTypes['DateTime']>, ParentType, ContextType, RequireFields<QueryAvailableSlotsArgs, 'barberId' | 'date' | 'serviceId'>>;
  barber?: Resolver<Maybe<ResolversTypes['Barber']>, ParentType, ContextType, RequireFields<QueryBarberArgs, 'id'>>;
  barberAgenda?: Resolver<Array<ResolversTypes['Appointment']>, ParentType, ContextType, RequireFields<QueryBarberAgendaArgs, 'barberId' | 'date'>>;
  barbershop?: Resolver<Maybe<ResolversTypes['Barbershop']>, ParentType, ContextType, RequireFields<QueryBarbershopArgs, 'id'>>;
  barbershopsNearby?: Resolver<Array<ResolversTypes['NearbyBarbershop']>, ParentType, ContextType, RequireFields<QueryBarbershopsNearbyArgs, 'latitude' | 'limit' | 'longitude' | 'radiusKm'>>;
  health?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  me?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  myAppointments?: Resolver<Array<ResolversTypes['Appointment']>, ParentType, ContextType, RequireFields<QueryMyAppointmentsArgs, 'upcoming'>>;
  myBarberProfiles?: Resolver<Array<ResolversTypes['Barber']>, ParentType, ContextType>;
  myBarbershops?: Resolver<Array<ResolversTypes['Barbershop']>, ParentType, ContextType>;
  mySchedule?: Resolver<ResolversTypes['BarberSchedule'], ParentType, ContextType, RequireFields<QueryMyScheduleArgs, 'barberId'>>;
  notifications?: Resolver<Array<ResolversTypes['Notification']>, ParentType, ContextType, RequireFields<QueryNotificationsArgs, 'limit' | 'offset'>>;
  rescheduleSlots?: Resolver<Array<ResolversTypes['DateTime']>, ParentType, ContextType, RequireFields<QueryRescheduleSlotsArgs, 'appointmentId' | 'date'>>;
  searchBarbershops?: Resolver<Array<ResolversTypes['Barbershop']>, ParentType, ContextType, RequireFields<QuerySearchBarbershopsArgs, 'limit' | 'offset' | 'query'>>;
  unreadNotificationCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type ScheduleUpdateResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ScheduleUpdate'] = ResolversParentTypes['ScheduleUpdate']> = {
  canceledAppointments?: Resolver<Array<ResolversTypes['Appointment']>, ParentType, ContextType>;
  weekly?: Resolver<Array<ResolversTypes['WeeklyInterval']>, ParentType, ContextType>;
};

export type ServiceResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Service'] = ResolversParentTypes['Service']> = {
  archived?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  durationMinutes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  priceCents?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type SubscriptionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = {
  agendaChanged?: SubscriptionResolver<ResolversTypes['AgendaChange'], "agendaChanged", ParentType, ContextType, RequireFields<SubscriptionAgendaChangedArgs, 'barberId'>>;
};

export type UserResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = {
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type WeeklyIntervalResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['WeeklyInterval'] = ResolversParentTypes['WeeklyInterval']> = {
  endTime?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  startTime?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  weekday?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type Resolvers<ContextType = GraphQLContext> = {
  AgendaChange?: AgendaChangeResolvers<ContextType>;
  Appointment?: AppointmentResolvers<ContextType>;
  AuthPayload?: AuthPayloadResolvers<ContextType>;
  Barber?: BarberResolvers<ContextType>;
  BarberSchedule?: BarberScheduleResolvers<ContextType>;
  Barbershop?: BarbershopResolvers<ContextType>;
  Customer?: CustomerResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Invite?: InviteResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  NearbyBarbershop?: NearbyBarbershopResolvers<ContextType>;
  Notification?: NotificationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  ScheduleUpdate?: ScheduleUpdateResolvers<ContextType>;
  Service?: ServiceResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  WeeklyInterval?: WeeklyIntervalResolvers<ContextType>;
};

