# V3 customer app Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An Expo app in `mobile/` where customers find shops, book, cancel and reschedule against the existing API.

**Architecture:** Expo Router screens over feature folders; request functions are the only network code, hooks wrap TanStack Query, route files only read params. Session in SecureStore (web: localStorage), hydrated at start-up. Tests: Jest + RNTL with a fake `fetch`; Playwright on the web build against the real API.

**Tech Stack:** Expo SDK 58, Expo Router, React Native 0.88, React 19, TypeScript strict, TanStack Query 5, GraphQL Code Generator (client preset, string mode), React Hook Form + zod, expo-secure-store, expo-location, @expo-google-fonts, Jest 30 + jest-expo + @testing-library/react-native 14, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-05-v3-customer-app-design.md`

## Global Constraints

- Node 24 (`.nvmrc`); run commands from `mobile/` unless stated.
- Add native packages with `npx expo install`, never `npm i`; no module that needs a development build (Expo Go only).
- Interface copy in pt-BR, code and commits in English. Money `R$ 50,00`; times in `barbershop.timezone`.
- Colors only from `shared/ui/theme.ts`: `#312E38` ground, `#28262E` bars, `#3E3B47` raised, `#FF9000` accent, `#F4EDE8` text, `#999591` muted; error `#FF6B5E` (checked for AA on the ground).
- Fonts: Roboto Slab (headings, times, prices), Archivo (interface).
- `api/*.ts` files are the only code that calls the API client; components never import from `api/`.
- No API changes. Codegen reads `../src/**/*.graphql`; generated `src/gql` is committed and checked in CI.
- Reminder options: null, 15, 30, 60 (default 30). Date strip: today + 59 days in the shop's zone. 2-hour rule mirrored only to disable buttons.
- Every query screen: loading, empty, error with "Tentar de novo". Every mutation button disabled while pending.
- Accessibility: every pressable has `accessibilityRole` and a label tests can find.

## Review Focus

1. A refresh that fails offline must not sign the user out; a rejected refresh must (session test covers both).
2. A signed-out booking keeps barber, service, date and time through sign in or sign up and lands back on `/agendar` (booking screen test + e2e).
3. Slots and appointment times near midnight must show the shop's local date and time, not the device's (time helper tests with `America/Sao_Paulo` vs a UTC device).
4. `SLOT_UNAVAILABLE` on confirm refetches slots, clears the choice and says why (booking screen test).
5. Location denied or failing must leave search usable, never a dead screen (explore screen test).

---

### Task 1: Skeleton, shared layer and CI

**Files:**
- Create: `mobile/{app.json,package.json,tsconfig.json,eslint.config.js,.prettierrc.json,.prettierignore,codegen.ts,.env.example,jest.setup.ts}`
- Create: `mobile/src/shared/api/{client.ts,errors.ts,session.ts,storage.ts,refresh.ts,query-client.ts,index.ts}` and tests `client.test.ts`, `session.test.ts`
- Create: `mobile/src/shared/lib/{error-messages.ts,money.ts,time.ts}` and tests
- Create: `mobile/src/shared/ui/{theme.ts,text.tsx,button.tsx,field.tsx,states.tsx,screen.tsx}`
- Create: `mobile/src/app/{_layout.tsx,(tabs)/_layout.tsx,(tabs)/index.tsx,(tabs)/agendamentos.tsx,(tabs)/avisos.tsx,(tabs)/conta.tsx,+not-found.tsx}` (placeholders the later tasks fill)
- Create: `mobile/src/test/{fake-api.ts,render.tsx,fixtures.ts}`
- Modify: `.github/workflows/ci.yml` (job `mobile`)

**Interfaces:**
- Produces: `createApiClient({ session, baseUrl, fetch?, timeoutMs? })` → `{ request<R,V>(doc, vars?) }`; `ApiError`, `isApiError(e, code?)`; `createSessionStore({ storage: KeyValueStorage, refresh, now? })` → `{ hydrate(): Promise<void>, get(): Session|null, set(s), clear(), subscribe(fn), accessToken({force?}) }`; `KeyValueStorage = { getItem(k): Promise<string|null>, setItem(k,v): Promise<void>, removeItem(k): Promise<void> }`; `messageFor(code)`; `formatBRL(cents)`; time helpers `todayIn, addDays, formatTime, formatLongDate, formatShortDate, localDateOf, formatShortDateTime, formatRelative`; `theme` tokens; UI `Text` (variants `title|heading|body|muted|numeral`), `Button` (`variant: primary|secondary|ghost|danger`, `loading`), `TextField`, `LoadingState`, `EmptyState`, `ErrorState({ error, onRetry })`, `Screen`.
- Produces (tests): `fakeApi(handlers: Record<OperationName, (vars) => data | ApiErrorShape>)` → `{ fetch, calls }`; `renderWithProviders(ui, { api?, session? })`; `renderAppRouter(routes, { initialUrl, handlers, signedIn? })`.

