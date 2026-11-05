# BarberPro V3, the customer app: design

Date: 2026-11-05. Status: Arthur asked to start V3 and to work through it without stopping ("pode mandar bala ... trabalhar em loop até finalizar"). The scope, the customer's mobile app, was agreed earlier, when the dashboard spec left "Customer booking UI (that is the mobile app)" out of v1. Everything below is Claude's call, for him to review on the PR.

## Why

The API takes bookings from customers, but only the barber's side has a client. V3 closes the loop: a customer finds a shop near them, picks a barber, a service and a free time, books it, and later cancels or moves it, all from their phone. With it the product works end to end on both sides, and the repo shows a React Native app next to the React dashboard, sharing the same GraphQL schema and conventions.

Success: a person who has never used BarberPro opens the app, sees the shops around them, books a haircut for tomorrow in under a minute (signing up on the way), and the booking lands on the barber's agenda live. Later they get the barber's cancellation in the app and can book again.

## Calls made by Claude

- **Expo (SDK 58) with Expo Router**, in `mobile/` in the same repo, with its own `package.json`. Same reasons as ADR 5 for the dashboard: codegen reads the API's SDL, so a breaking schema change fails the app's CI in the same PR. Expo because it is the default way to build React Native today: no native folders to maintain, typed file-based routes, and a web build for free, which the end-to-end tests use.
- **No API changes.** Everything the customer needs is already public or customer-scoped: `barbershopsNearby`, `searchBarbershops`, `barbershop`, `barber`, `availableSlots`, `bookAppointment`, `myAppointments`, `cancelAppointment`, `rescheduleSlots`, `rescheduleAppointment`, `notifications`, `unreadNotificationCount`, `markNotificationRead`, `me`, `updateProfile`. GraphQL Yoga answers CORS, so the web build can call the API from another origin.
- **Same front-end shape as the dashboard**: feature folders; request functions in `api/` are the only code that talks to the network; hooks wrap TanStack Query around them; screens compose components. GraphQL Code Generator's client preset in string mode with a small `fetch` client, no Apollo.
- **Session**: tokens in `expo-secure-store` on iOS and Android (the Keychain and the Keystore), `localStorage` on web. Read once at start-up into memory while the splash screen is up, written through on change. One app instance means no cross-tab lock: a single in-flight refresh promise keeps the single-use refresh token from being spent twice.
- **Browsing is public, booking is not.** Explore, shop and barber screens work signed out. Booking, appointments, notifications and the account need a session: a signed-out user is sent to sign in (or sign up) and comes back to where they were, with the chosen barber, service and time kept.
- **Tabs**: Explorar, Agendamentos, Avisos (unread badge) and Conta, with JavaScript tabs (`expo-router`'s `Tabs`), not native tabs: they render the same on iOS, Android and web, take the brand's colors and fonts, and render in unit tests.
- **Location**: `expo-location` asks once, on Explorar. Granted: shops within 10 km, nearest first, with the distance. Denied or unavailable: the screen says so and offers search. Search uses `searchBarbershops` (typo tolerant) from 2 characters, debounced.
- **Times in the shop's time zone**: slots, appointment times and dates are shown in `barbershop.timezone`, as the API stores the rules. The date strip offers today plus the next 59 days (the API's 60-day horizon).
- **Reminder**: the booking screen offers no reminder, 15 min, 30 min or 1 hour before (the API takes 5 to 60 in steps of 5). Default 30 min.
- **Fresh data without push**: TanStack Query refetches when the app returns to the foreground (`focusManager` fed by `AppState`), and the unread count polls every 60 seconds while signed in and open. Push notifications are a non-goal: they need an Expo push token stored by the API and a sender in the worker, which is a V4.
- **Tests**: Jest with `jest-expo` and React Native Testing Library, the runner Expo documents. Network in component tests is a fake `fetch` injected into the real API client that answers by operation name (MSW 3 is ESM-only and fights the React Native Jest transform). Screens with navigation are tested with `expo-router/testing-library`'s `renderRouter`.
- **End to end**: Playwright drives the app's web build (Chromium, phone-sized viewport, geolocation granted) against the real API, worker, Postgres and Redis, like the dashboard's suite. The flows set up a shop through the API and then book, cancel and reschedule as a customer in the UI.
- **Native check**: the app runs in Expo Go on the iOS simulator; each screen gets checked there by hand with screenshots before the PR.
- **Language**: interface in pt-BR, code in English. Paths in Portuguese, as in the dashboard (`/barbearia/[id]`, `/agendar`).

## Screens

