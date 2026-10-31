# Dashboard 4: owner. Implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A new user creates their shop or accepts an invite; an owner edits the shop page, joins as a barber, invites barbers and manages the team. This completes the dashboard v1.

**Architecture:** One API change (the invite email links to the dashboard). In `web/`: `onboarding` (Começar), `shop` (shop form, create and edit), `team` (barbers and invites) and `invites` (accept page) features.

**Tech Stack:** as before.

**Spec:** `docs/superpowers/specs/2026-10-31-dashboard-design.md`

## Global Constraints

- Everything in plans 1 to 3.
- Founded year 1900 to the current year; time zone from a short list of Brazilian IANA zones (the API accepts any IANA zone); latitude and longitude as decimal numbers, with "Usar minha localização" filling them from the browser.
- `/barbearia` and `/equipe` are for owners; `/comecar` is where someone without a shop creates one; `/convite` needs sign-in and keeps `?codigo=` through it.
- Invite statuses in Portuguese: pendente, aceito, revogado, expirado.

## Review Focus

- A user who creates a shop: roles refresh, the navigation changes and they land on Barbearia, with "Atender também" offered.
- Opening the invite link while signed out: sign up or sign in, then the code is still filled in.
- Accepting an invite sent to another email: `INVITE_EMAIL_MISMATCH` in Portuguese, naming what to do.
- Removing a barber with bookings: the confirmation explains the 2-hour rule before it happens.
- The browser refuses location: the fields stay editable and the message says why.

---

### Task 1: API invite link

**Files:** `src/config.ts`, `.env.example`, `src/container.ts`, `src/modules/shops/application/ports.ts`, `invites.ts`, tests in `shops.test.ts`; `docker-compose.yml` sets `DASHBOARD_URL`.

**Interfaces:** `DASHBOARD_URL` (default `http://localhost:5180`); `ShopsDeps.inviteLink(token: string): string`; the email text gains "Accept it in the dashboard: <link>" above the code.

- [ ] Test: the sent email contains `http://dash.test/convite?codigo=token-1`. FAIL, implement, PASS. Commit `feat(shops): invite email links to the dashboard`.

### Task 2: Shop form

**Files:** `web/src/features/shop/{api/shop.ts,hooks/use-shop.ts,lib/shop-form.ts,components/shop-form.tsx,pages/shop-page.tsx}`; routes (`/barbearia` under `RequireRole owner`).

**Interfaces:** `useMyShop()` (key `['shop']`: name, description, foundedYear, logoUrl, address, latitude, longitude, timezone, barbers, invites), `useCreateShop()` and `useUpdateShop()` (invalidate `['shop']` and `['roles']`), `useBecomeBarber()`; `shopSchema` (name 1 to 80, description up to 1000, year 1900 to now, address 1 to 200, latitude -90 to 90, longitude -180 to 180, time zone from `TIME_ZONES`), `TIME_ZONES` with Portuguese labels.

- Behaviour: one form for create and edit (logo as a square `ImageField`; "Usar minha localização" with `navigator.geolocation`; the time zone select). Edit sends only changed fields. On Barbearia, an owner who does not barber sees a card "Você também atende?" with "Atender também", which calls `becomeBarber` and then shows the barber pages in the navigation.
- [ ] Tests: validation messages; geolocation fills both fields and a denial shows "Não foi possível pegar sua localização. Preencha à mão."; edit sends only the changed name; "Atender também" calls the mutation and the navigation gains Agenda. Commit `feat(web): shop page`.

### Task 3: Começar and accepting invites

**Files:** `web/src/features/onboarding/pages/start-page.tsx`, `web/src/features/invites/{api/invites.ts,hooks/use-accept-invite.ts,pages/accept-invite-page.tsx}`; routes (`/comecar`, `/convite`).

- Behaviour: Começar shows two choices, "Tenho uma barbearia" (reveals the shop form, create mode; on success navigates to `/barbearia`) and "Recebi um convite" (link to `/convite`). An owner or barber who opens Começar is sent to their landing. `/convite?codigo=...` shows the code field filled in and "Aceitar convite"; success refreshes roles and goes to `/agenda` with a toast "Bem-vindo à equipe da Mega Barbearia"; errors in Portuguese.
- [ ] Tests: create from Começar lands on Barbearia; the invite page fills the code from the URL; `INVITE_EMAIL_MISMATCH` shows its message; success lands on the agenda. Commit `feat(web): getting started and accepting invites`.

### Task 4: Team

**Files:** `web/src/features/team/{api/team.ts,hooks/use-team.ts,components/barbers-list.tsx,components/invites-list.tsx,components/invite-form.tsx,pages/team-page.tsx}`; routes (`/equipe`).

- Behaviour: barbers with photo and name ("Você" for the owner's own profile), "Remover" for the others with a confirmation ("Remover José da equipe? Agendamentos dele a 2 horas ou mais são cancelados e os clientes avisados."). An email field and "Enviar convite"; the invites list with status badges and dates ("expira em 7 de novembro"), "Revogar" for pending ones.
- [ ] Tests: inviting sends the email and adds a pending row; `INVITE_ALREADY_SENT` on the field; revoking turns the row into revogado; removing asks and the barber disappears. Commit `feat(web): team and invites`.

### Task 5: End to end

**Files:** `web/playwright.config.ts` (start the worker too, waiting for "worker started"), `web/e2e/support/mailpit.ts`, `web/e2e/owner.spec.ts`.

- [ ] A user signs up, creates a shop in Começar, joins as a barber, invites an email; a second browser context signs up with that email, opens the link from the Mailpit message and accepts; the owner's Equipe shows the new barber and the invite as aceito; the owner removes the barber. Commit `test(web): owner end to end`.

### Task 6: Docs

- [ ] README (dashboard complete, demo flow), `learning/Dono-e-Equipe.md` (onboarding by roles, invites end to end, geolocation, optimistic vs server-confirmed updates) and the index; `learning/Apresentacao.md` gains a dashboard demo script. Commit `docs: owner study notes and dashboard demo`.
