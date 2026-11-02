import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { session } from '@/shared/api';
import { Toaster } from '@/shared/ui/sonner';
import { TooltipProvider } from '@/shared/ui/tooltip';

/**
 * Whatever is cached belongs to the user who was signed in. When the session ends, from this
 * tab, another tab or an expired refresh token, forget it before anyone else signs in.
 */
function useForgetDataOnSignOut(queryClient: QueryClient) {
  useEffect(
    () =>
      session.subscribe((current) => {
        if (!current) queryClient.clear();
      }),
    [queryClient],
  );
}

export function Providers({
  queryClient,
  children,
}: {
  queryClient: QueryClient;
  children: ReactNode;
}) {
  useForgetDataOnSignOut(queryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {children}
        <Toaster position="top-center" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
