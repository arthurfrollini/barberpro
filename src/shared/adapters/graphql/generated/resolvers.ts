import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import type { User as UserModel } from '../../../../modules/identity/domain/user.js';
import type { Session as SessionModel } from '../../../../modules/identity/application/ports.js';
import type { Barbershop as BarbershopModel } from '../../../../modules/shops/domain/barbershop.js';
import type { NearbyShop as NearbyShopModel } from '../../../../modules/shops/application/ports.js';
import type { Barber as BarberModel } from '../../../../modules/shops/domain/barber.js';
import type { Service as ServiceModel } from '../../../../modules/shops/domain/service.js';
import type { Invite as InviteModel } from '../../../../modules/shops/domain/invite.js';
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
  /** token is the code from the invite email. Errors: INVITE_NOT_FOUND, INVITE_EXPIRED, INVITE_EMAIL_MISMATCH, ALREADY_A_BARBER. */
  acceptInvite: Barber;
  archiveService: Service;
  /** The owner joins their own shop as a barber. */
  becomeBarber: Barber;
  /** Errors: SHOP_ALREADY_OWNED, FILE_NOT_FOUND, INVALID_* for each field. */
  createBarbershop: Barbershop;
  /** Errors: NOT_A_BARBER, INVALID_PRICE, INVALID_DURATION. */
  createService: Service;
  /** Emails a 7-day invite. Errors: NOT_SHOP_OWNER, ALREADY_A_BARBER, INVITE_ALREADY_SENT, EMAIL_NOT_SENT. */
  inviteBarber: Invite;
  /** Swaps a refresh token for a new session. Errors: INVALID_REFRESH_TOKEN. */
  refreshToken: AuthPayload;
  /** Errors: NOT_SHOP_OWNER, BARBER_NOT_FOUND. */
  removeBarber: Barber;
  revokeInvite: Invite;
  /** Errors: INVALID_CREDENTIALS. */
  signIn: AuthPayload;
  /** Errors: INVALID_EMAIL, WEAK_PASSWORD, INVALID_NAME, EMAIL_TAKEN. */
  signUp: AuthPayload;
  /** Errors: NOT_A_BARBER. */
  updateBarberProfile: Barber;
  /** Edits the shop the signed-in user owns. Errors: NOT_SHOP_OWNER. */
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


export type MutationCreateBarbershopArgs = {
  input: CreateBarbershopInput;
};


export type MutationCreateServiceArgs = {
  input: CreateServiceInput;
};


export type MutationInviteBarberArgs = {
  email: Scalars['String']['input'];
};


export type MutationRefreshTokenArgs = {
  token: Scalars['String']['input'];
};


export type MutationRemoveBarberArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRevokeInviteArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSignInArgs = {
  input: SignInInput;
};


export type MutationSignUpArgs = {
  input: SignUpInput;
};


export type MutationUpdateBarberProfileArgs = {
  input: UpdateBarberProfileInput;
};


