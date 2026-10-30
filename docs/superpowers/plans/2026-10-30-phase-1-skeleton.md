# Phase 1: skeleton and identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 2021 Express code with a TypeScript skeleton (Fastify, GraphQL Yoga, TypeORM, Postgres, Redis, Docker Compose, tests, CI, docs) and ship the `identity` module end to end: sign up, sign in, refresh, me, update profile.

**Architecture:** Hexagonal modules under `src/modules/<name>/{domain,application,adapters}`. Domain and application import nothing from Fastify, Yoga or TypeORM. A hand-written composition root (`src/container.ts`) builds the adapters and use cases; `src/app.ts` builds the Fastify app from that container, so tests can swap adapters.

**Tech Stack:** Node 24, TypeScript (strict, ESM, NodeNext), Fastify 5, GraphQL Yoga 5, GraphQL Code Generator, TypeORM 0.3 + pg, PostgreSQL 17 + PostGIS, ioredis, argon2, jose, zod, Vitest, ESLint (flat config) + Prettier, Docker Compose, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-30-barberpro-api-design.md`

## Global Constraints

- Domain classes never carry ORM decorators. TypeORM records live in `adapters/persistence`; a mapper converts both ways. `synchronize` is off; schema changes go through migrations.
- Domain errors carry a stable code exposed in GraphQL `extensions.code`. Unexpected errors are logged and returned as a generic error.
- Auth: email and password (argon2), short-lived JWT access token (15 min) plus rotating refresh token (30 days) stored hashed.
- Instants are `timestamptz` in UTC.
- Composition root wired by hand, no DI container. No CQRS, event sourcing or generic repository framework.
- Code, commits, README and ADRs in English. The `learning/` folder is in Portuguese.
- Host ports avoid the ones already used on Arthur's machine: Postgres 5442, Redis 6390, Mailpit 8025/1025, API 4000.

## Review Focus

- Email case: `Ana@X.com` and `ana@x.com` are the same account (sign-up rejects the second, sign-in accepts either).
- A refresh token used twice: the second use fails, and every session of that user is revoked (reuse detection).
- An expired or tampered access token on `me`: `UNAUTHENTICATED`, never a 500.
- An unexpected error inside a resolver: the client sees a generic message, never the stack or SQL.
- Sign-in with an unknown email and with a wrong password return the same error code (`INVALID_CREDENTIALS`).

---

### Task 1: Remove the 2021 code and set up the toolchain

**Files:** delete `src/**`, `tmp/`, `.eslintrc.js`, `.sequelizerc`, `nodemon.json`, `yarn.lock`, `yarn-error.log`, `.vscode/`; create `package.json`, `tsconfig.json`, `tsconfig.build.json`, `eslint.config.js`, `.prettierrc`, `.gitignore`, `.nvmrc`, `vitest.config.ts`, `src/shared/domain/domain-error.ts`, `src/shared/domain/domain-error.test.ts`.

**Produces:** `class DomainError extends Error { constructor(readonly code: string, message: string) }`. Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `format`, `test` (all projects), `test:unit`, `test:integration`, `test:e2e`, `codegen`, `migration:run`, `migration:generate`, `migration:revert`.

- [ ] Commit 1: delete the old code (`chore: remove the 2021 Express code`; tag `v2021` already points at it).
- [ ] Write `domain-error.test.ts`: `new DomainError('SLOT_UNAVAILABLE', 'x')` has `code`, `message`, `name === 'DomainError'`, `instanceof Error`. Run, see it fail, implement, see it pass.
- [ ] Vitest projects: `unit` (`src/**/*.test.ts`), `integration` (`test/integration/**/*.test.ts`, single fork), `e2e` (`test/e2e/**/*.test.ts`, single fork).
- [ ] `npm run lint && npm run typecheck && npm run test:unit` green. Commit `chore: set up TypeScript, ESLint, Prettier and Vitest`.

### Task 2: Docker Compose and config

**Files:** `docker-compose.yml`, `Dockerfile`, `.dockerignore`, `.env.example`, `docker/postgres/init.sql`, `src/config.ts`, `src/config.test.ts`.

**Produces:** `loadConfig(env: NodeJS.ProcessEnv): Config` with `{ nodeEnv, port, databaseUrl, redisUrl, jwtSecret, accessTokenTtlSeconds, refreshTokenTtlDays, smtpUrl, uploadDir, publicUrl }`; throws listing every invalid variable.

- [ ] Test: missing `DATABASE_URL` and a 10-char `JWT_SECRET` produce one error naming both; defaults fill `PORT=4000`, access TTL 900, refresh TTL 30.
- [ ] Compose services: `postgres` (`postgis/postgis:17-3.5-alpine`, healthcheck, init script creates `barberpro_test`), `redis` (`redis:7-alpine`, healthcheck), `mailpit` (`axllent/mailpit`), `api` (Dockerfile `dev` stage, source mounted, `npm run dev`, depends on healthy services). Dockerfile has `dev`, `build` and `prod` stages.
- [ ] `docker compose up -d postgres redis mailpit` healthy. Commit `chore: add Docker Compose and typed config`.

### Task 3: Fastify app, health check, database and migrations

**Files:** `src/app.ts`, `src/main.ts`, `src/container.ts`, `src/shared/adapters/database/data-source.ts`, `src/shared/adapters/database/migrations/<ts>-identity.ts`, `src/shared/adapters/http/health.ts`, `src/shared/application/clock.ts`, `test/support/{db.ts,app.ts}`, `test/integration/migrations.test.ts`, `test/e2e/health.test.ts`.

**Produces:**
- `interface Clock { now(): Date }`, `systemClock`, `FixedClock` (test support, settable).
- `createDataSource(url: string): DataSource` with explicit `entities` and `migrations` arrays.
- `buildApp(container: Container): Promise<FastifyInstance>`; `createContainer(config, overrides?)`; `container.close()`.
- `GET /health` → `200 {status:'ok', checks:{postgres:'up', redis:'up'}}` or `503` with the failing check `down`.
- Migration creates extensions `postgis`, `btree_gist`, `pg_trgm`, tables `users` (`id uuid pk default gen_random_uuid()`, `name varchar(80)`, `email varchar(254) unique`, `password_hash text`, `created_at`, `updated_at timestamptz`) and `refresh_tokens` (`id uuid pk`, `user_id fk cascade`, `token_hash char(64) unique`, `expires_at`, `revoked_at null`, `created_at`).
- Test support: `testDataSource()` (migrated `barberpro_test`), `truncateAll(ds)`.

- [ ] Integration test: after migrations, `users` and `refresh_tokens` exist and the three extensions are installed. Fail, implement, pass.
- [ ] e2e test: `/health` is 200 with both up; with a Redis ping that throws it is 503 and `redis: 'down'`.
- [ ] Commit `feat: add the Fastify app, health check and first migration`.

### Task 4: GraphQL Yoga, codegen and error mapping

**Files:** `src/shared/adapters/graphql/{yoga.ts,context.ts,mask-error.ts,base.graphql}`, `codegen.ts`, `src/shared/adapters/graphql/generated/resolvers.ts` (generated, committed), `test/e2e/graphql-errors.test.ts`.

**Produces:**
- `GraphQLContext = { currentUserId: string | null; container: Container }`; `requireUser(ctx): string` throws `DomainError('UNAUTHENTICATED')`.
- `maskError`: `DomainError` → `GraphQLError(message, { extensions: { code } })`; `GraphQLError` passes through; anything else → `'Unexpected error.'` with `code: 'INTERNAL'`, logged.
- SDL files are read from every `src/**/*.graphql`; `base.graphql` declares `type Query`, `type Mutation`, `scalar DateTime`.

- [ ] e2e: `{ health }` (a `Query.health: String!` returning `"ok"`) works; a test-only resolver throwing `DomainError('NOT_SHOP_OWNER')` yields `extensions.code = 'NOT_SHOP_OWNER'`; one throwing `new Error('db password is x')` yields `INTERNAL` and the message does not contain `password`.
- [ ] Commit `feat: mount GraphQL Yoga with typed resolvers and error codes`.

### Task 5: Identity domain and use cases

**Files:** `src/modules/identity/domain/{user.ts,email.ts,password.ts}` + tests, `src/modules/identity/application/{ports.ts,sign-up.ts,sign-in.ts,refresh-session.ts,get-me.ts,update-profile.ts,issue-session.ts}` + tests, `src/modules/identity/testing/in-memory.ts`.

**Produces:**
- `Email.parse(raw): Email` trims and lowercases; invalid → `INVALID_EMAIL`.
- `assertPasswordPolicy(raw)`: 8 to 128 chars → else `WEAK_PASSWORD`.
- `User` entity: `id, name (1-80 trimmed, else INVALID_NAME), email, passwordHash, createdAt, updatedAt`; `rename(name, now)`.
- Ports: `UserRepository { findById, findByEmail, save }`, `RefreshTokenRepository { create, findByHash, revoke(id, at), revokeAllForUser(userId, at) }`, `PasswordHasher { hash, verify }`, `AccessTokens { issue(userId): {token, expiresAt}, verify(token): string | null }`, `Secrets { random(): string; hash(raw): string }`.
- Use cases (functions taking deps): `signUp({name,email,password})` → `Session` (`EMAIL_TAKEN`); `signIn` → `Session` (`INVALID_CREDENTIALS` for both unknown email and wrong password); `refreshSession(rawToken)` → new `Session`, old token revoked; revoked token reused → all user's tokens revoked and `INVALID_REFRESH_TOKEN`; expired/unknown → `INVALID_REFRESH_TOKEN`; `getMe(userId)`; `updateProfile(userId, {name})`.
- `Session = { accessToken, accessTokenExpiresAt, refreshToken, user }`.

- [ ] Each behavior above gets a unit test with in-memory adapters and `FixedClock`, written and failed first. Commit `feat(identity): add the user domain and auth use cases`.

### Task 6: Identity adapters

**Files:** `src/modules/identity/adapters/persistence/{user.record.ts,refresh-token.record.ts,typeorm-user-repository.ts,typeorm-refresh-token-repository.ts}`, `src/modules/identity/adapters/security/{argon2-password-hasher.ts,jose-access-tokens.ts,node-secrets.ts}`, tests in `test/integration/identity/*` and unit tests beside the security adapters.

- [ ] Integration: user round-trips through the repository (save, findByEmail lowercased, findById); refresh token create/findByHash/revoke/revokeAllForUser.
- [ ] Unit: argon2 verifies the right password and rejects a wrong one; jose token verifies, and returns `null` when expired (fake time) or signed with another secret.
- [ ] Commit `feat(identity): add TypeORM repositories and auth adapters`.

### Task 7: Identity GraphQL API

**Files:** `src/modules/identity/adapters/graphql/{identity.graphql,resolvers.ts}`, `test/e2e/identity.test.ts`, `src/container.ts` (wire identity).

SDL: `signUp(input: SignUpInput!): AuthPayload!`, `signIn(input: SignInInput!): AuthPayload!`, `refreshToken(token: String!): AuthPayload!`, `updateProfile(input: UpdateProfileInput!): User!`, `me: User!`. `AuthPayload { accessToken, accessTokenExpiresAt: DateTime!, refreshToken, user: User! }`. `User { id, name, email, createdAt }`.

- [ ] e2e: sign up → me with the access token; sign in with upper-case email; refresh rotates and the old refresh fails with `INVALID_REFRESH_TOKEN`; me without token → `UNAUTHENTICATED`; garbage token → `UNAUTHENTICATED`; duplicate email → `EMAIL_TAKEN`; updateProfile renames.
- [ ] Commit `feat(identity): expose sign up, sign in, refresh and me over GraphQL`.

### Task 8: CI

**Files:** `.github/workflows/ci.yml`.

- [ ] Job: Postgres (`postgis/postgis:17-3.5-alpine`) and Redis service containers; `npm ci`, codegen check (`git diff --exit-code` on the generated file), lint, typecheck, prettier check, unit, integration, e2e, build.
- [ ] Commit `ci: run lint, types and all test suites on GitHub Actions`.

### Task 9: Docs

**Files:** `README.md`, `docs/adr/000{1..4}-*.md`, `docs/assets/logo.svg`, `learning/{README.md,Arquitetura.md,GraphQL.md,TypeORM-e-Migrations.md,Autenticacao.md,Testes-e-CI.md,Docker.md}`.

- [ ] README: logo, what it is, stack, how to run (compose), example queries, architecture diagram, test commands, roadmap. ADRs: GraphQL, hexagonal + tactical DDD, Postgres only, overlap constraint (proposed; implemented in phase 3).
- [ ] `learning/` in Portuguese, plantcare style: short, the why behind each choice, interview phrases.
- [ ] Commit `docs: add README, ADRs and the learning notes`.
