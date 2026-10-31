import {
  CalendarDays,
  Clock,
  Scissors,
  Store,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Roles } from '@/features/roles/api/roles';

export type Item = { to: string; label: string; icon: LucideIcon };

const BARBER: Item[] = [
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/horarios', label: 'Horários', icon: Clock },
  { to: '/servicos', label: 'Serviços', icon: Scissors },
];
const PROFILE: Item = { to: '/perfil', label: 'Perfil', icon: UserRound };
const OWNER: Item[] = [
  { to: '/barbearia', label: 'Barbearia', icon: Store },
  { to: '/equipe', label: 'Equipe', icon: Users },
];

/** Barbers see their tools first; owners get the shop pages; the profile is everyone's. */
export function navItems(roles: Roles): Item[] {
  if (roles.barber) return [...BARBER, PROFILE, ...(roles.shop ? OWNER : [])];
  if (roles.shop) return [...OWNER, PROFILE];
  return [{ to: '/comecar', label: 'Começar', icon: Store }, PROFILE];
}