export type MutationUpdateBarbershopArgs = {
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

export type Query = {
  __typename?: 'Query';
  barber?: Maybe<Barber>;
  /** null when no shop has this id. */
  barbershop?: Maybe<Barbershop>;
  /** Nearest first. radiusKm up to 50, limit up to 50. Errors: INVALID_RADIUS, INVALID_LOCATION. */
  barbershopsNearby: Array<NearbyBarbershop>;
  /** Liveness of the GraphQL layer. Dependencies are checked by GET /health. */
  health: Scalars['String']['output'];
  /** The signed-in user. UNAUTHENTICATED without a valid access token. */
  me: User;
  /** The signed-in user's barber profile, if they barber somewhere. */
  myBarberProfile?: Maybe<Barber>;
  /** The shop the signed-in user owns, if any. */
  myBarbershop?: Maybe<Barbershop>;
  /** Matches names with typos. Errors: INVALID_SEARCH (fewer than 2 characters). */
  searchBarbershops: Array<Barbershop>;
};


export type QueryBarberArgs = {
  id: Scalars['ID']['input'];
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


export type QuerySearchBarbershopsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
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
  AuthPayload: ResolverTypeWrapper<SessionModel>;
  Barber: ResolverTypeWrapper<BarberModel>;
  Barbershop: ResolverTypeWrapper<BarbershopModel>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CreateBarbershopInput: CreateBarbershopInput;
  CreateServiceInput: CreateServiceInput;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Invite: ResolverTypeWrapper<InviteModel>;
  InviteStatus: InviteStatus;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  NearbyBarbershop: ResolverTypeWrapper<NearbyShopModel>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Service: ResolverTypeWrapper<ServiceModel>;
  SignInInput: SignInInput;
  SignUpInput: SignUpInput;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  UpdateBarberProfileInput: UpdateBarberProfileInput;
  UpdateBarbershopInput: UpdateBarbershopInput;
  UpdateProfileInput: UpdateProfileInput;
  UpdateServiceInput: UpdateServiceInput;
  User: ResolverTypeWrapper<UserModel>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  AuthPayload: SessionModel;
  Barber: BarberModel;
  Barbershop: BarbershopModel;
  Boolean: Scalars['Boolean']['output'];
  CreateBarbershopInput: CreateBarbershopInput;
  CreateServiceInput: CreateServiceInput;
  DateTime: Scalars['DateTime']['output'];
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  Invite: InviteModel;
  Mutation: Record<PropertyKey, never>;
  NearbyBarbershop: NearbyShopModel;
  Query: Record<PropertyKey, never>;
  Service: ServiceModel;
  SignInInput: SignInInput;
  SignUpInput: SignUpInput;
  String: Scalars['String']['output'];
  UpdateBarberProfileInput: UpdateBarberProfileInput;
  UpdateBarbershopInput: UpdateBarbershopInput;
  UpdateProfileInput: UpdateProfileInput;
  UpdateServiceInput: UpdateServiceInput;
  User: UserModel;
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
  becomeBarber?: Resolver<ResolversTypes['Barber'], ParentType, ContextType>;
  createBarbershop?: Resolver<ResolversTypes['Barbershop'], ParentType, ContextType, RequireFields<MutationCreateBarbershopArgs, 'input'>>;
  createService?: Resolver<ResolversTypes['Service'], ParentType, ContextType, RequireFields<MutationCreateServiceArgs, 'input'>>;
  inviteBarber?: Resolver<ResolversTypes['Invite'], ParentType, ContextType, RequireFields<MutationInviteBarberArgs, 'email'>>;
  refreshToken?: Resolver<ResolversTypes['AuthPayload'], ParentType, ContextType, RequireFields<MutationRefreshTokenArgs, 'token'>>;
  removeBarber?: Resolver<ResolversTypes['Barber'], ParentType, ContextType, RequireFields<MutationRemoveBarberArgs, 'id'>>;
  revokeInvite?: Resolver<ResolversTypes['Invite'], ParentType, ContextType, RequireFields<MutationRevokeInviteArgs, 'id'>>;
  signIn?: Resolver<ResolversTypes['AuthPayload'], ParentType, ContextType, RequireFields<MutationSignInArgs, 'input'>>;
  signUp?: Resolver<ResolversTypes['AuthPayload'], ParentType, ContextType, RequireFields<MutationSignUpArgs, 'input'>>;
  updateBarberProfile?: Resolver<ResolversTypes['Barber'], ParentType, ContextType, RequireFields<MutationUpdateBarberProfileArgs, 'input'>>;
  updateBarbershop?: Resolver<ResolversTypes['Barbershop'], ParentType, ContextType, RequireFields<MutationUpdateBarbershopArgs, 'input'>>;
  updateProfile?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationUpdateProfileArgs, 'input'>>;
  updateService?: Resolver<ResolversTypes['Service'], ParentType, ContextType, RequireFields<MutationUpdateServiceArgs, 'id' | 'input'>>;
};

export type NearbyBarbershopResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['NearbyBarbershop'] = ResolversParentTypes['NearbyBarbershop']> = {
  barbershop?: Resolver<ResolversTypes['Barbershop'], ParentType, ContextType>;
  distanceKm?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  barber?: Resolver<Maybe<ResolversTypes['Barber']>, ParentType, ContextType, RequireFields<QueryBarberArgs, 'id'>>;
  barbershop?: Resolver<Maybe<ResolversTypes['Barbershop']>, ParentType, ContextType, RequireFields<QueryBarbershopArgs, 'id'>>;
  barbershopsNearby?: Resolver<Array<ResolversTypes['NearbyBarbershop']>, ParentType, ContextType, RequireFields<QueryBarbershopsNearbyArgs, 'latitude' | 'limit' | 'longitude' | 'radiusKm'>>;
  health?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  me?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  myBarberProfile?: Resolver<Maybe<ResolversTypes['Barber']>, ParentType, ContextType>;
  myBarbershop?: Resolver<Maybe<ResolversTypes['Barbershop']>, ParentType, ContextType>;
  searchBarbershops?: Resolver<Array<ResolversTypes['Barbershop']>, ParentType, ContextType, RequireFields<QuerySearchBarbershopsArgs, 'limit' | 'offset' | 'query'>>;
};

export type ServiceResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Service'] = ResolversParentTypes['Service']> = {
  archived?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  durationMinutes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  priceCents?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type UserResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = {
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type Resolvers<ContextType = GraphQLContext> = {
  AuthPayload?: AuthPayloadResolvers<ContextType>;
  Barber?: BarberResolvers<ContextType>;
  Barbershop?: BarbershopResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Invite?: InviteResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  NearbyBarbershop?: NearbyBarbershopResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Service?: ServiceResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
};

