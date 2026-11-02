import { NavLink } from 'react-router';
import type { Roles } from '@/features/roles/api/roles';
import { cn } from '@/shared/lib/utils';
import { navItems } from './nav-items';

export function MainNav({ roles, onNavigate }: { roles: Roles; onNavigate?: () => void }) {
  return (
    <nav aria-label="Principal" className="flex flex-col gap-1">
      {navItems(roles).map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground',
              isActive && 'border-primary bg-sidebar-accent text-foreground',
            )
          }
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
