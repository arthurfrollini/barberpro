import { useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { fetchWorkspaces } from '../api/workspaces';
import { choose, readChoice, subscribeChoice } from '../lib/choice';
import { pickActive, type Workspace } from '../lib/workspaces';

export const workspacesKey = ['workspaces'] as const;

export function useWorkspaces() {
  return useQuery({ queryKey: workspacesKey, queryFn: fetchWorkspaces });
}

/** The workspaces and the one the screens act on; `select` switches it in every tab. */
export function useActiveWorkspace() {
  const query = useWorkspaces();
  const chosen = useSyncExternalStore(subscribeChoice, readChoice);
  return {
    ...query,
    workspaces: query.data ?? [],
    active: query.data ? pickActive(query.data, chosen) : null,
    select: choose,
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
