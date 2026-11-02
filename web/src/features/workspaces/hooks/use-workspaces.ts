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
  // the choice is per user: someone else signing in on this browser starts fresh
  const userId = useMe().data?.id ?? '';
  const chosen = useSyncExternalStore(subscribeChoice, () => readChoice(userId));
  const select = useCallback((shopId: string) => choose(userId, shopId), [userId]);
  return {
    ...query,
    workspaces: query.data ?? [],
    active: query.data ? pickActive(query.data, chosen) : null,
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
