# Phase 2: shops Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Owners create a barbershop page and invite barbers by email; barbers manage their profile and services; anyone can find shops nearby or by name. Logos and avatars upload over REST.

**Architecture:** New module `src/modules/shops` with the phase 1 layout. Uploads live in `src/shared` (a `files` table, a `FileStorage` port with a disk adapter, `POST /uploads` and `GET /files/:id` in Fastify). Invite emails go through a `Mailer` port with an SMTP adapter (nodemailer); phase 4 moves them onto the queue. Lists use DataLoader per request.

**Tech Stack:** phase 1 stack plus `@fastify/multipart`, `nodemailer`, `dataloader`.

**Spec:** `docs/superpowers/specs/2026-10-30-barberpro-api-design.md`

## Global Constraints

- Phase 1 constraints hold (no ORM in domain, error codes, hand-wired container, UTC instants).
- One shop per owner and one active shop per barber.
- Money in integer cents (BRL). Durations in minutes, multiple of 5, from 5 to 480.
- Location: the owner sends latitude and longitude. No geocoding.
- Each shop has an IANA timezone (default `America/Sao_Paulo`).
- Invites expire after 7 days and can be revoked. Email only.
- Public reads need no login: `barbershop`, `barbershopsNearby`, `searchBarbershops`, a barber's services.
- Archived services cannot be booked (enforced in phase 3) and are hidden from public lists.
- Uploads: authenticated multipart, jpeg/png/webp detected from the bytes, at most 2 MB.

## Review Focus

- Accepting an invite signed in with a different email than the invited one: `INVITE_EMAIL_MISMATCH`.
- An invite accepted, revoked or expired, then used: `INVITE_NOT_FOUND` or `INVITE_EXPIRED`, never a second barber row.
- A non-owner calling owner mutations (update shop, invite, remove barber): `NOT_SHOP_OWNER`.
- A file renamed to `.png` that is really HTML or a PDF: rejected with 415.
- A barber removed from a shop no longer appears in the shop's barbers and cannot create services.

---

### Task 1: Uploads

**Files:** migration `<ts>-shops.ts` (all phase 2 tables, see Task 2), `src/shared/adapters/files/{file.record.ts,disk-file-storage.ts,detect-image-type.ts,uploads-routes.ts}`, `src/shared/application/files.ts` (port `FileStorage`, `FileRepository`), tests.

**Produces:** `detectImageType(bytes: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null`. `POST /uploads` → `201 { id, url }` (`url = ${publicUrl}/files/${id}`); `401` without a valid token; `413` above 2 MB; `415` for other types. `GET /files/:id` → bytes with the stored `content-type`, `x-content-type-options: nosniff`, `cache-control: public, max-age=31536000, immutable`; `404` otherwise. `files` row: `id, owner_id, content_type, size_bytes, created_at`; the bytes live at `${uploadDir}/${id}`.

- [ ] Unit: magic bytes for each type, and HTML/PDF/empty → null.
- [ ] e2e: upload a 1x1 PNG then download it byte-identical; no token → 401; HTML named `.png` → 415; 2 MB + 1 byte → 413; unknown id → 404.
- [ ] Commit `feat: add image uploads over REST`.

### Task 2: Shops domain and schema

**Files:** `src/modules/shops/domain/{barbershop.ts,barber.ts,service.ts,invite.ts,location.ts}` + tests; migration from Task 1 contains:
- `barbershops(id, owner_id unique → users, name varchar(80), description varchar(1000), founded_year int, logo_file_id → files null, address varchar(200), location geography(Point,4326), timezone varchar(64), created_at, updated_at)`, gist index on `location`, gin trigram index on `name`.
- `barbers(id, shop_id → barbershops, user_id → users, bio varchar(500), avatar_file_id → files null, created_at, removed_at null)`, unique `user_id` where `removed_at is null`.
- `invites(id, shop_id, email, token_hash char(64) unique, invited_by → users, expires_at, accepted_at, revoked_at, created_at)`, unique `(shop_id, email)` where `accepted_at is null and revoked_at is null`.
- `services(id, barber_id → barbers, name varchar(60), description varchar(500), price_cents int ≥ 0, duration_minutes int check 5..480 and % 5 = 0, archived_at null, created_at, updated_at)`.

**Produces:** `Location.of(lat, lng)` (`INVALID_LOCATION`); `Barbershop.create/restore/update`, `yearsActive(now)`; `Barber.create/restore/updateProfile/remove(now)`, `isActive`; `Service.create/restore/update/archive(now)` (`INVALID_PRICE`, `INVALID_DURATION`, `INVALID_SERVICE_NAME`); `Invite.create/restore/accept(now)/revoke(now)`, `status(now): 'pending'|'accepted'|'revoked'|'expired'`. Validation codes: `INVALID_SHOP_NAME` (1-80), `INVALID_DESCRIPTION` (≤1000), `INVALID_FOUNDED_YEAR` (1900..current year), `INVALID_ADDRESS` (1-200), `INVALID_TIMEZONE` (accepted by `Intl.DateTimeFormat`), `INVALID_BIO` (≤500).

- [ ] Unit tests for every validation and state change, written first. Commit `feat(shops): add the shop, barber, service and invite domain`.

