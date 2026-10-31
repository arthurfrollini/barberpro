# Dashboard 2: agenda. Implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A barber opens the dashboard and sees the day's appointments on a timeline, cancels or moves one within the 2-hour rule, and sees bookings land live; everyone gets a notification bell.

**Architecture:** One API addition (`rescheduleSlots`) in the scheduling module, following its existing layering. In `web/`, an `agenda` feature (timeline maths as pure functions, hooks over TanStack Query, a sheet for one appointment, an SSE subscription that invalidates queries) and a `notifications` feature (bell in the header).

**Tech Stack:** as plan 1, plus `graphql-sse` for the subscription.

**Spec:** `docs/superpowers/specs/2026-10-31-dashboard-design.md`

## Global Constraints

- Everything in plan 1's Global Constraints.
- Times shown in the shop's time zone (`barber.barbershop.timezone`), never the browser's.
- The selected day lives in the URL (`/agenda?dia=2026-11-02`); no `dia` means today in the shop's zone.
- Two-hour rule on the client mirrors the API: an appointment can be canceled or moved while `startsAt - now >= 2h`. The API stays the authority.
- Money as `formatBRL`; the day's total counts booked appointments only.

## Review Focus

- A booked and a canceled appointment at the same time: both visible, side by side, the canceled one dimmed; never stacked on top of each other.
- An appointment outside the day's working hours (hours changed after booking, or a day with no hours): the timeline grows to show it.
- The SSE stream drops (API restart, laptop sleep): it reconnects and refetches the agenda, without a flood of toasts.
- An appointment that crossed the 2-hour mark while its sheet was open: the API's `CANCELLATION_WINDOW_CLOSED` shows in Portuguese and the sheet updates.
- A day with no appointments, and a day the barber blocked: designed empty states, not a blank grid.

---

### Task 1: API `rescheduleSlots`

**Files:**
- Modify: `src/modules/scheduling/application/booking.ts`, `src/modules/scheduling/adapters/graphql/scheduling.graphql`, `scheduling.resolvers.ts`, generated resolvers (`npm run codegen`)
- Test: `src/modules/scheduling/application/scheduling.test.ts`, `test/e2e/scheduling.test.ts`

**Interfaces:**
- Produces: `rescheduleSlots(deps: SchedulingDeps, actorId: string, input: { appointmentId: string; date: string }): Promise<Date[]>`; SDL `rescheduleSlots(appointmentId: ID!, date: String!): [DateTime!]!` with description "Free start times for moving an appointment to a date (YYYY-MM-DD in the shop's zone), using its own duration and ignoring its current slot. Errors: APPOINTMENT_NOT_FOUND, APPOINTMENT_CANCELED, CANCELLATION_WINDOW_CLOSED, INVALID_DATE."

- [ ] **Step 1:** Unit tests: the barber and the customer both get slots that include starts overlapping the appointment's own current time (João 30-minute cut at 17:00 UTC; 17:15 UTC is listed); another user gets `APPOINTMENT_NOT_FOUND`; a canceled appointment gives `APPOINTMENT_CANCELED`; 1h59 before the start gives `CANCELLATION_WINDOW_CLOSED`; the slots use the snapshot duration even after the service changed to 60 minutes. E2E: one `rescheduleSlots` call through GraphQL returns ISO strings.
- [ ] **Step 2:** FAIL, implement with `startsOn(..., excludeId)` and `Appointment.assertChangeable`, PASS. `npm run codegen`, lint, typecheck, all API suites. Commit `feat(scheduling): rescheduleSlots query for moving an appointment`.

### Task 2: Agenda maths

**Files:**
- Create: `web/src/features/agenda/lib/timeline.ts`, `web/src/features/agenda/lib/rules.ts`
- Test: next to each

**Interfaces:**
- Produces:
  - `type TimelineItem = { id: string; start: number; end: number }` (minutes of the local day).
  - `timelineBounds(intervals: { startTime: string; endTime: string }[], items: TimelineItem[]): { start: number; end: number }`: earliest interval start and latest end rounded out to whole hours; 08:00 to 20:00 with no intervals; widened (to whole hours) to contain every item; clamped to 0 and 1440.
  - `layoutColumns(items: TimelineItem[]): Map<string, { column: number; columns: number }>`: items that overlap share a group and get distinct columns (greedy by start time); `columns` is the group's width.
  - `canChange(startsAt: string, now: Date): boolean` (`>= 2h`), `TWO_HOURS_MS`.
