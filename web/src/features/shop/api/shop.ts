import { graphql } from '@/gql';
import type { CreateBarbershopInput, UpdateBarbershopInput } from '@/gql/graphql';
import { api } from '@/shared/api';

graphql(`
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
`);

const MyShopQuery = graphql(`
  query MyShop($id: ID!) {
    barbershop(id: $id) {
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
`);

const CreateShopMutation = graphql(`
  mutation CreateBarbershop($input: CreateBarbershopInput!) {
    createBarbershop(input: $input) {
      ...ShopFields
    }
  }
`);

const UpdateShopMutation = graphql(`
  mutation UpdateBarbershop($id: ID!, $input: UpdateBarbershopInput!) {
    updateBarbershop(id: $id, input: $input) {
      ...ShopFields
    }
  }
`);

const BecomeBarberMutation = graphql(`
  mutation BecomeBarber($shopId: ID!) {
    becomeBarber(shopId: $shopId) {
      id
    }
  }
`);

/** A shop the user owns, with its team and invites (owner-only fields). */
export const fetchMyShop = async (id: string) =>
  (await api.request(MyShopQuery, { id })).barbershop ?? null;

export const createShop = async (input: CreateBarbershopInput) =>
  (await api.request(CreateShopMutation, { input })).createBarbershop;

export const updateShop = async ({ id, input }: { id: string; input: UpdateBarbershopInput }) =>
  (await api.request(UpdateShopMutation, { id, input })).updateBarbershop;

export const becomeBarber = async (shopId: string) =>
  (await api.request(BecomeBarberMutation, { shopId })).becomeBarber;

export type MyShop = NonNullable<Awaited<ReturnType<typeof fetchMyShop>>>;
export type { ShopFieldsFragment as ShopFields } from '@/gql/graphql';
