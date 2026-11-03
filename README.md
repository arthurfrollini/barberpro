<p align="center">
  <img src="docs/assets/logo.svg" alt="BarberPro" width="360" />
</p>

# BarberPro

A GraphQL API for booking barbershop appointments, and the dashboard barbers and shop owners use to run their day. Customers find shops near them, pick a barber and a service, and book a time that fits. Each barber sets their own services, prices, durations and weekly hours. Owners invite barbers by email.

A person can own several shops and work in several, with a separate profile (services, prices, hours) in each, and is never booked in two places at once.

This is a rewrite of a 2021 Express project (kept under the [`v2021`](https://github.com/arthurfrollini/barberpro/tree/v2021) tag) in TypeScript, with a hexagonal architecture and the booking rules enforced by both the domain and the database.

## Status

| Phase | Scope                                                                    | State |
| ----- | ------------------------------------------------------------------------ | ----- |
| 1     | Skeleton, Docker Compose, CI, auth (sign up, sign in, refresh, me)       | done  |
| 2     | Barbershops (nearby, search), uploads, invites, barbers, services        | done  |
| 3     | Weekly schedules, days off, available slots, booking, cancel, reschedule | done  |
| 4     | Notifications: email queue, reminders, live agenda subscription          | done  |
| Web 1 | Dashboard skeleton: sign in and up, session, role-based navigation       | done  |
| Web 2 | Agenda: day timeline, cancel, reschedule, live updates, notifications    | done  |
| Web 3 | Barber setup: weekly hours, days off, services, profile                  | done  |
| Web 4 | Owner: getting started, shop page, team, invites                         | done  |
| V2    | Many shops per owner and per barber, shop switcher in the dashboard      | done  |

The designs are in [`docs/superpowers/specs`](docs/superpowers/specs) (API, dashboard, V2) and each phase has its plan in [`docs/superpowers/plans`](docs/superpowers/plans). Study notes in Portuguese, including a walk through [every piece of the stack](learnings/Stack.md), are in [`learnings/`](learnings/README.md).

## Stack

- Node 24, TypeScript (strict, ESM)
- Fastify 5 with GraphQL Yoga mounted on `/graphql`; SDL files plus GraphQL Code Generator for typed resolvers
- PostgreSQL 17 with PostGIS, TypeORM with hand-written migrations
- Redis: BullMQ queues (email, reminders) and pub/sub for GraphQL subscriptions
- argon2id passwords, HS256 access tokens, rotating refresh tokens
- Vitest (unit, integration, end to end), ESLint, Prettier, GitHub Actions
- Docker Compose with Mailpit to catch email in development

## Running it

```bash
cp .env.example .env
docker compose up
```

That starts Postgres, Redis, Mailpit, the API, the worker (email and reminders) and the dashboard, runs the migrations and reloads on file changes. The dashboard is at http://localhost:5180, GraphiQL at http://localhost:4000/graphql and Mailpit at http://localhost:8025.

To run the API on the host instead, start only the services:

```bash
docker compose up -d postgres redis mailpit
npm install
npm run migration:run
npm run dev          # the API
npm run dev:worker   # email and reminders, in another terminal
```

## Example

```graphql
mutation {
  signUp(input: { name: "Ana", email: "ana@example.com", password: "correct horse" }) {
    accessToken
    refreshToken
    user {
      id
      name
    }
  }
}
```

Then send `Authorization: Bearer <accessToken>`:

```graphql
{
  me {
    id
    name
    email
    createdAt
  }
}
```

Anyone can browse, without a token:

```graphql
{
  barbershopsNearby(latitude: -23.5614, longitude: -46.6559, radiusKm: 5) {
    distanceKm
    barbershop {
      name
      yearsActive
      barbers {
        name
        services {
          name
          priceCents
          durationMinutes
        }
      }
    }
  }
}
```

Owners and barbers act on a shop or a barber profile by id: `myBarbershops` lists the shops the user owns and `myBarberProfiles` the profiles they work as, one per shop.

```graphql
mutation {
  createBarbershop(
    input: {
      name: "Mega Barbearia"
      foundedYear: 2012
      address: "Av. Paulista, 1000"
      latitude: -23.5614
      longitude: -46.6559
    }
  ) {
    id
  }
}

mutation {
  becomeBarber(shopId: "…") {
    id
  }
}

mutation {
  createService(barberId: "…", input: { name: "Corte", priceCents: 5000, durationMinutes: 30 }) {
    id
  }
}
```

Owners invite barbers by email (`inviteBarber(shopId, email)`); the email links to the dashboard (`DASHBOARD_URL/convite?codigo=...`) and also carries the code for `acceptInvite`. A barber can accept invites from several shops. Logos and avatars go to `POST /uploads` (multipart, JPEG/PNG/WebP up to 2 MB), which returns the id to pass as `logoFileId` or `avatarFileId`.

Booking takes one of the times `availableSlots` returns (every 15 minutes, in UTC):

```graphql
{
  availableSlots(barberId: "…", serviceId: "…", date: "2026-11-02")
}

mutation {
  bookAppointment(
    input: {
      barberId: "…"
      serviceId: "…"
      startsAt: "2026-11-02T14:00:00-03:00"
      reminderLeadMinutes: 15
    }
  ) {
    id
    startsAt
    endsAt
    priceCents
  }
}
```

Customers and barbers can cancel or reschedule up to 2 hours before. Barbers set weekly hours (`setWeeklySchedule(barberId, ...)`, `HH:MM` in the shop's time zone) and block days (`blockDate(barberId, date)`), per shop. Both cancel the booked appointments 2 or more hours away that no longer fit, and return them. A barber who works in two shops is never offered, or booked, at both at the same time: availability counts their bookings everywhere, and an exclusion constraint in Postgres refuses the overlap under concurrency ([ADR 7](docs/adr/0007-many-shops-per-person.md)).

Each booking, cancellation and reschedule notifies the other party (`notifications`, plus the same text by email through the worker) and schedules the customer's reminder. Barbers can watch their agenda live:

```graphql
subscription {
  agendaChanged(barberId: "…") {
    type
    previousStartsAt
    appointment {
      startsAt
      serviceName
      customer {
        name
      }
    }
  }
}
```

Errors carry a stable code in `extensions.code` (`EMAIL_TAKEN`, `INVALID_CREDENTIALS`, `UNAUTHENTICATED`, ...). The codes each operation can return are listed in its SDL description.

## Dashboard

`web/` is a React single-page app for barbers and owners, in Portuguese. It reads the API's SDL files to type every operation, so a schema change that breaks it fails CI in the same PR ([ADR 5](docs/adr/0005-dashboard-in-the-same-repo.md)).

What it does:

- **Agenda:** the barber's day on a timeline in the shop's time zone. Cancel or move a booking (within the 2-hour rule), and see new bookings arrive live over SSE.
- **Horários, Serviços, Perfil:** weekly hours with breaks, days off, services with price and length, photo and bio.
- **Barbearia, Equipe:** the shop page with logo and location, invites by email (the link opens the dashboard with the code filled in), and removing barbers.
- **Começar:** a new user creates their shop or accepts an invite.
- **Shop switcher** (bottom left): every shop the user owns or works in, with their role there; every screen acts on the active one. New shops and invites are one click away.
- A notification bell, and every screen in Portuguese.

- Vite, React 19, React Router, TanStack Query, React Hook Form with zod, Tailwind and shadcn/ui (Radix)
- GraphQL Code Generator's client preset: typed string documents and a small `fetch` client, no Apollo
- Feature folders, each with `api/` (operations and request functions), `hooks/` (TanStack Query), `components/` and `pages/`; only `shared/api` calls `fetch`
- The session is shared by all tabs, and refreshes are serialized with a Web Lock because the API's refresh tokens are single use ([ADR 6](docs/adr/0006-session-in-local-storage.md))
- Vitest with Testing Library and MSW for components; Playwright against the real API for end to end

```bash
cd web
npm install
npm run dev        # http://localhost:5180, proxying the API on :4000
npm run check      # lint, typecheck, format, unit and component tests
npm run test:coverage  # the same tests with coverage; HTML report in web/coverage
npm run test:e2e   # Playwright; needs Postgres, Redis and Mailpit from docker compose,
                   # npm install in the repo root and npx playwright install chromium
npm run codegen    # after changing an operation or the API's schema
npm run seed:demo  # with the API up: a barber with bookings today; prints the login
```

## Architecture

```
 GraphQL (Yoga) · REST (/health, uploads)  driving adapters
              │
   application: use cases + ports          signUp, refreshSession, ...
              │
   domain: entities, value objects          Appointment, WeeklySchedule; no framework imports
              ▲
   driven adapters implement the ports      TypeORM repositories, BullMQ, Redis pub/sub, SMTP, argon2, jose
```

Code is grouped by module (`src/modules/identity`, `shops`, `scheduling`, `notifications`), each with `domain/`, `application/` and `adapters/`. ESLint fails the build if domain or application code imports Fastify, GraphQL, TypeORM or an adapter. TypeORM decorators live only on the `*Record` classes in `adapters/persistence`, and a mapper turns each record into its domain class. `src/container.ts` wires every adapter by hand.

The reasons behind the main choices are in [`docs/adr`](docs/adr).

## Tests

```bash
npm run test:unit         # domain and use cases, in-memory adapters, fixed clock
npm run test:integration  # repositories and migrations against Postgres
npm run test:e2e          # GraphQL operations through the HTTP app
npm test                  # all three
npm run test:coverage     # all three with coverage; HTML report in coverage/
```

Integration and e2e tests use the `barberpro_test` database that Docker Compose creates.

## Scripts

| Script                                       | What it does                                              |
| -------------------------------------------- | --------------------------------------------------------- |
| `npm run dev`                                | API with reload (tsx)                                     |
| `npm run codegen`                            | regenerate resolver types after editing a `.graphql` file |
| `npm run migration:run` / `migration:revert` | apply or undo migrations                                  |
| `npm run lint` / `typecheck` / `format`      | static checks                                             |
| `npm run build` / `start`                    | compile to `dist` and run it                              |

## License

MIT