- [ ] Step 1: Rewrite `app.json` (name `BarberPro`, slug `barberpro`, scheme `barberpro`, `userInterfaceStyle: "dark"`, splash and adaptive icon background `#312E38`, plugins `expo-router`, `expo-secure-store`, `expo-location` with `locationWhenInUsePermission: "Para mostrar as barbearias perto de você."`, `expo-font`, `web.output: "single"`, `experiments.typedRoutes`), package scripts (`start, ios, android, web, test, lint, typecheck, format, format:check, codegen, export:web, check, test:e2e`), jest config (`preset: jest-expo`, `watchman: false`, `setupFilesAfterEach`), ESLint flat config (`eslint-config-expo/flat` + prettier + `no-restricted-imports` blocking `**/api/*` from `components/` and `app/`), Prettier matching `web/`.
- [ ] Step 2: Port `money`, `time`, `error-messages` from `web/src/shared/lib` with tests; add `formatShortDate(date)` ("sex 6/11") and messages `CUSTOMER_BUSY: 'Você já tem outro agendamento neste horário.'`, `BARBER_CANNOT_BOOK_SELF: 'Você não pode agendar um horário com você mesmo.'`, `SLOT_UNAVAILABLE: 'Alguém acabou de reservar este horário. Escolha outro.'`. Test: `formatTime('2026-11-06T02:30:00.000Z','America/Sao_Paulo') === '23:30'` and `localDateOf` of the same instant is `2026-11-05`.
- [ ] Step 3: Write `session.test.ts`: hydrate reads stored JSON; `accessToken()` returns the token when fresh; refreshes when expiring in < 30 s; two concurrent calls refresh once; `NETWORK_ERROR` from refresh keeps the session and rethrows; any other refresh error clears it and returns null. Run, see it fail.
- [ ] Step 4: Implement `session.ts` and `storage.ts` (`Platform.OS === 'web'` → localStorage wrapped async; else SecureStore with key `barberpro.session`). Run tests, pass.
- [ ] Step 5: Port `client.ts` with test: adds bearer, refreshes once on `UNAUTHENTICATED` and retries, second rejection clears the session, 5xx → `NETWORK_ERROR`, maps `extensions.code`. `baseUrl` from `process.env.EXPO_PUBLIC_API_URL` (default `http://localhost:4000`). Query client with `focusManager` wired to `AppState` in `index.ts`.
- [ ] Step 6: Theme and UI primitives; root `_layout.tsx` loads fonts (`@expo-google-fonts/roboto-slab`, `@expo-google-fonts/archivo`), hydrates the session, keeps the splash until both are done, provides `QueryClientProvider`, `SessionProvider` and `ApiProvider` (context with the client, so tests inject a fake), clears the query cache on sign out. Tabs layout with four tabs, icons from `@expo/vector-icons` (Ionicons), tab bar `#28262E`, active `#FF9000`.
- [ ] Step 7: `codegen.ts` like `web/` (documents `src/features/**/api/*.ts`, `src/shared/api/*.ts`), run `npm run codegen`.
- [ ] Step 8: Test helpers and a smoke test: `renderAppRouter` at `/` shows the four tab labels. Run `npm run check` (lint, typecheck, format, tests), pass.
- [ ] Step 9: CI job `mobile` (working dir `mobile`: npm ci, codegen diff on `src/gql`, lint, typecheck, format:check, test, `export:web`). Commit `feat(mobile): Expo app skeleton, session and API client`.

### Task 2: Sign in, sign up and account

**Files:**
- Create: `mobile/src/features/auth/{api/auth.ts,hooks/use-auth.ts,components/sign-in-form.tsx,components/sign-up-form.tsx,components/signed-out.tsx,lib/return-path.ts}` + tests
- Create: `mobile/src/features/account/{api/account.ts,hooks/use-account.ts,screens/account-screen.tsx}` + test
- Create/Modify: `mobile/src/app/{entrar.tsx,criar-conta.tsx,(tabs)/conta.tsx}`

