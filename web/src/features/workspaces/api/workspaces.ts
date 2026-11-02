import { graphql } from '@/gql';
import { api } from '@/shared/api';
import { buildWorkspaces } from '../lib/workspaces';

const WorkspacesQuery = graphql(`
  query Workspaces {
    myBarbershops {
      id
      name
      timezone
      logoUrl
    }
    myBarberProfiles {
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
  }
`);

/** Every shop the signed-in user owns or barbers in, as workspaces. */
export const fetchWorkspaces = async () => buildWorkspaces(await api.request(WorkspacesQuery));
