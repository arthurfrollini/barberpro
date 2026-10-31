# BarberPro dashboard v1: design

Date: 2026-10-31. Status: Arthur set the stack and left the rest to Claude ("deixo pela sua criatividade"); everything not listed under "Decisions Arthur made" is Claude's call, for him to review on the PRs.

## Why

The API (phases 1 to 4) has no client yet. The dashboard is the barber's and the owner's tool: the barber checks the day's appointments between cuts and keeps services and hours up to date; the owner keeps the shop page and the team. It is also the portfolio proof for a modern React front end: feature-based code, server state in TanStack Query, typed GraphQL, forms with validation, real-time updates and tests at three levels.

Success: a barber can sign up, set up a shop (or accept an invite), configure services and hours, and then watch bookings land on the agenda live, cancel or move them, all from a phone propped by the mirror or a laptop at the counter.

## Decisions Arthur made

- Vite SPA, React, React Hook Form, TanStack Query.
- Feature-based folders, with hooks and API calls kept in separate files.
- Radix through shadcn/ui for the components that need them.
- Playwright for end-to-end tests, testing-library for component tests.
- First screen for a barber: their appointments.

## Calls made by Claude

- **Where**: `web/` in the same repository, with its own `package.json`. The GraphQL schema is read straight from the API's SDL files, so codegen and CI catch a schema change that breaks the dashboard in the same PR.
- **Test runner**: Vitest, not Jest. Same `describe/it/expect` API that testing-library documents, but it runs through Vite's own transform (TypeScript, JSX, `import.meta.env`, path aliases) with no Babel or ts-jest setup, and the API already uses it. Swapping to Jest later changes config, not tests.
- **Network in component tests**: MSW intercepts `fetch`, so tests exercise the real API client and hooks.
- **Router**: React Router in data mode (`createBrowserRouter`). Paths in Portuguese, since users see them (`/agenda`, `/horarios`).
- **GraphQL client**: no Apollo or urql. A ~60-line `fetch` client plus GraphQL Code Generator's client preset in string mode: each operation is a typed string, results and variables are inferred, and no GraphQL runtime ships to the browser. TanStack Query owns caching.
- **Subscriptions**: `graphql-sse` client against Yoga's SSE endpoint (distinct connections mode), sending the bearer token as a header. Each event invalidates the agenda and notification queries and shows a toast.
- **Session**: the API returns tokens in the response body, so the dashboard keeps the session (access token, its expiry, refresh token) in `localStorage`, shared by all tabs. Refresh tokens are single use with reuse detection, so two tabs refreshing at once would sign the user out; refreshes run under a Web Lock and re-read storage first. Trade-off recorded in an ADR: an httpOnly cookie would keep tokens away from scripts, at the cost of changing the API's auth and adding CSRF handling. Not worth it for v1.
- **Error copy**: the API's messages are English. The dashboard maps `extensions.code` to Portuguese messages and falls back to a generic one.
- **Language**: interface in pt-BR, code in English. Money shown as `R$ 50,00`, times in the shop's time zone.
- **Dev setup**: Vite proxies `/graphql`, `/uploads` and `/files` to the API, so the browser sees one origin and the API needs no CORS. Port 5180 (5173 is often taken). A `web` service joins `docker compose up`.
- **End-to-end tests** run against the real API, worker, Postgres, Redis and Mailpit (the invite code is read from Mailpit's API). Each test signs up fresh users with unique emails, so no cleanup is needed.

## API changes the dashboard needs

Small additions, each with tests in the API's own suites:

1. `rescheduleSlots(appointmentId: ID!, date: String!): [DateTime!]!`: free start times for moving an appointment, using its own duration and ignoring its current slot. `availableSlots` cannot do this: the appointment does not expose its service, the service may be archived since, and the appointment's own slot counts as busy.
2. The invite email gains a link to the dashboard (`DASHBOARD_URL/convite?codigo=...`), next to the code it already carries. `DASHBOARD_URL` defaults to `http://localhost:5180`.

## Who sees what

Roles come from data (`myBarberProfile`, `myBarbershop`), as in the API.

| User | Lands on | Navigation |
| --- | --- | --- |
| Barber | Agenda | Agenda, Horários, Serviços, Perfil |
| Owner who also barbers | Agenda | the above plus Barbearia, Equipe |
| Owner who does not barber | Barbearia | Barbearia, Equipe, and "Atender também" (`becomeBarber`) |
| Neither | Começar | create a shop, or enter an invite code |

The header carries the notification bell (unread count, latest notifications, mark as read) and the account menu (sign out).

## Screens

- **Entrar / Criar conta**: email and password; sign up adds a name. Errors inline.
- **Começar**: two choices: "Tenho uma barbearia" (opens the shop form) and "Recebi um convite" (code field). The invite link from the email opens `/convite?codigo=...` with the code filled in; signed-out users go through sign in first and come back.
- **Agenda** (the barber's home): one day at a time, today by default, with previous/next day and a date picker. A vertical timeline from the earliest to the latest working hour of that weekday (08:00 to 20:00 when the day has no hours), hour marks on the left, appointments as blocks sized by duration, canceled ones dimmed, and a line at the current time on today. A summary row: number of appointments and the day's total in BRL (booked only). Clicking an appointment opens a side sheet with the customer, service, price, time, reminder and status, plus two actions:
  - **Cancelar**: confirmation dialog; disabled with an explanation when the start is less than 2 hours away.
  - **Remarcar**: pick a date, then one of the `rescheduleSlots`; same 2-hour rule.
  - The agenda updates live; a toast says what changed ("Novo agendamento: Ana às 14:00").
- **Horários**: weekly hours as seven rows (Domingo to Sábado), each with zero or more intervals (start and end times, add and remove). A day with no interval reads "Folga". Saving explains the rule up front (appointments 2 hours or more away that fall outside the new hours are canceled and the customers notified) and, after saving, lists any appointments it canceled. Below: days off, with a date field to add one (confirmation with the same rule) and a list to remove them.
- **Serviços**: list with name, description, price and duration; create and edit in a dialog (price typed as reais, duration 5 to 480 in steps of 5); archive with confirmation ("Clientes não poderão mais agendar; agendamentos já feitos continuam").
- **Perfil**: the user's name; for barbers, bio and photo (upload, preview, remove).
- **Barbearia** (owner): create or edit the shop: name, description, year founded, address, latitude and longitude (with a "Usar minha localização" button; there is no geocoding), time zone, logo upload.
- **Equipe** (owner): active barbers with a remove action (confirmation explains that their future appointments 2 hours or more away are canceled); invites with status (pendente, aceito, revogado, expirado), an email field to invite, and revoke for pending ones.

Every query screen has designed loading (skeletons), empty and error states. Every mutation disables its button while running and reports success or the mapped error.

## Visual direction

The logo sets the palette: deep plum-grey `#312E38` as the base, `#FF9000` orange as the single accent, `#F4EDE8` warm off-white text, `#999591` grey for secondary text, with two derived surfaces (`#28262E` for chrome, `#3E3B47` for raised surfaces and inputs). Dark by default, because it is the brand's own ground, not a dashboard habit; no light theme in v1.

Type: Roboto Slab, the logo's family of slab letters and the voice of old barbershop signage, for headings and the agenda's hour numerals; Archivo for interface text. Both self-hosted through Fontsource.

The memorable element is the agenda timeline: big slab hours down the left edge, blocks in the plum surface with an orange edge for booked appointments, and the orange current-time line. Everything else stays quiet: one radius scale, no gradients, no card grids for their own sake. Layout: a left sidebar on wide screens, a top bar with a menu sheet on phones; content left-aligned with a readable max width.

## Code shape

```
web/src/
  app/          providers, router, layout shell, route guards
  features/
    auth/       api/ (operations + request functions), hooks/, components/, pages/
    agenda/ schedule/ services/ profile/ shop/ team/ invites/ notifications/
  shared/
    api/        fetch client, errors, uploads, session store, SSE client
    ui/         shadcn components
    lib/        cn, money, time-zone helpers, error messages
  gql/          generated by codegen (committed, checked in CI)
```

Rules: pages compose components; components call hooks; hooks wrap TanStack Query around the feature's request functions; request functions are the only code that talks to the network. A feature imports another feature only through its hooks.

## Tests

- **Unit and component** (Vitest, jsdom, testing-library, MSW): session refresh and the cross-tab lock, the API client's error mapping, money and time formatting, each form's validation and error display, agenda layout maths, and each screen's main path with mocked responses.
- **End to end** (Playwright, Chromium): sign up and create a shop; become a barber, set hours, add a service; a customer books through the API and the booking appears on the agenda without a reload; cancel it; invite a barber, read the code from Mailpit, accept it in a second browser context.
- **CI**: a `web` job (codegen diff, lint, typecheck, format, unit tests, build) and a `web-e2e` job with the services.

## Delivery

Four PRs, stacked on the API's PR #4:

1. **Skeleton and auth**: Vite app, theme, shadcn, router, query client, GraphQL client and codegen, session, sign in and up, app shell and route guards, test setup, Playwright harness, CI, Docker Compose, docs.
2. **Agenda**: `rescheduleSlots` in the API, agenda timeline, appointment sheet, cancel, reschedule, live updates, notifications.
3. **Barber setup**: weekly hours, days off, services, profile with photo.
4. **Owner**: onboarding, shop form with logo, team, invites, accept invite, invite link in the email.

Docs: a README section, ADRs for the dashboard's place and for the session storage, and Portuguese study notes in `learning/` (front-end architecture, TanStack Query, forms, front-end tests, real time on the client, design system).

## Non-goals (v1)

Customer booking UI (that is the mobile app), the owner seeing other barbers' agendas, light theme, i18n, offline mode, push notifications, analytics, deploy.

## Anti-goals

A component library showcase, a global state library next to TanStack Query, or abstractions over the request layer beyond what the screens use.