**Interfaces:**
- Consumes: Task 1 client, session, UI.
- Produces: `useSignIn()`, `useSignUp()`, `useSignOut()`, `useMe()`; `SignedOut({ title, body })` (buttons Entrar / Criar conta carrying `voltar`); `safeReturnPath(value): Href | null` (only app-internal paths starting with `/`, not `//`).

- [ ] Step 1: Tests: sign in with wrong password shows "Email ou senha incorretos."; success stores the session and goes to `voltar` or `/`; sign up validates name, email, password (8 to 128) before calling; `safeReturnPath('//evil.com')` is null. Run, fail.
- [ ] Step 2: Implement forms with React Hook Form + zod, screens, `voltar` handling. Pass.
- [ ] Step 3: Account test: shows name and email, rename saves via `updateProfile` and shows "Nome atualizado", "Sair" clears the session and shows the signed-out state. Implement, pass, `npm run check`, commit `feat(mobile): sign in, sign up and account`.

### Task 3: Explore, shop and barber

**Files:**
- Create: `mobile/src/features/explore/{api/explore.ts,hooks/use-nearby.ts,hooks/use-search.ts,hooks/use-location.ts,components/shop-row.tsx,screens/explore-screen.tsx}` + test
- Create: `mobile/src/features/shops/{api/shops.ts,hooks/use-shop.ts,hooks/use-barber.ts,screens/shop-screen.tsx,screens/barber-screen.tsx,lib/maps.ts}` + tests
- Modify: `mobile/src/app/(tabs)/index.tsx`; create `mobile/src/app/{barbearia/[id].tsx,barbeiro/[id].tsx}`

**Interfaces:**
- Produces: `useLocation()` → `{ status: 'asking'|'granted'|'denied'|'unavailable', coords }` (wraps `expo-location`, injectable for tests through a context `LocationProvider`); `mapsUrl(shop)`; screens.

- [ ] Step 1: Tests: granted → lists nearby shops with "1,2 km"; denied → "Sem acesso à sua localização" and search still works; typing "na" queries `SearchBarbershops` and shows results; 1 character shows the hint "Digite pelo menos 2 letras"; tapping a shop opens `/barbearia/:id`. Shop screen lists barbers and "Abrir no mapa"; unknown id shows "Barbearia não encontrada". Barber screen lists services with price and duration; tapping one goes to `/agendar?barbeiro=&servico=`. Run, fail.
- [ ] Step 2: Implement (search debounced 300 ms; `keepPreviousData`). Pass, check, commit `feat(mobile): explore, shop and barber screens`.

### Task 4: Booking

**Files:**
- Create: `mobile/src/features/booking/{api/booking.ts,hooks/use-slots.ts,hooks/use-book.ts,components/date-strip.tsx,components/slot-grid.tsx,components/reminder-picker.tsx,screens/book-screen.tsx,lib/dates.ts,lib/draft.ts}` + tests
- Create: `mobile/src/app/agendar.tsx`

**Interfaces:**
- Produces: `bookingDates(timeZone, now, count = 60)` → `string[]`; `DateStrip({ dates, value, onChange })`; `SlotGrid({ slots, timeZone, value, onChange })`; `ReminderPicker`; draft kept in the URL params (`barbeiro, servico, dia, hora, lembrete`) so it survives the sign-in detour; `useBook()`.

- [ ] Step 1: Tests: dates start at the shop's today; slots for the chosen day render as "09:00", "09:15"; choosing one enables "Confirmar agendamento"; confirm sends `{ barberId, serviceId, startsAt, reminderLeadMinutes: 30 }` and opens `/agendamento/:id?novo=1`; `SLOT_UNAVAILABLE` shows its message, refetches and clears the choice; signed out the button reads "Entrar para agendar" and goes to `/entrar?voltar=` with the draft in it; no slots → "Nenhum horário livre neste dia". Run, fail.
- [ ] Step 2: Implement. Pass, check, commit `feat(mobile): booking with date strip and time grid`.

### Task 5: Appointments, detail, cancel and reschedule

