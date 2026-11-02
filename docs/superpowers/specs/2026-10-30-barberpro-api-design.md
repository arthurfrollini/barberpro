# BarberPro API v1: design

Date: 2026-10-30. Status: draft for Arthur's review.

## Why

BarberPro started as a 2021 course project (Express, Sequelize, Mongo, plain JS). It is being rewritten as the portfolio proof for **GraphQL** and for a **clean hexagonal architecture with tactical DDD**, in TypeScript. Arthur's other projects already prove REST (PlantCare, Finwise) and applied AI (Finwise, PlantCare), so BarberPro has no AI in v1 and only uses REST where GraphQL is the wrong tool.

Success: every choice in the repo can be explained in an interview in one or two sentences, the booking rules are enforced by the domain and by the database, and the code reads as small and deliberate, not as a framework showcase.

## Product

A marketplace of barbershops. The final product has three clients: this API, a web dashboard for barbers and owners, and a mobile app for customers (push notifications, like PlantCare). v1 is the API only. The dashboard comes next.

### Actors

- **Customer**: any signed-up user. Finds shops, books, cancels, reschedules.
- **Owner**: the user who created a barbershop. Edits the shop page and invites barbers. Can also be a barber in their own shop.
- **Barber**: a user who accepted an invite to a shop. Owns their services, prices, durations, weekly schedule and days off.

One user account covers all three roles: roles come from data (owns a shop, has a barber profile), not from a role column.

### Barbershop

A showcase page: name, logo, description, year founded ("tempo de atuação"), address and location, timezone. No business rules live here. The home screen lists shops nearest to the customer's location; customers can also search by name and book with any shop regardless of distance.

### Barber

Everything bookable belongs to the barber:
- **Services**: name, description, price, duration. José can charge R$ 50 for a 15-minute cut while João charges R$ 60 for a 30-minute cut in the same shop.
- **Weekly schedule**: per weekday, zero or more working intervals. José: 08:00-20:00. João: 10:00-12:00 and 14:00-22:00; his break is never offered to customers. A weekday with no intervals is a recurring day off (e.g. no Sundays).
- **Days off**: the barber can block a whole date.

### Booking rules

1. A service can be booked at a start time only if the whole duration fits inside one working interval of that barber's day, the date is not blocked, and it overlaps no other active appointment of that barber.
2. The appointment keeps a snapshot of the service (name, price, duration). Later changes to the service do not touch existing appointments.
3. A customer chooses a reminder lead time on the confirmation screen: 5 to 60 minutes, in steps of 5.
4. **Two-hour rule**: an appointment can be canceled or rescheduled, by the customer or by the barber, only while its start is at least 2 hours away.
5. Rescheduling is one atomic operation: the old appointment is kept if the new time is not available.
6. Blocking a day: appointments that day starting less than 2 hours from now stay (the barber attends them); every other appointment that day is canceled and its customer notified. Same rule when the barber changes the weekly schedule: future appointments starting 2+ hours from now that fall outside the new schedule are canceled with notice.
7. Removing a barber from a shop follows the same rule for that barber's future appointments.

### Invites

The owner invites a barber by email: "You were invited to join Mega Barbearia SP". The invitee signs up or logs in with that email and accepts; a barber profile is created in that shop. Invites expire after 7 days and can be revoked. Invites by phone (SMS or WhatsApp) are out of v1 because they need a paid provider.

## Decisions Arthur made

- TypeScript, TypeORM.
- GraphQL API; REST only where GraphQL is the wrong tool (health check, file upload).
- Hexagonal architecture; tactical DDD where the rules are (scheduling). No strategic DDD.
- No AI in v1. No payments in v1.
- Everything above under Product.

## Calls made by Claude (Arthur to confirm)

