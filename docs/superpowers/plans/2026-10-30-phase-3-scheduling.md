# Phase 3: scheduling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Barbers set weekly hours and days off; customers see free start times and book, cancel and reschedule under the booking rules; the database refuses double bookings even under concurrency.

**Architecture:** New module `src/modules/scheduling`. The rules are pure domain code: `WeeklySchedule` (validated intervals per weekday), `availableStarts()` (one function used both to list slots and to validate a booking), and the `Appointment` aggregate (two-hour rule, snapshot, reminder lead). Local shop time ↔ UTC goes through a small `Intl`-based helper. Writes that cancel several appointments run in one transaction. Every booking, cancellation and reschedule is published on a `SchedulingEvents` port, which phase 4 turns into notifications and the live agenda; in phase 3 the adapter only records them.

**Tech Stack:** phase 2 stack, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-30-barberpro-api-design.md`

## Global Constraints

- Booking rules 1-7 of the spec, verbatim in intent.
- Available start times every 15 minutes from the start of each working interval. Booking horizon 60 days. A start in the past is rejected; no minimum lead time.
- Reminder lead: null (no reminder) or 5 to 60 minutes in steps of 5.
- A customer cannot hold two overlapping booked appointments; a barber cannot book with themselves.
- Reschedule keeps barber, service and the price/duration snapshot; only the time changes, in place, atomically.
- Archived services cannot be booked.
- Weekly schedules and blocked dates are in the shop's IANA timezone; instants are UTC.
- Two-hour rule: cancel/reschedule only while `startsAt - now >= 2h`. Blocking a day, changing the weekly schedule or removing a barber cancels only appointments starting 2h or more from now.
- `DateTime` inputs must carry `Z` or an offset (closes the phase 1 review finding).

## Review Focus

- Two customers booking the same slot at the same moment: exactly one succeeds, the other gets `SLOT_UNAVAILABLE`.
- A booking at 13:59 local for a 30-minute service when the interval ends at 14:15: refused (`SLOT_UNAVAILABLE`); 13:45 is accepted.
- Cancel at exactly 2h before start: allowed; at 1h59: `CANCELLATION_WINDOW_CLOSED`.
- Blocking today at 06:10 with appointments at 08:00 and 11:00: 08:00 stays, 11:00 is canceled.
- A local date near midnight in America/Sao_Paulo (UTC-3): a 22:30 local appointment is stored as 01:30Z the next day and still belongs to its local date in the agenda.

---

### Task 1: Zoned time and strict DateTime

**Files:** `src/shared/domain/zoned-time.ts` + test, `src/shared/adapters/graphql/date-time.ts` + test.

**Produces:** `localDate(value: string): string` (validates `YYYY-MM-DD`, else `INVALID_DATE`); `toUtc(date: string, minuteOfDay: number, tz: string): Date`; `toLocal(instant: Date, tz: string): { date: string; minuteOfDay: number; weekday: 0..6 }` (0 = Sunday); `addDays(date, n): string`.

- [ ] Tests: São Paulo 2026-11-02 08:00 → `11:00Z`; 22:30 → next day `01:30Z`; round trip; weekday of 2026-11-01 is 0; New York DST change (2026-03-08 03:30 local exists, round trip holds); invalid dates (`2026-02-30`, `2026-1-2`).
- [ ] DateTime scalar rejects `2026-11-02T10:00:00` (no zone) and accepts `...Z` and `...-03:00`.
- [ ] Commit `feat: add shop-local time helpers and a strict DateTime scalar`.

### Task 2: Scheduling domain

**Files:** `src/modules/scheduling/domain/{weekly-schedule.ts,availability.ts,appointment.ts,reminder-lead.ts}` + tests.

**Produces:**
- `WeeklySchedule.of(intervals: {weekday, startMinute, endMinute}[])`: multiples of 5, `0 <= start < end <= 1440`, no overlap on a weekday (`INVALID_SCHEDULE`); `intervalsOn(weekday)` sorted.
- `availableStarts({ schedule, blockedDates: Set<string>, date, timezone, durationMinutes, busy: {startsAt, endsAt}[], now, stepMinutes = 15, horizonDays = 60 }): Date[]`: for each interval of the date's weekday, `start, start+15, ...` while `start + duration <= end`; drops blocked dates, starts `<= now`, starts beyond `now + 60 days`, and anything overlapping `busy`.
- `ReminderLead.parse(minutes: number | null)`: null or 5..60 step 5 (`INVALID_REMINDER_LEAD`).
- `Appointment.book({barberId, customerId, service snapshot, startsAt, reminderLeadMinutes}, now)`, `restore`, `cancel(by: {userId, reason}, now)` (two-hour rule → `CANCELLATION_WINDOW_CLOSED`; already canceled → `APPOINTMENT_CANCELED`), `cancelBySystem(reason, byUserId, now)` (no window check, used by rules 6-7 after the caller filtered), `reschedule(newStartsAt, now)` (two-hour rule on the current start → `CANCELLATION_WINDOW_CLOSED`), `endsAt` from the snapshot duration, `canBeChangedAt(now)`.
- Cancel reasons: `customer`, `barber`, `day_blocked`, `schedule_changed`, `barber_removed`.

- [ ] Tests for every rule above, including the Review Focus boundaries. Commit `feat(scheduling): add schedules, availability and the appointment aggregate`.

### Task 3: Schema and persistence

**Files:** migration `<ts>-scheduling.ts`, `src/modules/scheduling/adapters/persistence/*`, `test/integration/scheduling/*`.

Tables:
- `weekly_intervals(barber_id → barbers, weekday smallint 0..6, start_minute smallint, end_minute smallint, PK (barber_id, weekday, start_minute), CHECK start < end)`.
- `blocked_dates(barber_id → barbers, date date, PK (barber_id, date))`.
- `appointments(id, barber_id → barbers, customer_id → users, service_id → services, service_name, price_cents, duration_minutes, starts_at, ends_at, reminder_lead_minutes null, status varchar check in ('booked','canceled'), cancel_reason null, canceled_by → users null, canceled_at null, created_at, updated_at)` with
  `CONSTRAINT appointments_barber_no_overlap EXCLUDE USING gist (barber_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (status = 'booked')` and the same for `customer_id` (`appointments_customer_no_overlap`); indexes on `(barber_id, starts_at)` and `(customer_id, starts_at)`.

**Produces:** `ScheduleRepository { get(barberId): {schedule, blockedDates}; replaceWeekly(barberId, schedule); block(barberId, date); unblock(barberId, date) }`; `AppointmentRepository { findById; insert (maps the two exclusion violations to SLOT_UNAVAILABLE / CUSTOMER_BUSY); update (same mapping); busyFor(barberId, from, to, excludeId?); bookedFrom(barberId, from); forCustomer(customerId, {from?}); forBarberBetween(barberId, from, to) }`; `schedulingRepositories(manager)`.

- [ ] Integration: round trips; exclusion constraint refuses an overlapping booked row but allows it once the first is canceled; **two parallel inserts for the same slot → exactly one succeeds**; customer overlap refused across two barbers.
- [ ] Commit `feat(scheduling): add tables with exclusion constraints and repositories`.

### Task 4: Use cases

**Files:** `src/modules/scheduling/application/{ports.ts,schedule.ts,booking.ts,agenda.ts}` + tests with in-memory adapters.

**Produces:**
- `setWeeklySchedule(barberUser, intervals)`, `blockDate(barberUser, date)`, `unblockDate`: run in one transaction; cancel (reason `schedule_changed` / `day_blocked`) booked appointments starting `>= now + 2h` that no longer fit; return the canceled ones. Blocking a past local date → `INVALID_DATE`.
- `availableSlots(barberId, serviceId, date)`: public; `BARBER_NOT_FOUND`, `SERVICE_NOT_FOUND` (also archived or another barber's).
- `bookAppointment(customer, {barberId, serviceId, startsAt, reminderLeadMinutes})`: `BARBER_CANNOT_BOOK_SELF`, `SLOT_IN_PAST`, `BEYOND_BOOKING_HORIZON`, `SLOT_UNAVAILABLE` (not among `availableStarts`), `CUSTOMER_BUSY`.
- `cancelAppointment(actor, id)` (customer → reason `customer`, barber → `barber`; anyone else → `APPOINTMENT_NOT_FOUND`), `rescheduleAppointment(actor, id, newStartsAt)` (new time validated with `availableStarts` excluding itself).
- `cancelFutureForBarber(barberId, byUserId, now)`: rule 7; wired into `shops.removeBarber` through a `BarberRemovalHook` port in shops.
- `myAppointments(customer, {upcoming})`, `barberAgenda(barberUser, date)`, `mySchedule(barberUser)`.
- Events published after each successful write: `{ type: 'booked' | 'canceled' | 'rescheduled', appointment, previousStartsAt? }`.

- [ ] Tests per rule, with `FixedClock`. Commit `feat(scheduling): add booking, cancel, reschedule and schedule use cases`.

### Task 5: GraphQL

**Files:** `src/modules/scheduling/adapters/graphql/{scheduling.graphql,scheduling.resolvers.ts}`, loaders for barbers/users on appointments, `test/e2e/scheduling.test.ts`.

SDL: `Appointment { id startsAt endsAt status serviceName priceCents durationMinutes reminderLeadMinutes cancelReason canceledAt barber customer { id name } }`, `WeeklyInterval { weekday startTime endTime }` with times as `"HH:MM"` strings, `BarberSchedule { weekly blockedDates }`. Queries `availableSlots(barberId, serviceId, date: String!): [DateTime!]!`, `myAppointments(upcoming: Boolean = true)`, `barberAgenda(date: String!)`, `mySchedule`. Mutations `setWeeklySchedule(intervals: [WeeklyIntervalInput!]!)`, `blockDate(date)`, `unblockDate(date)`, `bookAppointment(input)`, `cancelAppointment(id)`, `rescheduleAppointment(id, startsAt)`.

- [ ] e2e story: José 08:00-20:00 and João 10:00-12:00 + 14:00-22:00 Mon-Sat; slots for João skip 12:00-14:00; book, overlap refused, cancel at 1h59 refused, reschedule moves in place, block the day keeps the near one.
- [ ] e2e: removing a barber cancels his appointments 2h+ away.
- [ ] Commit `feat(scheduling): expose availability, booking and agendas over GraphQL`.

### Task 6: Docs

- [ ] ADR 0004 status → implemented. README status/examples. `learning/Agenda-e-Regras.md`. Commit `docs: document phase 3`.