| Screen | Path | What it does |
| --- | --- | --- |
| Explorar | `/` (tab) | Search field on top; below it, shops near you (name, logo, address, distance) or search results; states for asking location, denied, loading, empty, error |
| Barbearia | `/barbearia/[id]` | Logo, name, years active, address with "Abrir no mapa", description, and the barbers (photo, name, bio excerpt) |
| Barbeiro | `/barbeiro/[id]` | Photo, name, bio, shop name, and the services (name, description, price, duration); tapping a service starts a booking |
| Agendar | `/agendar?barbeiro=&servico=` | Summary (barber, service, price, duration), a horizontal date strip, the free times for that date as a grid, the reminder choice, and "Confirmar agendamento". Signed out, the confirm button reads "Entrar para agendar" |
| Agendado | `/agendamento/[id]?novo=1` | The appointment detail with a "Agendado" header after booking |
| Agendamentos | `/agendamentos` (tab) | "Próximos" and "Anteriores" (segmented), each a list of appointments: date, time, service, barber, shop, status; pull to refresh |
| Agendamento | `/agendamento/[id]` | Shop, address, barber, service, price, date and time, reminder, status (and the cancel reason when canceled); "Remarcar" and "Cancelar agendamento", both disabled with the reason when it starts in less than 2 hours |
| Remarcar | `/remarcar/[id]` | Same date strip and grid, fed by `rescheduleSlots`; confirm moves the appointment |
| Avisos | `/avisos` (tab) | The user's notifications, newest first, unread marked; tapping one marks it read and opens its appointment |
| Conta | `/conta` (tab) | Name (editable) and email, "Sair" |
| Entrar / Criar conta | `/entrar`, `/criar-conta` | Email and password, plus name to sign up; `voltar` param to return |

Signed out, Agendamentos, Avisos and Conta show what the tab is for and the two buttons, "Entrar" and "Criar conta".

Every query screen has loading, empty and error states with a retry. Every mutation disables its button while it runs and reports the mapped error. `SLOT_UNAVAILABLE` on confirm (someone took the time first) refetches the times and says so. `CUSTOMER_BUSY` and `BARBER_CANNOT_BOOK_SELF` get customer-facing copy.

## Visual direction

The brand carries over from the dashboard: plum-grey `#312E38` ground, `#28262E` for bars, `#3E3B47` for raised surfaces and inputs, `#FF9000` as the only accent, `#F4EDE8` text and `#999591` secondary text. Dark only. Roboto Slab for headings and for numerals that matter (times, prices); Archivo for the interface, both from `@expo-google-fonts`.

The memorable element is booking: the free times as a grid of large slab numerals, the chosen one filled orange, and the date strip above it with the weekday small and the day number big. The confirmation reads like a ticket: shop, barber, service and the time in big slab type. Everything else stays quiet: lists with hairline separators, one radius scale, no gradients, no shadows beyond the system's.

## Code shape

```
mobile/src/
  app/            routes only: _layout, (tabs)/, barbearia/[id], barbeiro/[id], agendar,
                  agendamento/[id], remarcar/[id], entrar, criar-conta, +not-found
  features/
    auth/ explore/ shops/ booking/ appointments/ notifications/ account/
                  each with api/, hooks/, components/, lib/ as needed
  shared/
    api/          fetch client, errors, session store, storage adapter, query client
    ui/           theme tokens, text, button, field, screen states, list rows
    lib/          error messages, money, time-zone helpers
  gql/            generated by codegen (committed, checked in CI)
  test/           fake API, render helpers, fixtures
```

Route files stay thin: they read params and render a feature screen, so the screens are testable without the router.

## Tests

- **Unit**: session store (hydrate, single-flight refresh, sign out on a rejected token, keep it offline), API client (token, refresh and retry, error mapping), money and time helpers, date strip and slot grouping, the 2-hour rule.
- **Component** (fake API): explore with location granted, denied, and search; shop and barber screens; booking (choose date and time, reminder, confirm, `SLOT_UNAVAILABLE` refetch, signed out goes to sign in and comes back); appointments list and detail (cancel, reschedule, the 2-hour rule); notifications (badge, mark read, open); account (rename, sign out); sign in and sign up errors.
- **End to end** (Playwright on the web build, real API): book as a new customer from Explorar, signing up on the way, and see it in Agendamentos; cancel it; reschedule another; a cancellation by the barber shows up in Avisos.
- **CI**: a `mobile` job (codegen diff, lint, typecheck, format, tests, web export) and a `mobile-e2e` job with the services.

## Delivery

One PR on `feat/v3-customer-app`, with an independent review before it is opened. Docs: README (status row, running the app), ADR 8 (the customer app with Expo in the same repo), and Portuguese study notes in `learnings/` (the app's architecture, Expo Router, session on mobile, tests on React Native), plus the app's section in `Stack.md`.

## Non-goals

Push notifications, payments, reviews and ratings, favorites, a map view, signing in with Google or Apple, offline mode, light theme, i18n, store builds (EAS) and publishing.

## Anti-goals

A second set of business rules on the phone (the API stays the authority; the app mirrors only what it needs to explain a disabled button), a global state library next to TanStack Query, or native modules that would force a development build instead of Expo Go.
