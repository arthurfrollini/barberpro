import type { RouteObject } from 'react-router';
import { SignInPage } from '@/features/auth/pages/sign-in-page';
import { SignUpPage } from '@/features/auth/pages/sign-up-page';
import { Landing, RedirectIfSignedIn, RequireAuth, RequireRole } from './guards';
import { AppLayout } from './layout/app-layout';
import { NotFound } from './not-found-page';
import { PlaceholderPage } from './placeholder-page';

export const routes: RouteObject[] = [
  {
    element: <RedirectIfSignedIn />,
    children: [
      { path: '/entrar', element: <SignInPage /> },
      { path: '/criar-conta', element: <SignUpPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      { path: '/', element: <Landing /> },
      {
        element: <AppLayout />,
        children: [
          {
            element: <RequireRole role="barber" />,
            children: [
              { path: '/agenda', element: <PlaceholderPage title="Agenda" /> },
              { path: '/horarios', element: <PlaceholderPage title="Horários" /> },
              { path: '/servicos', element: <PlaceholderPage title="Serviços" /> },
            ],
          },
          {
            element: <RequireRole role="owner" />,
            children: [{ path: '/equipe', element: <PlaceholderPage title="Equipe" /> }],
          },
          // an owner edits the shop here; anyone else creates one from "Começar"
          { path: '/barbearia', element: <PlaceholderPage title="Barbearia" /> },
          { path: '/perfil', element: <PlaceholderPage title="Perfil" /> },
          { path: '/comecar', element: <PlaceholderPage title="Começar" /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
];
