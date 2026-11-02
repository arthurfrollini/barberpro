import { Check, ChevronsUpDown, Mail, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { useActiveWorkspace } from '../hooks/use-workspaces';
import { roleLabel, type ShopSummary } from '../lib/workspaces';

function ShopMark({ shop, className }: { shop: ShopSummary; className?: string }) {
  return shop.logoUrl ? (
    <img src={shop.logoUrl} alt="" className={cn('size-8 rounded-md object-cover', className)} />
  ) : (
    <span
      aria-hidden
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-md bg-secondary font-display text-sm',
        className,
      )}
    >
      {shop.name.charAt(0).toUpperCase()}
    </span>
  );
}

/**
 * The bottom-left switcher: which shop the screens act on. Lists every shop the user owns or
 * barbers in, then the ways to add one.
 */
export function WorkspaceSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const { workspaces, active, select } = useActiveWorkspace();
  if (!active) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto w-full justify-start gap-3 rounded-lg border border-sidebar-border px-3 py-2 text-left"
          aria-label={`Barbearia atual: ${active.shop.name}. Trocar de barbearia`}
        >
          <ShopMark shop={active.shop} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">{active.shop.name}</span>
            <span className="truncate text-xs text-muted-foreground">{roleLabel(active)}</span>
          </span>
          <ChevronsUpDown className="text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-64">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Suas barbearias
        </DropdownMenuLabel>
        {workspaces.map((workspace) => {
          const current = workspace.shop.id === active.shop.id;
          return (
            <DropdownMenuItem
              key={workspace.shop.id}
              aria-current={current ? 'true' : undefined}
              onSelect={() => {
                select(workspace.shop.id);
                onNavigate?.();
              }}
              className="gap-3"
            >
              <ShopMark shop={workspace.shop} className="size-7" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">{workspace.shop.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {roleLabel(workspace)}
                </span>
              </span>
              {current && <Check aria-hidden />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/barbearias/nova" onClick={onNavigate}>
            <Plus aria-hidden /> Nova barbearia
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/convite" onClick={onNavigate}>
            <Mail aria-hidden /> Aceitar convite
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
