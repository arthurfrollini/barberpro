# Dashboard 1: skeleton and auth. Implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A running `web/` app where a user can sign up, sign in, stay signed in across reloads and tabs, and land on the right screen for their role, with unit, component and end-to-end tests in CI.

**Architecture:** Vite SPA. Feature folders under `web/src/features`; each has `api/` (typed GraphQL operations and request functions), `hooks/` (TanStack Query around them), `components/` and `pages/`. `web/src/shared/api` holds the only `fetch` code: the GraphQL client and the session store.

**Tech Stack:** Vite 8, React 19, TypeScript 6, React Router 8 (data mode), TanStack Query 5, React Hook Form 7 + zod 4, Tailwind 4, shadcn/ui (Radix), GraphQL Code Generator client preset, Vitest 5 + testing-library + MSW, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-31-dashboard-design.md`

## Global Constraints

- Interface copy in pt-BR; code, commits and docs in English (study notes in `learning/` in Portuguese).
- Palette: `#312E38` base, `#28262E` chrome, `#3E3B47` raised, `#FF9000` accent, `#F4EDE8` text, `#999591` muted. Dark only.
- Fonts: Roboto Slab (headings, hour numerals), Archivo (interface), via Fontsource.
- Dev server on port 5180; Vite proxies `/graphql`, `/uploads`, `/files` to `API_URL` (default `http://localhost:4000`).
- Only `web/src/shared/api` calls `fetch`. Only `features/*/api` files define operations.
- Node 24, same Prettier settings as the API (`singleQuote`, `trailingComma: all`, `printWidth: 100`).
- Session lives in `localStorage` under `barberpro.session`; refresh when the access token expires within 30 seconds.

## Review Focus

- Two tabs refreshing at once: exactly one `refreshToken` call; the other tab reuses the stored session.
- Refresh token rejected (revoked, reused, expired): session cleared, user sent to `/entrar` once, no loop.
- A GraphQL error with a code the dashboard does not know: generic Portuguese message, never the English API text or a stack.
- Network down or API 5xx: the form shows "Não foi possível falar com o servidor", the button is usable again.
- Signed-in user opens `/entrar` or `/criar-conta`: redirected to their landing screen.

---

### Task 1: Scaffold `web/`

**Files:**
- Create: `web/package.json`, `web/vite.config.ts`, `web/tsconfig.json`, `web/index.html`, `web/eslint.config.js`, `web/.prettierrc`, `web/.prettierignore`, `web/components.json`, `web/src/main.tsx`, `web/src/index.css`, `web/src/shared/lib/utils.ts`, `web/src/test/setup.ts`, `web/src/test/server.ts`, `web/public/logo.svg`
- Modify: root `eslint.config.js` and `.prettierignore` (ignore `web`), root `tsconfig.json` unaffected (`include` already excludes `web`).
- Test: `web/src/app/app.test.tsx`

- [ ] **Step 1:** Create the package with the stack above, scripts `dev`, `build`, `preview`, `lint`, `typecheck`, `format`, `format:check`, `test`, `codegen`, `test:e2e`. Alias `@/` to `web/src`. Vitest: `environment: 'jsdom'`, `setupFiles: ['src/test/setup.ts']`, `include: ['src/**/*.test.{ts,tsx}']`.
- [ ] **Step 2:** Theme tokens in `index.css` with Tailwind 4 `@theme`: map the palette to shadcn names (`--background` base, `--card`/`--popover`/`--input`/`--secondary` raised, `--sidebar` chrome, `--primary` accent with `--primary-foreground` base, `--foreground` text, `--muted-foreground` muted, `--destructive` `#C53030`, `--ring` accent). `--font-sans: 'Archivo Variable'`, `--font-display: 'Roboto Slab Variable'`.
- [ ] **Step 3:** `shadcn init` with `ui` alias `@/shared/ui`, `utils` alias `@/shared/lib/utils`; add `button input label form card dialog alert-dialog sheet dropdown-menu popover badge skeleton sonner separator avatar select textarea tooltip`.
- [ ] **Step 4:** Write `app.test.tsx`: rendering `<App />` at `/entrar` shows the heading "Entrar". Run `npm test`. Expected: FAIL (no App).
- [ ] **Step 5:** Minimal `App` with the router and a sign-in placeholder. Run. Expected: PASS.
- [ ] **Step 6:** `npm run lint && npm run typecheck && npm run format:check && npm run build` pass. Commit `chore(web): scaffold Vite app with Tailwind theme and shadcn`.

