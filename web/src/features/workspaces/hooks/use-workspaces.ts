import { useQuery } from '@tanstack/react-query';
import { useCallback, useSyncExternalStore } from 'react';
import { useMe } from '@/features/auth/hooks/use-auth';
import { fetchWorkspaces } from '../api/workspaces';
import { choose, readChoice, subscribeChoice } from '../lib/choice';
import { pickActive, type Workspace } from '../lib/workspaces';

export const workspacesKey = ['workspaces'] as const;

export function useWorkspaces() {
  return useQuery({ queryKey: workspacesKey, queryFn: fetchWorkspaces });
}

/** The workspaces and the one the screens act on in this tab; `select` switches it. */
export function useActiveWorkspace() {
  const query = useWorkspaces();
  // the choice is per user: someone else signing in on this browser starts fresh. Until the
  // user is known the choice cannot be read, so the workspaces count as still loading;
  // otherwise the screens open on the default shop for a moment and fetch its data
  const me = useMe();
  const userId = me.data?.id ?? '';
  const chosen = useSyncExternalStore(subscribeChoice, () => readChoice(userId));
  const select = useCallback((shopId: string) => choose(userId, shopId), [userId]);
  const known = query.data && me.data;
  return {
    ...query,
    isPending: query.isPending || me.isPending,
    isError: query.isError || me.isError,
    error: query.error ?? me.error,
    refetch: () => Promise.all([query.refetch(), me.refetch()]),
    workspaces: query.data ?? [],
    active: known ? pickActive(query.data, chosen) : null,
    select,
  };
}

/**
 * For pages behind the role guards, which only render once the active workspace exists and
 * has the role the page needs.
 */
export function useCurrentWorkspace(): Workspace {
  const { active } = useActiveWorkspace();
  if (!active) throw new Error('useCurrentWorkspace outside the workspace guards');
  return active;
}

/** The active workspace's barber profile; for barber pages. */
export function useCurrentBarber() {
  const workspace = useCurrentWorkspace();
  if (!workspace.barber) throw new Error('useCurrentBarber outside RequireRole barber');
  return { barber: workspace.barber, shop: workspace.shop };
}
