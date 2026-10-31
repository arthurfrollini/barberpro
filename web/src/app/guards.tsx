import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useIsSignedIn } from '@/features/auth/hooks/use-auth';
import { landingPath, useRoles } from '@/features/roles/hooks/use-roles';
import { ErrorState, PageSkeleton } from '@/shared/ui/states';

export function RequireAuth() {
  const signedIn = useIsSignedIn();
  const { pathname, search } = useLocation();
  if (!signedIn) {
    return <Navigate to={`/entrar?voltar=${encodeURIComponent(pathname + search)}`} replace />;
  }
  return <Outlet />;
}

export function RedirectIfSignedIn() {
  return useIsSignedIn() ? <Navigate to="/" replace /> : <Outlet />;
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