### Task 2: Formatting and error copy

**Files:**
- Create: `web/src/shared/lib/money.ts`, `web/src/shared/lib/time.ts`, `web/src/shared/lib/error-messages.ts`
- Test: next to each, `*.test.ts`

**Interfaces:**
- Produces:
  - `formatBRL(cents: number): string` → `'R$ 50,00'` (non-breaking space as Intl gives it).
  - `parseBRL(input: string): number | null` → cents; accepts `50`, `50,5`, `50,50`, `R$ 1.234,56`; `null` for anything else or negatives.
  - `todayIn(timeZone: string, now?: Date): string` (`YYYY-MM-DD`), `addDays(date: string, days: number): string`, `weekdayOf(date: string): number` (0 = Sunday), `formatTime(iso: string, timeZone: string): string` (`'14:00'`), `formatLongDate(date: string): string` (`'segunda-feira, 2 de novembro'`), `minutesOfDay(iso: string, timeZone: string): number`.
  - `messageFor(code: string | undefined): string`, with a `GENERIC_ERROR` fallback `'Algo deu errado. Tente de novo.'` and `NETWORK_ERROR` → `'Não foi possível falar com o servidor. Verifique sua conexão.'`.

- [ ] **Step 1:** Tests: `formatBRL(5000)` matches `/R\$\s50,00/`; `parseBRL` cases above plus `'abc'`, `'-5'`, `''` → `null`; `todayIn('America/Sao_Paulo', new Date('2026-11-02T02:30:00Z'))` → `'2026-11-01'`; `addDays('2026-02-28', 1)` → `'2026-03-01'`; `weekdayOf('2026-11-01')` → `0`; `formatTime('2026-11-02T17:00:00.000Z', 'America/Sao_Paulo')` → `'14:00'`; `minutesOfDay` of that → `840`; `messageFor('INVALID_CREDENTIALS')` → `'Email ou senha incorretos.'`; `messageFor('WHATEVER')` → generic.
- [ ] **Step 2:** Run, see FAIL. Implement with `Intl`. Run, see PASS. Commit `feat(web): money, time zone and error message helpers`.

### Task 3: Session store

**Files:**
- Create: `web/src/shared/api/session.ts`
- Test: `web/src/shared/api/session.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type Session = { accessToken: string; accessTokenExpiresAt: string; refreshToken: string };
  type Refresh = (refreshToken: string) => Promise<Session>;
  function createSessionStore(options: {
    storage: Storage;
    refresh: Refresh;
    lock?: <T>(name: string, work: () => Promise<T>) => Promise<T>; // default: navigator.locks or run directly
    now?: () => number;
  }): {
    get(): Session | null;
    set(session: Session): void;
    clear(): void;
    subscribe(listener: (session: Session | null) => void): () => void; // also fires on `storage` events
    accessToken(options?: { force?: boolean }): Promise<string | null>;
  };
  ```
  `accessToken()` returns the stored token when it expires more than 30 s from now; otherwise, under the lock `barberpro-refresh`, re-reads storage (another tab may have refreshed), refreshes only if still needed, stores and returns the result. Calls in the same tab share one in-flight promise. A failed refresh clears the session and returns `null`. `force` skips the expiry check (used after an `UNAUTHENTICATED` response) but still skips the refresh when storage holds a different access token than the one that failed.

