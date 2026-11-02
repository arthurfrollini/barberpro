# Phase 4: notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn scheduling events into in-app notifications, queued emails and reminders, and push every change of a barber's agenda live over a GraphQL subscription.

**Architecture:** New module `src/modules/notifications`. Its `handleSchedulingEvents` use case is the adapter behind scheduling's `SchedulingEvents` port: it writes a `notifications` row per recipient, enqueues an email, schedules or removes the reminder, and publishes an agenda change. Email and reminders run on BullMQ (Redis) in a separate worker process (`src/worker.ts`, its own compose service); the API only enqueues. The subscription uses Yoga's `createPubSub` over a Redis event target, so it works with several API instances.

**Tech Stack:** phase 3 stack plus `bullmq` and `@graphql-yoga/redis-event-target`.

**Spec:** `docs/superpowers/specs/2026-10-30-barberpro-api-design.md`

## Global Constraints

- Notifications in v1: new booking (to the barber), cancellation (to the other party), reschedule (to the other party), reminder (to the customer, a delayed job removed on cancel and moved on reschedule), invite (email only).
- Email goes through a queue, never inline in a request. Push replaces email later by adding an adapter; no push in v1.
- Reminder lead is the one the customer chose (null = no reminder).
- `agendaChanged` is only for the signed-in barber's own agenda.
- A failure to notify never fails the booking that caused it: it is logged.

## Review Focus

- A reminder for an appointment that was canceled or rescheduled after the job was queued: the worker sends nothing (or the new time only).
- A reschedule by the barber notifies the customer, and one by the customer notifies the barber; never the actor.
- Reminder whose time has already passed (booked 10 minutes before with a 15-minute lead): not scheduled.
- `markNotificationRead` on someone else's notification: `NOTIFICATION_NOT_FOUND`.
- A subscription opened without a token, or by a non-barber: an error, not a silent stream.

---

### Task 1: Notification domain, table and repository

**Files:** migration `<ts>-notifications.ts`, `src/modules/notifications/{domain/notification.ts,application/ports.ts,adapters/persistence/*}`, tests.

Table `notifications(id, user_id → users, type varchar(32), title varchar(120), body varchar(500), appointment_id → appointments null, read_at null, created_at)`, index `(user_id, created_at desc)`.

**Produces:** `Notification.create({userId, type, title, body, appointmentId}, now)`, `markRead(now)`; `NotificationRepository { insert(n[]), listForUser(userId, {limit, offset}), markRead(id, userId, at): Promise<boolean>, unreadCount(userId) }`.

- [ ] Integration round trip; markRead only for the owner. Commit `feat(notifications): add the notification table and repository`.

### Task 2: Turning events into notifications

**Files:** `src/modules/notifications/application/{handle-events.ts,messages.ts,reminders.ts}` + tests with fakes.

**Produces:** `handleSchedulingEvents(deps, events)` where `deps = { notifications, mailQueue: { enqueue(message) }, reminders: { schedule(appointmentId, runAt), cancel(appointmentId) }, agenda: { publish(barberId, change) }, people: { user(id), barberUser(barberId) }, clock, log }`. Scheduling events gain `byUserId` (who acted). Rules: booked → barber; canceled → customer if the barber or the system canceled, barber if the customer did; rescheduled → the other party; every event → `agenda.publish`. Reminder: scheduled at `startsAt - lead` when that is in the future; removed on cancel; replaced on reschedule. `sendReminder(deps, appointmentId)` (the worker's job): only if the appointment is still booked and its reminder time is now or past, and within the lead window. Errors inside the handler are logged, not thrown.

- [ ] Unit tests per rule and per Review Focus line. Commit `feat(notifications): notify, email and remind on scheduling events`.

### Task 3: Queue, worker and the invite email

**Files:** `src/shared/adapters/queue/{bullmq-mail-queue.ts,bullmq-reminders.ts}`, `src/worker.ts`, `docker-compose.yml` (service `worker`), `src/container.ts`, integration tests against Redis.

- [ ] Integration: a mail job runs through a real BullMQ worker into a fake mailer; a reminder job is delayed by the right amount and removed by `cancel`; `schedule` twice keeps one job (jobId `reminder:<appointmentId>`).
- [ ] The phase 2 invite email now goes through the queue (`QueueMailer` implements `Mailer`).
- [ ] Commit `feat(notifications): send email and reminders from a BullMQ worker`.

### Task 4: GraphQL: notifications and the live agenda

**Files:** `src/modules/notifications/adapters/graphql/{notifications.graphql,notifications.resolvers.ts}`, pubsub in `src/shared/adapters/graphql/pubsub.ts`, `test/e2e/notifications.test.ts`.

SDL: `Notification { id type title body appointment read createdAt }`, `notifications(limit = 20, offset = 0)`, `unreadNotificationCount`, `markNotificationRead(id)`, `Subscription.agendaChanged: AgendaChange! { type: AgendaChangeType!, appointment: Appointment!, previousStartsAt }`.

- [ ] e2e: Ana books with João → João has one unread `APPOINTMENT_BOOKED`; João cancels → Ana gets `APPOINTMENT_CANCELED`; marking someone else's notification → `NOTIFICATION_NOT_FOUND`.
- [ ] e2e over SSE on a real port: João subscribes, Ana books, the first event is `BOOKED` with the appointment id; no token → error.
- [ ] Commit `feat(notifications): expose notifications and the agendaChanged subscription`.

### Task 5: Docs

- [ ] README (worker, Mailpit, subscription example), `learning/Notificacoes-Filas-e-Tempo-Real.md`, learning index and numbers. Commit `docs: document phase 4`.
