import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router';
import { returnPath } from '@/features/auth/components/return-path';
import { useIsSignedIn } from '@/features/auth/hooks/use-auth';
import { useActiveWorkspace } from '@/features/workspaces/hooks/use-workspaces';
import { landingPath, type Workspace } from '@/features/workspaces/lib/workspaces';
import { session } from '@/shared/api';
import { ErrorState, PageSkeleton } from '@/shared/ui/states';

export function RequireAuth() {
  const signedIn = useIsSignedIn();
  const { pathname, search } = useLocation();
  if (!signedIn) {
    const back = session.signedOutOnPurpose()
      ? ''
      : `?voltar=${encodeURIComponent(pathname + search)}`;
    return <Navigate to={`/entrar${back}`} replace />;
  }
  return <Outlet />;
}

/** The sign-in pages: once signed in, go back to the page that asked for it (or home). */
export function RedirectIfSignedIn() {
  const [search] = useSearchParams();
  return useIsSignedIn() ? <Navigate to={returnPath(search)} replace /> : <Outlet />;
}

function WithWorkspace({ children }: { children: (active: Workspace | null) => ReactNode }) {
  const workspaces = useActiveWorkspace();
  if (workspaces.isPending) return <PageSkeleton />;
  if (workspaces.isError) {
    return <ErrorState error={workspaces.error} onRetry={() => workspaces.refetch()} />;
  }
  return children(workspaces.active);
}

/** `/` has no page of its own: it sends each user to where they work in the active shop. */
export function Landing() {
  return <WithWorkspace>{(active) => <Navigate to={landingPath(active)} replace />}</WithWorkspace>;
}

/**
 * Pages for one role in the active shop; anyone else goes to their landing page. Switching
 * shops keeps the page when the new shop allows it.
 */
export function RequireRole({ role }: { role: 'barber' | 'owner' }) {
  return (
    <WithWorkspace>
      {(active) =>
        (role === 'barber' ? active?.barber : active?.owner) ? (
          <Outlet />
        ) : (
          <Navigate to={landingPath(active)} replace />
        )
      }
    </WithWorkspace>
  );
}
