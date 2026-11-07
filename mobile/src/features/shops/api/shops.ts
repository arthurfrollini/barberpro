import { graphql } from '@/gql';
import type { ApiClient } from '@/shared/api';

const BarbershopQuery = graphql(`
  query Barbershop($id: ID!) {
    barbershop(id: $id) {
      id
      name
      description
      yearsActive
      logoUrl
      address
      latitude
      longitude
      timezone
      barbers {
        id
        name
        bio
        avatarUrl
      }
    }
  }
`);

const BarberQuery = graphql(`
  query Barber($id: ID!) {
    barber(id: $id) {
      id
      name
      bio
      avatarUrl
      barbershop {
        id
        name
        address
        timezone
      }
      services {
        id
        name
        description
        priceCents
        durationMinutes
      }
    }
  }
`);

export const fetchShop = async (api: ApiClient, id: string) =>
  (await api.request(BarbershopQuery, { id })).barbershop;

export const fetchBarber = async (api: ApiClient, id: string) =>
  (await api.request(BarberQuery, { id })).barber;

export type Shop = NonNullable<Awaited<ReturnType<typeof fetchShop>>>;
export type Barber = NonNullable<Awaited<ReturnType<typeof fetchBarber>>>;
