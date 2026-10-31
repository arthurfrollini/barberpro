import type { RouteObject } from 'react-router';
import { AgendaPage } from '@/features/agenda/pages/agenda-page';
import { ProfilePage } from '@/features/profile/pages/profile-page';
import { ShopPage } from '@/features/shop/pages/shop-page';
import { TeamPage } from '@/features/team/pages/team-page';
import { SchedulePage } from '@/features/schedule/pages/schedule-page';
import { ServicesPage } from '@/features/services/pages/services-page';
import { AcceptInvitePage } from '@/features/invites/pages/accept-invite-page';
import { StartPage } from '@/features/onboarding/pages/start-page';
import { SignInPage } from '@/features/auth/pages/sign-in-page';
import { SignUpPage } from '@/features/auth/pages/sign-up-page';
import { Landing, RedirectIfSignedIn, RequireAuth, RequireRole } from './guards';
import { AppLayout } from './layout/app-layout';
import { NotFound } from './not-found-page';
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
                // a crash inside a page keeps the navigation around it
                errorElement: <RouteError inline />,
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
                    children: [
                      { path: '/barbearia', element: <ShopPage /> },
                      { path: '/equipe', element: <TeamPage /> },
                    ],
                  },
                  { path: '/perfil', element: <ProfilePage /> },
                  { path: '/comecar', element: <StartPage /> },
                  { path: '/convite', element: <AcceptInvitePage /> },
                ],
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
];
