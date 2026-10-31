import type { RouteObject } from 'react-router';
import { AgendaPage } from '@/features/agenda/pages/agenda-page';
import { SchedulePage } from '@/features/schedule/pages/schedule-page';
import { ServicesPage } from '@/features/services/pages/services-page';
import { SignInPage } from '@/features/auth/pages/sign-in-page';
import { SignUpPage } from '@/features/auth/pages/sign-up-page';
import { Landing, RedirectIfSignedIn, RequireAuth, RequireRole } from './guards';
import { AppLayout } from './layout/app-layout';
import { NotFound } from './not-found-page';
import { PlaceholderPage } from './placeholder-page';
import { RouteError } from './route-error';

export const routes: RouteObject[] = [
  {
    // one boundary for every screen: a render error shows a Portuguese page, not a blank one
    errorElement: <RouteError />,
    children: [
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
                  { path: '/agenda', element: <AgendaPage /> },
                  { path: '/horarios', element: <SchedulePage /> },
                  { path: '/servicos', element: <ServicesPage /> },
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
    ],
  },
];