### Task 3: Shop use cases

**Files:** `src/modules/shops/application/{ports.ts,barbershops.ts,invites.ts,barbers.ts,services.ts}` + tests with in-memory adapters in `src/modules/shops/testing/in-memory.ts`.

**Produces (all `(deps, actorUserId, input)`):**
- `createBarbershop` (`SHOP_ALREADY_OWNED`; logo must be a file owned by the actor, else `FILE_NOT_FOUND`), `updateBarbershop` (`NOT_SHOP_OWNER`), `getBarbershop(id)` (`SHOP_NOT_FOUND`), `findNearby({lat,lng,radiusKm≤50,limit≤50})` → `{shop, distanceKm}[]` nearest first, `searchBarbershops({query (≥2 chars, else INVALID_SEARCH), limit≤50, offset})`.
- `inviteBarber(email)` → stores the token hash, sends `Mailer` message with subject `You were invited to join <shop name>` and a body containing the token; `ALREADY_A_BARBER` when that email's user is an active barber of this shop; a pending unexpired invite for the same email → `INVITE_ALREADY_SENT`; an expired one is revoked and replaced. `revokeInvite(inviteId)`. `acceptInvite(token)` (`INVITE_NOT_FOUND`, `INVITE_EXPIRED`, `INVITE_EMAIL_MISMATCH`, `ALREADY_A_BARBER` when the actor is an active barber anywhere).
- `becomeBarber()` (owner joins own shop; `ALREADY_A_BARBER`), `removeBarber(barberId)` (owner; `BARBER_NOT_FOUND`), `updateBarberProfile({bio?, avatarFileId?})` (`NOT_A_BARBER`).
- `createService`, `updateService`, `archiveService` (`NOT_A_BARBER`, `SERVICE_NOT_FOUND`, `NOT_SERVICE_OWNER`).
- Ports: `BarbershopRepository`, `BarberRepository`, `InviteRepository`, `ServiceRepository`, `FileRepository` (from Task 1), `Mailer { send({to, subject, text}) }`, `UserLookup { findById, findByEmail, findByIds }` (backed by identity's repository).

- [ ] One test per rule above. Commit `feat(shops): add use cases for shops, invites, barbers and services`.

### Task 4: Persistence and mail adapters

**Files:** `src/modules/shops/adapters/persistence/*`, `src/shared/adapters/mail/smtp-mailer.ts`, `test/integration/shops/*`.

- [ ] Integration: shop round-trip including location; `findNearby` orders by distance and drops shops beyond the radius (São Paulo points: Paulista −23.5614,−46.6559; Pinheiros −23.5670,−46.6920; Itaquera −23.5400,−46.4560); `search('barbaria')` finds "Mega Barbearia SP" (trigram); partial unique indexes reject a second active barber row and a second pending invite.
- [ ] Integration: SMTP mailer delivers to Mailpit (read back through `GET http://localhost:8025/api/v1/messages`); skipped when Mailpit is not reachable.
- [ ] Commit `feat(shops): add TypeORM repositories with PostGIS and trigram search`.

### Task 5: GraphQL API and DataLoader

**Files:** `src/modules/shops/adapters/graphql/{shops.graphql,shops.resolvers.ts,loaders.ts}`, `src/shared/adapters/graphql/context.ts` (add `loaders`), `src/container.ts`, `src/app.ts`, `test/e2e/shops.test.ts`.

SDL types: `Barbershop { id name description foundedYear yearsActive logoUrl address latitude longitude timezone barbers: [Barber!]! invites: [Invite!]! (owner only, else NOT_SHOP_OWNER) }`, `NearbyBarbershop { barbershop distanceKm }`, `Barber { id name bio avatarUrl barbershop services: [Service!]! }`, `Service { id name description priceCents durationMinutes archived }`, `Invite { id email status expiresAt createdAt }`. Queries: `barbershop(id)`, `barbershopsNearby(latitude, longitude, radiusKm = 10, limit = 20)`, `searchBarbershops(query, limit = 20, offset = 0)`, `myBarbershop`, `myBarberProfile`. Mutations from Task 3.

- [ ] e2e, the full story: owner signs up, uploads a logo, creates "Mega Barbearia SP", invites `jose@x.com`; the invite email is captured by a fake mailer; José signs up and accepts; José creates "Corte" (R$ 50, 15 min); a stranger finds the shop nearby and by search and reads José's services without a token; the owner becomes a barber too; owner removes José and he disappears from `barbers`.
- [ ] e2e: a non-owner `inviteBarber` → `NOT_SHOP_OWNER`; José accepting with Ana's token → `INVITE_EMAIL_MISMATCH`.
- [ ] DataLoader: a test counts SQL queries for `searchBarbershops { barbers { name services { name } } }` over 3 shops and expects a constant number (no N+1).
- [ ] Commit `feat(shops): expose shops, invites, barbers and services over GraphQL`.

### Task 6: Docs

- [ ] README status table and examples; `learning/Barbearias-e-Convites.md` (PostGIS, trigram, invite flow, DataLoader) and update `learning/README.md`. Commit `docs: document phase 2`.