- [ ] **Step 1:** Tests: bounds 09:30-18:00 → 09:00-18:00; split 10-12 and 14-22 → 10:00-22:00; none → 08:00-20:00; an item 07:15-07:45 widens to 07:00; an item ending 23:59 widens to 24:00. Columns: two disjoint items → each `{0,1}`; booked 14:00-14:30 and canceled 14:00-14:30 → columns 0 and 1 of 2; a chain A(10-11) B(10:30-11:30) C(11:15-12) → A0 B1 C0, all `columns: 2`. `canChange` at exactly 2h → true, 1h59 → false.
- [ ] **Step 2:** FAIL, implement, PASS. Commit `feat(web): agenda timeline bounds, column layout and the two-hour rule`.

### Task 3: Agenda data

**Files:**
- Create: `web/src/features/agenda/api/agenda.ts`, `web/src/features/agenda/hooks/use-agenda.ts`
- Test: `web/src/features/agenda/hooks/use-agenda.test.tsx`

**Interfaces:**
- Produces:
  - api: `fetchAgenda(date)`, `fetchMySchedule()`, `cancelAppointment(id)`, `rescheduleAppointment(id, startsAt)`, `fetchRescheduleSlots(id, date)`; `type AgendaAppointment` (id, startsAt, endsAt, status, serviceName, priceCents, durationMinutes, reminderLeadMinutes, cancelReason, canceledAt, customer { id name }).
  - hooks: `agendaKeys = { all: ['agenda'], day: (date) => ['agenda', date] }`, `useAgenda(date)`, `useMySchedule()` (key `['schedule']`), `useCancelAppointment()` and `useRescheduleAppointment()` (on success: write the returned appointment into its day's cache and invalidate `agendaKeys.all` and `['notifications']`), `useRescheduleSlots(id, date | null)` (disabled without a date).
- [ ] **Step 1:** Test: after `useCancelAppointment` succeeds, the cached day shows the appointment as `CANCELED` before any refetch; after `useRescheduleAppointment` moves an appointment to another day, both days refetch.
- [ ] **Step 2:** FAIL, implement, PASS. Commit `feat(web): agenda queries and mutations`.

### Task 4: Agenda page

**Files:**
- Create: `web/src/features/agenda/pages/agenda-page.tsx`, `components/day-toolbar.tsx`, `components/day-summary.tsx`, `components/timeline.tsx`, `components/appointment-sheet.tsx`, `components/reschedule-picker.tsx`
- Modify: `web/src/app/routes.tsx` (replace the placeholder)
- Test: `web/src/features/agenda/pages/agenda-page.test.tsx`

**Interfaces:**
- Consumes: Tasks 2 and 3; `useRoles()` for the shop's time zone; `todayIn`, `addDays`, `formatLongDate`, `formatTime`, `minutesOfDay`, `weekdayOf`, `formatBRL`, `messageFor`.
- Behaviour:
  - Toolbar: "Hoje", previous and next day buttons (`aria-label` "Dia anterior", "Próximo dia"), a date input, and the long date as the page heading's description.
  - Summary: "3 agendamentos · R$ 150,00" style text without the middle dot: "3 agendamentos, R$ 150,00 previstos"; "Nenhum agendamento" when empty.
  - Timeline: an `<ol aria-label="Agendamentos do dia">`, one `<li>` per appointment containing a button named "14:00 Ana, Corte" (canceled: "14:00 Ana, Corte, cancelado"); hour labels in Roboto Slab; a current-time line on today only (`aria-hidden`).
  - Blocked day (`mySchedule.blockedDates` contains the date): a note "Dia bloqueado" above the timeline.
  - Empty day: `EmptyState` "Nenhum agendamento neste dia" with the working hours of that weekday or "Folga".
  - Sheet: customer, service, time range, price, reminder ("Lembrete 15 min antes" or "Sem lembrete"), status and, when canceled, the reason in Portuguese. Buttons "Cancelar agendamento" (AlertDialog: "Cancelar o agendamento de Ana às 14:00? O cliente recebe um aviso.") and "Remarcar" (date input + slot buttons from `rescheduleSlots`, then "Confirmar novo horário"). Both disabled with the text "Faltam menos de 2 horas: não dá mais para cancelar ou remarcar." when `!canChange`. API errors show inside the sheet via `messageFor`; success closes the dialog and shows a toast ("Agendamento cancelado", "Agendamento remarcado para 15:30").
- [ ] **Step 1:** Tests (MSW): renders appointments in the shop's zone (17:00Z shows "14:00"); previous/next day changes `?dia=` and requests that date; summary counts only booked; clicking an appointment opens the sheet; cancel confirms and the item becomes "cancelado"; within 2 hours both actions are disabled with the explanation; reschedule lists slots for a chosen date and moves the appointment; `CANCELLATION_WINDOW_CLOSED` from the API shows the Portuguese message; empty and blocked days show their notes.
- [ ] **Step 2:** FAIL, implement, PASS. Screenshot desktop and phone width and fix what looks wrong. Commit `feat(web): agenda day view with cancel and reschedule`.

### Task 5: Live agenda

**Files:**
- Create: `web/src/shared/api/subscriptions.ts`, `web/src/features/agenda/api/live.ts`, `web/src/features/agenda/hooks/use-agenda-live.ts`
- Modify: `agenda-page.tsx` (mount the hook)
- Test: `web/src/features/agenda/hooks/use-agenda-live.test.tsx`

**Interfaces:**
- Produces:
  - `subscribe<R>(document: TypedDocumentString<R, never>, handlers: { next(data: R): void; error?(e: unknown): void }): () => void` using `graphql-sse`'s `createClient({ url: origin + '/graphql', headers: async () => (token ? { authorization } : {}), retryAttempts: Infinity, retry: exponential up to 30 s })`, distinct connections mode.
  - `useAgendaLive(timeZone: string)`: subscribes to `agendaChanged`; for each event invalidates `['agenda']` and `['notifications']` and shows a toast: BOOKED "Novo agendamento: Ana, seg 2/11 às 14:00"; CANCELED "Agendamento cancelado: Ana, seg 2/11 às 14:00"; RESCHEDULED "Ana remarcou para seg 2/11 às 15:30". After a reconnect it invalidates once, silently.
- [ ] **Step 1:** Test with an injected subscribe function: an event invalidates the agenda (a refetch happens) and shows the toast text; unmount unsubscribes.
- [ ] **Step 2:** FAIL, implement, PASS. Commit `feat(web): live agenda over server-sent events`.

### Task 6: Notifications

**Files:**
- Create: `web/src/features/notifications/api/notifications.ts`, `hooks/use-notifications.ts`, `components/notification-bell.tsx`
- Modify: `web/src/app/layout/app-layout.tsx` (bell before the account menu)
- Test: `web/src/features/notifications/components/notification-bell.test.tsx`

**Interfaces:**
- Produces: `useUnreadCount()` (key `['notifications', 'unread']`, refetch every 60 s and on window focus), `useNotifications()` (key `['notifications', 'list']`, 20 newest, loaded when the popover opens), `useMarkRead()` (optimistic: item read, count minus one).
- Behaviour: a bell button named "Notificações" or "Notificações, 3 não lidas"; a badge with the count (9+ above nine); a popover listing title, body and relative time ("há 5 min"); unread items marked; clicking an item marks it read and, for an appointment, goes to `/agenda?dia=<local date>`; empty state "Nada por aqui ainda".
- [ ] **Step 1:** Tests: badge shows the count; opening lists notifications; clicking an unread one calls `markNotificationRead` and the count drops at once.
- [ ] **Step 2:** FAIL, implement, PASS. Commit `feat(web): notification bell`.

### Task 7: End to end

**Files:**
- Create: `web/e2e/support/api.ts` (GraphQL calls against `API_URL`: `signUp`, `createShopAndBecomeBarber`, `setHours`, `createService`, `book`), `web/e2e/agenda.spec.ts`

- [ ] **Step 1:** A barber is set up through the API (shop, hours every weekday 08:00 to 20:00, a 30-minute service) and signs in through the UI; a customer booked tomorrow at 10:00 through the API shows on tomorrow's agenda; with the agenda open, a second booking by another customer appears without a reload, with its toast, and the bell count goes up; the barber cancels the first booking from the sheet and it reads "cancelado".
- [ ] **Step 2:** PASS. Commit `test(web): agenda end to end`.

### Task 8: Docs

- [ ] README status row; `learning/Agenda-no-Front.md` (timeline maths, cache updates after mutations, SSE and invalidation, the 2-hour rule on both sides) and the index. Commit `docs: agenda study notes`.