- [ ] **Step 1:** Tests: valid token returned with no refresh; expiring token refreshed and stored; two concurrent calls → one refresh; inside the lock, storage already holds a fresh session from "another tab" → no refresh; refresh rejects → `null` and storage cleared; `subscribe` fires on `set`, `clear` and a `storage` event for the key.
- [ ] **Step 2:** FAIL, implement, PASS. Commit `feat(web): session store with cross-tab refresh lock`.

### Task 4: GraphQL client and codegen

**Files:**
- Create: `web/codegen.ts`, `web/src/gql/*` (generated), `web/src/shared/api/client.ts`, `web/src/shared/api/errors.ts`, `web/src/test/graphql.ts` (MSW helpers)
- Test: `web/src/shared/api/client.test.ts`

**Interfaces:**
- Consumes: `createSessionStore` (Task 3).
- Produces:
  - Codegen: schema `../src/**/*.graphql`, documents `src/features/**/api/*.ts`, preset `client`, `documentMode: 'string'`, `scalars: { DateTime: 'string' }`, `enumsAsTypes: true`, output `src/gql/`. Operations are written with `graphql(\`...\`)` from `@/gql`.
  - `class ApiError extends Error { code: string }`; codes from `extensions.code`, `NETWORK_ERROR` for a failed fetch or a non-JSON / 5xx response.
  - `createApiClient({ session, onSessionExpired, fetch? })` → `{ request<R, V>(document: TypedDocumentString<R, V>, variables?: V): Promise<R>; upload(file: File): Promise<{ id: string; url: string }> }`. Sends `Authorization` when a token exists. On a response whose first error is `UNAUTHENTICATED` while a session exists: `session.accessToken({ force: true })`, retry once; if still unauthenticated or no token, `session.clear()` and `onSessionExpired()`.
  - `web/src/shared/api/index.ts` exports a singleton `api` and `session` wired to `localStorage`, plus `refreshSession` using the `RefreshToken` operation (defined in `shared/api/refresh.ts`, the one operation outside a feature, because the client needs it).

- [ ] **Step 1:** Tests with MSW: request sends bearer and returns `data`; GraphQL error → `ApiError` with that code and message; `fetch` rejects → `NETWORK_ERROR`; 500 → `NETWORK_ERROR`; `UNAUTHENTICATED` then success after forced refresh → resolves, one retry; `UNAUTHENTICATED` twice → session cleared, `onSessionExpired` called once, rejects with `UNAUTHENTICATED`.
- [ ] **Step 2:** FAIL, implement, PASS. `npm run codegen` writes `src/gql`. Commit `feat(web): typed GraphQL client with codegen and token refresh`.

### Task 5: Auth feature

**Files:**
- Create: `web/src/features/auth/api/auth.ts`, `hooks/use-auth.ts`, `components/sign-in-form.tsx`, `components/sign-up-form.tsx`, `pages/sign-in-page.tsx`, `pages/sign-up-page.tsx`, `web/src/features/auth/session-context.tsx`
- Test: `web/src/features/auth/components/sign-in-form.test.tsx`, `sign-up-form.test.tsx`, `web/src/test/render.tsx` (renders with QueryClient, router and session)

**Interfaces:**
- Produces:
  - api: `signIn(input)`, `signUp(input)`, `fetchMe()`, each returning the generated result types.
  - hooks: `useSignIn()`, `useSignUp()` (mutations that store the session and seed `['me']`), `useMe()` (query `['me']`), `useSignOut()` (clears session and the whole query cache, navigates to `/entrar`), `useIsSignedIn()` (subscribes to the store).
- [ ] **Step 1:** Tests: empty submit shows "Informe seu email" and "Informe sua senha"; invalid email shows "Email inválido"; API `INVALID_CREDENTIALS` shows "Email ou senha incorretos."; success stores the session and navigates to `/`; sign up with a 7-character password shows "A senha precisa de pelo menos 8 caracteres"; `EMAIL_TAKEN` shows "Já existe uma conta com este email." under the email field.
- [ ] **Step 2:** FAIL, implement, PASS. Commit `feat(web): sign in and sign up`.