- **Framework**: Fastify for HTTP, GraphQL Yoga mounted on `/graphql` (built-in subscriptions over SSE and WebSocket). Composition root wired by hand, no DI container.
- **Schema**: schema-first SDL files plus GraphQL Code Generator for typed resolvers. The schema file doubles as API documentation.
- **Database**: PostgreSQL only (Mongo removed), with PostGIS for "nearest shops" and `btree_gist` for the overlap constraint. Redis for the job queue (BullMQ) and subscription pub/sub.
- **Slot step**: available start times are offered every 15 minutes.
- **Booking horizon**: up to 60 days ahead. Booking a start time in the past is rejected; there is no minimum lead time.
- **Reminder** is optional (null means no reminder). In v1 it is sent by email.
- **A customer cannot hold two overlapping appointments**, and a barber cannot book themselves.
- **Rescheduling** keeps the same barber and service; only the time changes.
- **Location**: the owner sends latitude and longitude with the address. No geocoding in v1 (it needs a paid API).
- **One shop per owner and one shop per barber** in v1.
- **Public reads**: browsing (`barbershop`, `barbershopsNearby`, `searchBarbershops`, a barber's services, `availableSlots`) needs no login, so the app can show shops before sign-up. Everything that writes or shows personal data needs a token.
- **Archived services** cannot be booked; appointments already made keep their snapshot.
- **Reschedule** moves the reminder job to the new time.
- **Money** in integer cents (BRL). **Durations** in minutes, multiple of 5, from 5 to 480.
- **Time**: instants stored as `timestamptz` in UTC. Each shop has an IANA timezone (default `America/Sao_Paulo`); weekly schedules and blocked dates are local to it.
- **Auth**: email and password (argon2), short-lived JWT access token plus rotating refresh token stored hashed, same pattern as Finwise.
- **Old code**: removed from the working tree; it stays in git history (tag `v2021` before the rewrite).

## Architecture

```
GraphQL (Yoga) / REST (Fastify)        <- driving adapters
        |
  application: use cases + ports       <- BookAppointment, CancelAppointment, ...
        |
  domain: entities, value objects,     <- Appointment, WeeklySchedule, TimeSlot, Money,
          domain errors                   ReminderLead; no framework imports
        ^
  driven adapters implement the ports  <- TypeORM repositories, BullMQ jobs,
                                          mail (SMTP), Redis pub/sub, disk storage, clock
```

- **Modules** by feature, each with `domain/`, `application/` and `adapters/`: `identity` (users, auth), `shops` (barbershops, invites, barbers, services), `scheduling` (weekly schedules, days off, availability, appointments), `notifications`.
- **Domain classes never carry ORM decorators.** TypeORM entities live in the persistence adapter; a mapper converts both ways. TypeORM `synchronize` is off; schema changes go through migrations.
- **Ports** worth naming: repositories, `Clock` (the two-hour rule is tested with a fake clock), `UnitOfWork` (transactions for reschedule, block day, schedule change, barber removal), `PasswordHasher`, `TokenService`, `Notifier`, `ReminderScheduler`, `AgendaEvents` (subscription publisher), `FileStorage`.
- **Errors**: domain errors carry a stable code (`SLOT_UNAVAILABLE`, `CANCELLATION_WINDOW_CLOSED`, `NOT_SHOP_OWNER`, ...) exposed in GraphQL `extensions.code`. Unexpected errors are logged and returned as a generic error.
- **N+1**: DataLoader per request for barbers, services, shops and users referenced from lists.
- **Concurrency**: the database is the final guard. `appointments` has exclusion constraints so two active appointments of the same barber (and of the same customer) cannot overlap, even under concurrent requests. A constraint violation maps to `SLOT_UNAVAILABLE`.

### Aggregates

- **Appointment**: start, end, barber, customer, service snapshot, reminder lead, status (`booked`, `canceled`), canceled by and at. Owns rules 2 to 5.
- **Barber schedule**: weekly intervals and blocked dates. Validates intervals (end after start, no overlap, same day) and answers "which start times fit this duration on this date". Availability = schedule minus blocked dates minus active appointments minus the past.
- Barbershop, Barber, Service, Invite and User are plain entities with simple validation.

## API v1 surface

GraphQL, grouped by module. Names are indicative; the plan fixes the SDL.

- **identity**: `signUp`, `signIn`, `refreshToken`, `me`, `updateProfile`.
- **shops**: `createBarbershop`, `updateBarbershop`, `barbershop(id)`, `barbershopsNearby(lat, lng, radiusKm, limit)`, `searchBarbershops(query)`, `inviteBarber(email)`, `revokeInvite`, `acceptInvite(token)`, `becomeBarber` (owner joins own shop), `removeBarber`, `updateBarberProfile`, `createService`, `updateService`, `archiveService`.
- **scheduling**: `setWeeklySchedule`, `blockDate`, `unblockDate`, `availableSlots(barberId, serviceId, date)`, `bookAppointment`, `cancelAppointment`, `rescheduleAppointment`, `myAppointments`, `barberAgenda(date)`.
- **notifications**: `notifications`, `markNotificationRead`.
- **Subscription**: `agendaChanged` for the signed-in barber (booked, canceled, rescheduled).
- **REST**: `GET /health` (Postgres and Redis), `POST /uploads` (authenticated multipart, jpeg/png/webp up to 2 MB, returns a file id used by mutations), `GET /files/:id`.

Pagination is `limit` and `offset`; no Relay connections.

### Notifications in v1

Stored in a `notifications` table (in-app list for the future clients) and sent by email through a BullMQ queue: new booking (to barber), cancellation (to the other party), reschedule, reminder (to customer, a delayed job removed on cancel), invite. Push replaces email later by adding a `Notifier` adapter.

## Tooling

- **Docker Compose**: `postgres` (PostGIS image), `redis`, `mailpit` (catches dev email, web UI), `api` with hot reload. `docker compose up` gives a working API and GraphiQL.
- **Tests (Vitest)**:
  - unit: domain and use cases with in-memory adapters and a fake clock;
  - integration: TypeORM repositories and migrations against real Postgres, including a concurrent double-booking test where exactly one of two parallel bookings succeeds;
  - end to end: GraphQL operations through the app against real Postgres and Redis.
- **CI** (GitHub Actions): lint, typecheck, unit, integration and e2e with Postgres and Redis service containers.
- **Docs**: README (what it is, how to run, architecture diagram, example queries), `docs/architecture.md`, and short ADRs for GraphQL, hexagonal, the overlap constraint, and Postgres-only.
- ESLint and Prettier; strict TypeScript; current Node LTS (pinned in the plan).

## Delivery phases

Each phase is its own plan and ends with working, tested software.

1. **Skeleton**: rewrite setup, Docker Compose, Fastify and Yoga, config, TypeORM data source and migrations, error mapping, health check, test setup, CI, docs and ADRs. First vertical slice: `identity` (sign up, sign in, refresh, me), proving every layer.
2. **Shops**: barbershops (nearby, search), uploads, invites, barbers, services.
3. **Scheduling**: weekly schedule, days off, availability, booking, cancel, reschedule, agendas, overlap constraints.
4. **Notifications**: table, email queue, reminders, `agendaChanged` subscription.

After phase 4: design the barber and owner dashboard.

## Non-goals (v1)

Payments, AI, push notifications, SMS or WhatsApp, geocoding, ratings and reviews, partial-day blocks, multiple shops per owner or barber, platform admin, deploy.

## Anti-goals

Overengineering: no CQRS, event sourcing, microservices, DI container, generic repository framework, or bounded contexts beyond the four modules. If a pattern needs a paragraph to justify itself in an interview, it does not go in.

## Left to the builder

Folder names inside each module, test helper design, logging library, exact GraphQL type names, migration naming.
