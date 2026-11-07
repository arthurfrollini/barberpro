import { graphql } from '@/gql';
import type { ApiClient } from '@/shared/api';
import type { Coords } from '../lib/location';

const NearbyQuery = graphql(`
  query NearbyBarbershops($latitude: Float!, $longitude: Float!) {
    barbershopsNearby(latitude: $latitude, longitude: $longitude, radiusKm: 10, limit: 30) {
      distanceKm
      barbershop {
        id
        name
        address
        logoUrl
      }
    }
  }
`);

const SearchQuery = graphql(`
  query SearchBarbershops($query: String!) {
    searchBarbershops(query: $query, limit: 30) {
      id
      name
      address
      logoUrl
    }
  }
`);

export const fetchNearby = async (api: ApiClient, coords: Coords) =>
  (await api.request(NearbyQuery, coords)).barbershopsNearby;

export const searchShops = async (api: ApiClient, query: string) =>
  (await api.request(SearchQuery, { query })).searchBarbershops;

export type ShopSummary = Awaited<ReturnType<typeof searchShops>>[number];
