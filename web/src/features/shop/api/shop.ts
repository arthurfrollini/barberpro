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
`);

const CreateShopMutation = graphql(`
  mutation CreateBarbershop($input: CreateBarbershopInput!) {
    createBarbershop(input: $input) {
      ...ShopFields
    }
  }
`);

const UpdateShopMutation = graphql(`
  mutation UpdateBarbershop($input: UpdateBarbershopInput!) {
    updateBarbershop(input: $input) {
      ...ShopFields
    }
  }
`);

const BecomeBarberMutation = graphql(`
  mutation BecomeBarber {
    becomeBarber {
      id
    }
  }
`);

export const fetchMyShop = async () => (await api.request(MyShopQuery)).myBarbershop ?? null;

export const createShop = async (input: CreateBarbershopInput) =>
  (await api.request(CreateShopMutation, { input })).createBarbershop;

export const updateShop = async (input: UpdateBarbershopInput) =>
  (await api.request(UpdateShopMutation, { input })).updateBarbershop;

export const becomeBarber = async () => (await api.request(BecomeBarberMutation)).becomeBarber;

export type MyShop = NonNullable<Awaited<ReturnType<typeof fetchMyShop>>>;
export type { ShopFieldsFragment as ShopFields } from '@/gql/graphql';
