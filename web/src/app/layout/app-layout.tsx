import { Menu } from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet } from 'react-router';
import { NotificationBell } from '@/features/notifications/components/notification-bell';
import { WorkspaceSwitcher } from '@/features/workspaces/components/workspace-switcher';
import { useActiveWorkspace } from '@/features/workspaces/hooks/use-workspaces';
import type { Workspace } from '@/features/workspaces/lib/workspaces';
import { Button } from '@/shared/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/shared/ui/sheet';
import { ErrorState, PageSkeleton } from '@/shared/ui/states';
import { AccountMenu } from './account-menu';
import { MainNav } from './nav';

function Brand() {
  return (
    <Link to="/" className="block rounded-md focus-visible:ring-2 focus-visible:ring-ring">
      <img src="/wordmark.svg" alt="BarberPro" className="mx-auto w-36" />
    </Link>
  );
}

/** Logo on top, the pages in the middle, the shop switcher at the bottom. */
function Sidebar({ active, onNavigate }: { active: Workspace | null; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-8">
      <Brand />
      <MainNav active={active} onNavigate={onNavigate} />
      <div className="mt-auto">
        <WorkspaceSwitcher onNavigate={onNavigate} />
      </div>
    </div>
  );
}

function MobileMenu({ active }: { active: Workspace | null }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-sidebar p-5">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">Páginas da dashboard</SheetDescription>
        <Sidebar active={active} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

export function AppLayout() {
  const workspaces = useActiveWorkspace();
  const ready = !workspaces.isPending && !workspaces.isError;
  return (
    <div className="min-h-svh md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-svh border-r border-sidebar-border bg-sidebar p-5 md:block">
        {ready && <Sidebar active={workspaces.active} />}
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur md:px-8">
          {ready && <MobileMenu active={workspaces.active} />}
          <img src="/wordmark.svg" alt="" className="h-8 md:hidden" />
          {workspaces.active && (
            <span className="truncate text-sm text-muted-foreground md:hidden">
              {workspaces.active.shop.name}
            </span>
          )}
          <div className="flex-1" />
          <NotificationBell />
          <AccountMenu />
        </header>
        <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
          {workspaces.isPending ? (
            <PageSkeleton />
          ) : workspaces.isError ? (
            <ErrorState error={workspaces.error} onRetry={() => workspaces.refetch()} />
          ) : (
            // remounted per shop, so no page keeps state from the previous one
            <Outlet key={workspaces.active?.shop.id ?? 'none'} />
          )}
        </main>
      </div>
    </div>
  );
}
