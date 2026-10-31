import { useState } from 'react';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { createQueryClient } from '@/shared/api/query-client';
import { Providers } from './providers';
import { routes } from './routes';

export function App() {
  // created on mount, so the router reads the URL of the page it renders in
  const [router] = useState(() => createBrowserRouter(routes));
  const [queryClient] = useState(() => createQueryClient());
  return (
    <Providers queryClient={queryClient}>
      <RouterProvider router={router} />
    </Providers>
  );
}
