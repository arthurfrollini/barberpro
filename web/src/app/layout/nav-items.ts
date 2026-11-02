import {
  CalendarDays,
  Clock,
  Scissors,
  Store,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Workspace } from '@/features/workspaces/lib/workspaces';

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

/**
 * What the active shop lets the user do: barbers see their tools first, owners get the shop
 * pages, the profile is everyone's.
 */
export function navItems(active: Workspace | null): Item[] {
  if (active?.barber) return [...BARBER, PROFILE, ...(active.owner ? OWNER : [])];
  if (active?.owner) return [...OWNER, PROFILE];
  return [{ to: '/comecar', label: 'Começar', icon: Store }, PROFILE];
}
