import { Menu } from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet } from 'react-router';
import type { Roles } from '@/features/roles/api/roles';
import { currentShop, useRoles } from '@/features/roles/hooks/use-roles';
import { Button } from '@/shared/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/shared/ui/sheet';
import { ErrorState, PageSkeleton } from '@/shared/ui/states';
import { AccountMenu } from './account-menu';
import { MainNav } from './nav';

function Brand({ roles }: { roles: Roles }) {
  const shop = currentShop(roles);
  return (
    <Link to="/" className="block rounded-md focus-visible:ring-2 focus-visible:ring-ring">
      <img src="/wordmark.svg" alt="BarberPro" className="mx-auto w-36" />
      {shop && (
        <p className="mt-3 truncate text-center text-sm text-muted-foreground">{shop.name}</p>
      )}
    </Link>
  );
}

function MobileMenu({ roles }: { roles: Roles }) {
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
        <div className="mb-6 px-6">
          <Brand roles={roles} />
        </div>
        <MainNav roles={roles} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

export function AppLayout() {
  const roles = useRoles();
  return (
    <div className="min-h-svh md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden border-r border-sidebar-border bg-sidebar p-5 md:flex md:flex-col md:gap-8">
        {roles.data && (
          <>
            <Brand roles={roles.data} />
            <MainNav roles={roles.data} />
          </>
        )}
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur md:px-8">
          {roles.data && <MobileMenu roles={roles.data} />}
          <img src="/wordmark.svg" alt="" className="h-8 md:hidden" />
          <div className="flex-1" />
          <AccountMenu />
        </header>
        <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
          {roles.isPending ? (
            <PageSkeleton />
          ) : roles.isError ? (
            <ErrorState error={roles.error} onRetry={() => roles.refetch()} />
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
