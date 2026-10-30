import { requireUser } from '../../../../shared/adapters/graphql/context.js';
import type { Resolvers } from '../../../../shared/adapters/graphql/generated/resolvers.js';
import { loadSdl } from '../../../../shared/adapters/graphql/sdl.js';
import type { GraphQLModule } from '../../../../shared/adapters/graphql/yoga.js';
import { DomainError } from '../../../../shared/domain/domain-error.js';
import { becomeBarber, removeBarber, updateBarberProfile } from '../../application/barbers.js';
import {
  createBarbershop,
  findNearby,
  searchBarbershops,
  updateBarbershop,
} from '../../application/barbershops.js';
import {
  acceptInvite,
  inviteBarber,
  listInvites,
  revokeInvite,
} from '../../application/invites.js';
import type { ShopsDeps } from '../../application/ports.js';
import { archiveService, createService, updateService } from '../../application/services.js';

/**
 * GraphQL sends `null` for an optional field the client set to null, and leaves it out
 * when omitted. Only the file ids treat null as "remove"; elsewhere null means "no change".
 */
function patchOf<T extends Record<string, unknown>>(input: T, nullable: (keyof T)[] = []) {
  return Object.fromEntries(
    Object.entries(input).filter(
      ([k, v]) => v !== undefined && (v !== null || nullable.includes(k)),
    ),
  ) as { [K in keyof T]?: Exclude<T[K], null> };
}

export function shopsGraphQL(deps: ShopsDeps, publicUrl: string): GraphQLModule {
  const fileUrl = (id: string | null) => (id ? `${publicUrl}/files/${id}` : null);

  const resolvers: Resolvers = {
    Query: {
      barbershop: (_, { id }) => deps.shops.findById(id),
      barbershopsNearby: (_, args) =>
        findNearby(deps, {
          latitude: args.latitude,
          longitude: args.longitude,
          radiusKm: args.radiusKm ?? 10,
          limit: args.limit ?? 20,
        }),
      searchBarbershops: (_, args) =>
        searchBarbershops(deps, {
          query: args.query,
          limit: args.limit ?? 20,
          offset: args.offset ?? 0,
        }),
      barber: (_, { id }) => deps.barbers.findById(id),
      myBarbershop: (_, __, ctx) => deps.shops.findByOwner(requireUser(ctx)),
      myBarberProfile: (_, __, ctx) => deps.barbers.findActiveByUser(requireUser(ctx)),
    },
    Mutation: {
      createBarbershop: (_, { input }, ctx) =>
        createBarbershop(deps, requireUser(ctx), {
          ...input,
          description: input.description ?? '',
          logoFileId: input.logoFileId ?? null,
          timezone: input.timezone ?? 'America/Sao_Paulo',
        }),
      updateBarbershop: (_, { input }, ctx) =>
        updateBarbershop(deps, requireUser(ctx), patchOf(input, ['logoFileId'])),
      inviteBarber: (_, { email }, ctx) => inviteBarber(deps, requireUser(ctx), email),
      revokeInvite: (_, { id }, ctx) => revokeInvite(deps, requireUser(ctx), id),
      acceptInvite: (_, { token }, ctx) => acceptInvite(deps, requireUser(ctx), token),
      becomeBarber: (_, __, ctx) => becomeBarber(deps, requireUser(ctx)),
      removeBarber: (_, { id }, ctx) => removeBarber(deps, requireUser(ctx), id),
      updateBarberProfile: (_, { input }, ctx) =>
        updateBarberProfile(deps, requireUser(ctx), patchOf(input, ['avatarFileId'])),
      createService: (_, { input }, ctx) =>
        createService(deps, requireUser(ctx), { ...input, description: input.description ?? '' }),
      updateService: (_, { id, input }, ctx) =>
        updateService(deps, requireUser(ctx), id, patchOf(input)),
      archiveService: (_, { id }, ctx) => archiveService(deps, requireUser(ctx), id),
    },
    Barbershop: {
      yearsActive: (shop) => shop.yearsActive(deps.clock.now()),
      logoUrl: (shop) => fileUrl(shop.logoFileId),
      latitude: (shop) => shop.location.latitude,
      longitude: (shop) => shop.location.longitude,
      barbers: (shop, _, ctx) => ctx.loaders.barbersByShop.load(shop.id),
      invites: async (shop, _, ctx) => {
        if (shop.ownerId !== ctx.currentUserId) {
          throw new DomainError('NOT_SHOP_OWNER', 'Only the shop owner can see its invites.');
        }
        return listInvites(deps, shop.ownerId);
      },
    },
    NearbyBarbershop: {
      barbershop: (nearby) => nearby.shop,
    },
    Barber: {
      name: async (barber, _, ctx) => (await ctx.loaders.userById.load(barber.userId))?.name ?? '',
      avatarUrl: (barber) => fileUrl(barber.avatarFileId),
      barbershop: async (barber, _, ctx) => {
        const shop = await ctx.loaders.shopById.load(barber.shopId);
        if (!shop) throw new Error(`barber ${barber.id} points to a missing shop`);
        return shop;
      },
      services: (barber, _, ctx) => ctx.loaders.servicesByBarber.load(barber.id),
    },
    Service: {
      archived: (service) => service.isArchived,
    },
    Invite: {
      email: (invite) => invite.email.value,
      status: (invite) =>
        invite.status(deps.clock.now()).toUpperCase() as
          'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED',
    },
  };
  return { typeDefs: loadSdl(import.meta.url, 'shops.graphql'), resolvers };
}
