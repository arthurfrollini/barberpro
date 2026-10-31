import { useState } from 'react';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { onSessionExpired } from '@/shared/api';
import { createQueryClient } from '@/shared/api/query-client';
import { Providers } from './providers';
import { routes } from './routes';

export function App() {
  // created on mount, so the router reads the URL of the page it renders in
  const [router] = useState(() => createBrowserRouter(routes));
  const [queryClient] = useState(() => {
    const client = createQueryClient();
    // the guards see the cleared session and send the user to sign in
    onSessionExpired(() => client.clear());
    return client;
  });
  return (
    <Providers queryClient={queryClient}>
      <RouterProvider router={router} />
    </Providers>
  );
}
