<p align="center">
  <img src="docs/assets/logo.svg" alt="BarberPro" width="360" />
</p>

# BarberPro API

A GraphQL API for booking barbershop appointments. Customers find shops near them, pick a barber and a service, and book a time that fits. Each barber sets their own services, prices, durations and weekly hours. The shop owner invites barbers by email.

This is a rewrite of a 2021 Express project (kept under the [`v2021`](https://github.com/arthurfrollini/barberpro/tree/v2021) tag) in TypeScript, with a hexagonal architecture and the booking rules enforced by both the domain and the database.

## Status

| Phase | Scope                                                                    | State   |
| ----- | ------------------------------------------------------------------------ | ------- |
| 1     | Skeleton, Docker Compose, CI, auth (sign up, sign in, refresh, me)       | done    |
| 2     | Barbershops (nearby, search), uploads, invites, barbers, services        | done    |
| 3     | Weekly schedules, days off, available slots, booking, cancel, reschedule | next    |
| 4     | Notifications: email queue, reminders, live agenda subscription          | planned |

The design is in [`docs/superpowers/specs`](docs/superpowers/specs/2026-10-30-barberpro-api-design.md) and each phase has its plan in [`docs/superpowers/plans`](docs/superpowers/plans).

## Stack

- Node 24, TypeScript (strict, ESM)
- Fastify 5 with GraphQL Yoga mounted on `/graphql`; SDL files plus GraphQL Code Generator for typed resolvers
- PostgreSQL 17 with PostGIS, TypeORM with hand-written migrations
- Redis (BullMQ queues and subscription pub/sub, from phase 4)
- argon2id passwords, HS256 access tokens, rotating refresh tokens
- Vitest (unit, integration, end to end), ESLint, Prettier, GitHub Actions
- Docker Compose with Mailpit to catch email in development

## Running it

```bash
cp .env.example .env
docker compose up
```

That starts Postgres, Redis, Mailpit and the API, runs the migrations and reloads on file changes. GraphiQL is at http://localhost:4000/graphql and Mailpit at http://localhost:8025.

To run the API on the host instead, start only the services:

```bash
docker compose up -d postgres redis mailpit
npm install
npm run migration:run
npm run dev
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

An owner creates the shop and invites barbers by email; the invite email carries a code for `acceptInvite`. Logos and avatars go to `POST /uploads` (multipart, JPEG/PNG/WebP up to 2 MB), which returns the id to pass as `logoFileId` or `avatarFileId`.

Errors carry a stable code in `extensions.code` (`EMAIL_TAKEN`, `INVALID_CREDENTIALS`, `UNAUTHENTICATED`, ...). The codes each operation can return are listed in its SDL description.

## Architecture

```
 GraphQL (Yoga) · REST (/health, uploads)  driving adapters
              │
   application: use cases + ports          signUp, refreshSession, ...
              │
   domain: entities, value objects          User, Email; no framework imports
              ▲
   driven adapters implement the ports      TypeORM repositories, argon2, jose, clock
```

Code is grouped by module (`src/modules/identity`, `shops`, later `scheduling` and `notifications`), each with `domain/`, `application/` and `adapters/`. ESLint fails the build if domain or application code imports Fastify, GraphQL, TypeORM or an adapter. TypeORM decorators live only on the `*Record` classes in `adapters/persistence`, and a mapper turns each record into its domain class. `src/container.ts` wires every adapter by hand.

The reasons behind the main choices are in [`docs/adr`](docs/adr).

## Tests

```bash
npm run test:unit         # domain and use cases, in-memory adapters, fixed clock
npm run test:integration  # repositories and migrations against Postgres
npm run test:e2e          # GraphQL operations through the HTTP app
npm test                  # all three
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
