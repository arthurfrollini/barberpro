import { graphql } from '@/gql';
import { api } from '@/shared/api';

const RolesQuery = graphql(`
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
`);

/** What the signed-in user is: a barber somewhere, the owner of a shop, both or neither. */
export async function fetchRoles() {
  const { myBarberProfile, myBarbershop } = await api.request(RolesQuery);
  return { barber: myBarberProfile ?? null, shop: myBarbershop ?? null };
}

export type Roles = Awaited<ReturnType<typeof fetchRoles>>;
