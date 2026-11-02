# BarberPro V2: many shops per person. Design

Date: 2026-11-02. Status: Arthur set the goal; the rest are Claude's calls, listed below for review.

## What Arthur asked for

- A barber can accept invites from more than one barbershop.
- The dashboard switches between barbershops from a menu in the bottom-left corner.
- An owner can have more than one barbershop.
- The `learnings` folder explains the stack, GraphQL and the rest coherently; the README is current.

## Why

v1 assumed one shop per person (a unique owner per shop row, one active barber profile per user). Real barbers often work in two places, and an owner with a second location had to sign up again with another email.

## Model

Nothing changes in who owns what: a **barbershop** has one owner; a **barber** profile belongs to one user in one shop. What changes is how many:

- A user may own any number of shops.
- A user may have one active barber profile **per shop** (never two in the same shop).
- Each barber profile keeps its own services, prices, weekly hours and days off. José can charge R$ 50 at one shop and R$ 60 at the other, and work mornings here and evenings there.

## Rules (Claude's calls)

1. **A person cannot be in two places at once.** Bookings for any of a user's barber profiles never overlap: `availableSlots` at shop A leaves out times José is booked at shop B, and the database enforces it with a third exclusion constraint on `appointments (barber_user_id, period)` for booked appointments. A booking that loses that race gets `SLOT_UNAVAILABLE`, as today.
2. **Days off and hours stay per shop.** Blocking a day at A does not block it at B.
3. **Owners may barber in their own shops and in others.** v1's open question (an owner accepting another shop's invite) is settled: it is allowed.
4. **Removing a barber from one shop** affects only that profile's appointments, with the same 2-hour rule.
5. **A barber cannot book themselves** at any of their shops (already true: checked by user).

## API changes (breaking; the dashboard is the only client)

Explicit ids replace "the signed-in user's shop or profile":

| v1 | V2 |
| --- | --- |
| `myBarbershop: Barbershop` | `myBarbershops: [Barbershop!]!` |
| `myBarberProfile: Barber` | `myBarberProfiles: [Barber!]!` |
| `updateBarbershop(input)` | `updateBarbershop(id, input)` |
| `inviteBarber(email)` | `inviteBarber(shopId, email)` |
| `becomeBarber` | `becomeBarber(shopId)` |
| `updateBarberProfile(input)` | `updateBarberProfile(barberId, input)` |
| `createService(input)` | `createService(barberId, input)` |
| `mySchedule`, `barberAgenda(date)` | `mySchedule(barberId)`, `barberAgenda(barberId, date)` |
| `setWeeklySchedule(intervals)`, `blockDate(date)`, `unblockDate(date)` | the same with `barberId` |
| `subscription agendaChanged` | `agendaChanged(barberId)` |

Each id is checked against the signed-in user: someone else's shop gives `NOT_SHOP_OWNER`, someone else's profile `NOT_A_BARBER`. `SHOP_ALREADY_OWNED` disappears. `ALREADY_A_BARBER` now means "already a barber in this shop".

Migration: drop the unique owner on `barbershops` (keep an index); replace the one-active-profile-per-user index with one per user and shop; add `appointments.barber_user_id` (filled from `barbers`), its exclusion constraint, and an index for "this user's busy times".

## Dashboard

- **Workspaces.** Each shop the user owns or barbers in is a workspace: the shop, the user's barber profile there (if any) and whether they own it. Roles now come from `myBarbershops` and `myBarberProfiles`.
- **Switcher** at the bottom of the sidebar (and of the phone menu): the active shop's logo and name, and a menu listing every workspace with its role ("Dono", "Barbeiro", "Dono e barbeiro"), then "Nova barbearia" and "Aceitar convite". The choice is remembered per user in the browser; a missing or stale choice falls back to the first workspace where the user barbers, else the first owned.
- **Every screen acts on the active workspace.** Agenda, hours, services and profile use its barber profile; Barbearia and Equipe use its shop. Query keys include the id, so switching shows the right data at once and never mixes shops.
- **Navigation follows the active workspace's roles**, as v1 did for the whole account. A user with no workspace sees Começar.
- **New shop** from the switcher opens the shop form; on success that shop becomes active. Accepting an invite makes that shop active.
- **Live agenda** subscribes to the active profile and resubscribes on switch. A notification about another shop's appointment switches to that shop when opened.
- Profile: the name is the account's; bio and photo are per shop profile.

## Docs

- Rename `learning/` to `learnings/` (Arthur's word for it).
- New notes: `Stack.md` (every technology, what it does here and why it was chosen, front and back), `Multiplas-Barbearias.md` (this change: model, rules, the cross-shop constraint, the switcher).
- `GraphQL.md` updated for V2 and for how the dashboard consumes the schema (codegen client preset, typed documents, fragments, SSE).
- README: V2 in the status table, the model, the feature list.

## Delivery

One PR (#9): the API change is breaking and the dashboard is its only client, so both move together (CI runs the dashboard's codegen against the new schema). It gets an independent review before merge.

## Non-goals

Moving a barber's services or hours between shops, shared customers lists, per-shop notification settings, owner seeing all barbers' agendas.
