import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router';
import { returnPath } from '@/features/auth/components/return-path';
import { useIsSignedIn } from '@/features/auth/hooks/use-auth';
import { landingPath, useRoles } from '@/features/roles/hooks/use-roles';
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

function WithRoles({
  children,
}: {
  children: (roles: NonNullable<ReturnType<typeof useRoles>['data']>) => ReactNode;
}) {
  const roles = useRoles();
  if (roles.isPending) return <PageSkeleton />;
  if (roles.isError) return <ErrorState error={roles.error} onRetry={() => roles.refetch()} />;
  return children(roles.data);
}

/** `/` has no page of its own: it sends each user to where they work. */
export function Landing() {
  return <WithRoles>{(roles) => <Navigate to={landingPath(roles)} replace />}</WithRoles>;
}

/** Pages for one role; anyone else goes to their own landing page. */
export function RequireRole({ role }: { role: 'barber' | 'owner' }) {
  return (
    <WithRoles>
      {(roles) =>
        (role === 'barber' ? roles.barber : roles.shop) ? (
          <Outlet />
        ) : (
          <Navigate to={landingPath(roles)} replace />
        )
      }
    </WithRoles>
  );
}
