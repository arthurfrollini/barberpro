import { useState } from 'react';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { routes } from './routes';

export function App() {
  // created on mount, so it reads the URL of the page it renders in
  const [router] = useState(() => createBrowserRouter(routes));
  return <RouterProvider router={router} />;
}