### Task 6: Shell, roles and route guards

**Files:**
- Create: `web/src/app/router.tsx`, `web/src/app/providers.tsx`, `web/src/app/layout/app-layout.tsx`, `web/src/app/layout/nav.tsx`, `web/src/app/guards.tsx`, `web/src/features/roles/api/roles.ts`, `web/src/features/roles/hooks/use-roles.ts`, placeholder pages for `/agenda`, `/horarios`, `/servicos`, `/perfil`, `/barbearia`, `/equipe`, `/comecar`.
- Test: `web/src/app/guards.test.tsx`, `web/src/app/layout/nav.test.tsx`

**Interfaces:**
- Produces: `useRoles()` → `{ barber: Barber | null; shop: Barbershop | null; isLoading }` from one query (`myBarberProfile`, `myBarbershop`, key `['roles']`); `landingPath(roles)` → `/agenda` (barber), `/barbearia` (owner only), `/comecar` (neither); `<RequireAuth>` redirects to `/entrar?voltar=<path>`; `<RedirectIfSignedIn>` on the auth pages.
- [ ] **Step 1:** Tests: signed out at `/agenda` → sign-in page; signed in at `/entrar` → landing; `landingPath` table; nav shows Barbearia and Equipe only for owners and the agenda group only for barbers; sign out returns to `/entrar`.
- [ ] **Step 2:** FAIL, implement, PASS. Commit `feat(web): app shell, role-based navigation and route guards`.

### Task 7: Playwright harness

**Files:**
- Create: `web/playwright.config.ts`, `web/e2e/global-setup.ts`, `web/e2e/support/api.ts` (GraphQL helper for seeding), `web/e2e/auth.spec.ts`
- Modify: `web/package.json` (`test:e2e`)

- [ ] **Step 1:** Config: Chromium only; `webServer` starts the API (`npm run dev` in the repo root) and the worker on port 4100 with `NODE_ENV=test`, `DATABASE_URL` = `barberpro_test`, `QUEUE_PREFIX=barberpro-web-e2e`, then Vite on 5181 with `API_URL=http://localhost:4100`; global setup runs the API migrations. `reuseExistingServer` off in CI.
- [ ] **Step 2:** `auth.spec.ts`: sign up with a unique email → lands on "Começar"; reload keeps the session; sign out → sign-in page; sign in again → "Começar". Run `npm run test:e2e`. Expected: PASS. Commit `test(web): Playwright harness against the real API`.

### Task 8: Docker Compose and CI

**Files:**
- Create: `web/Dockerfile` (dev target)
- Modify: `docker-compose.yml` (`web` service, port 5180, `API_URL=http://api:4000`), `.github/workflows/ci.yml` (`web` and `web-e2e` jobs)

- [ ] **Step 1:** `docker compose up -d --build web` and `curl -s localhost:5180 | grep BarberPro` succeeds; `curl -s localhost:5180/graphql -H 'content-type: application/json' -d '{"query":"{health}"}'` returns `ok` through the proxy.
- [ ] **Step 2:** CI jobs: `web` (npm ci, codegen + `git diff --exit-code web/src/gql`, lint, typecheck, format check, test, build); `web-e2e` (postgres, redis, mailpit services; root and web npm ci; `npx playwright install --with-deps chromium`; `npm run test:e2e`; upload the report on failure). Commit `ci: web checks and end-to-end job; compose web service`.

### Task 9: Docs

- [ ] README: a Dashboard section (run, scripts, structure); ADR `0005-dashboard-in-the-same-repo.md`, `0006-session-in-local-storage.md`; `learning/Frontend-Arquitetura.md`, `learning/Testes-no-Front.md`, and the learning index. Commit `docs: dashboard README section, ADRs and study notes`.
