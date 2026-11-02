import { useQuery } from '@tanstack/react-query';
import { fetchRoles, type Roles } from '../api/roles';

export const rolesKey = ['roles'] as const;

export function useRoles() {
  return useQuery({ queryKey: rolesKey, queryFn: fetchRoles });
}

/** Barbers start on their agenda, owners on their shop, everyone else on the way in. */
export function landingPath(roles: Pick<Roles, 'barber' | 'shop'>): string {
  if (roles.barber) return '/agenda';
  if (roles.shop) return '/barbearia';
  return '/comecar';
}

/** The shop the user works in or owns, for its name and time zone. */
export const currentShop = (roles: Roles) => roles.barber?.barbershop ?? roles.shop;