**Files:**
- Create: `mobile/src/features/appointments/{api/appointments.ts,hooks/use-appointments.ts,hooks/use-appointment.ts,hooks/use-cancel.ts,hooks/use-reschedule.ts,components/appointment-row.tsx,screens/appointments-screen.tsx,screens/appointment-screen.tsx,screens/reschedule-screen.tsx,lib/rules.ts,lib/labels.ts}` + tests
- Modify: `mobile/src/app/(tabs)/agendamentos.tsx`; create `mobile/src/app/{agendamento/[id].tsx,remarcar/[id].tsx}`

**Interfaces:**
- Consumes: Task 4 `DateStrip`, `SlotGrid`, `bookingDates`.
- Produces: `canChange(startsAt, now)` (≥ 2 h); `cancelReasonLabel(reason)`; screens. The detail reads the appointment from the `myAppointments` cache (upcoming and past) since the API has no single-appointment query; a miss refetches both lists.

- [ ] Step 1: Tests: signed out shows the signed-out state; Próximos lists appointments with shop, barber, service, "sex 6/11 às 14:00"; Anteriores queries `upcoming: false` and shows canceled with reason; detail cancel asks to confirm and shows "Agendamento cancelado"; within 2 h both buttons are disabled with "Faltam menos de 2 horas"; reschedule picks a new slot from `RescheduleSlots` and shows "Agendamento remarcado". Run, fail.
- [ ] Step 2: Implement (confirmation with `Alert.alert` on native and an in-app dialog component on web, behind one `confirm()` helper in `shared/ui`). Pass, check, commit `feat(mobile): appointments, cancel and reschedule`.

### Task 6: Notifications

**Files:**
- Create: `mobile/src/features/notifications/{api/notifications.ts,hooks/use-notifications.ts,lib/describe.ts,screens/notifications-screen.tsx}` + tests
- Modify: `mobile/src/app/(tabs)/avisos.tsx`, `mobile/src/app/(tabs)/_layout.tsx` (badge)

- [ ] Step 1: Tests: `describe()` turns each type into Portuguese title and body with the shop's time; list marks unread; tapping marks read (`MarkNotificationRead`) and opens the appointment; the tab badge shows the unread count and polls every 60 s while signed in. Run, fail.
- [ ] Step 2: Implement. Pass, check, commit `feat(mobile): notifications with unread badge`.

### Task 7: End-to-end tests on the web build

**Files:**
- Create: `mobile/playwright.config.ts`, `mobile/e2e/{booking.spec.ts,appointments.spec.ts}`, `mobile/e2e/support/{env.ts,api.ts,serve.mjs}`
- Modify: `.github/workflows/ci.yml` (job `mobile-e2e`)

- [ ] Step 1: `serve.mjs`: static server for `dist-web/` with SPA fallback (no dependency). Playwright web servers: API (port 4200, test DB, `QUEUE_PREFIX=barberpro-mobile-e2e`), worker, and `npm run export:web && node e2e/support/serve.mjs` on 8090 with `EXPO_PUBLIC_API_URL=http://localhost:4200`. Viewport 390×844, geolocation São Paulo, permission granted.
- [ ] Step 2: Specs: (a) a barber and shop set up through the API; a new user opens Explorar, finds the shop nearby, picks the barber and service, picks tomorrow 10:00, is asked to sign in, creates an account, comes back, confirms, sees "Agendado" and then the appointment in Agendamentos; (b) cancel it; (c) reschedule another to 11:00; (d) the barber cancels through the API and Avisos shows the badge and the notice. Run `npm run test:e2e`, pass.
- [ ] Step 3: CI job `mobile-e2e` with Postgres, Redis and Mailpit services. Commit `test(mobile): end-to-end on the web build`.

### Task 8: Native check, docs and review

**Files:**
- Create: `docs/adr/0008-customer-app-with-expo.md`, `learnings/App-Mobile.md`
- Modify: `README.md`, `learnings/README.md`, `learnings/Stack.md`, `mobile/README.md`

- [ ] Step 1: Run in Expo Go on the iOS simulator against the local API with a demo shop; screenshot every screen; fix what looks wrong.
- [ ] Step 2: Docs: README status row V3 and "Running the app"; ADR 8; Portuguese notes (architecture of the app, Expo Router, session on mobile, tests on React Native) and Stack.md's app section. Commit `docs: V3 customer app`.
- [ ] Step 3: Final whole-branch review, fix Critical and Important findings, push the branch and open the PR.
