# V4 push notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every in-app notification also reaches the recipient's phones as a push, and tapping it opens the app where it belongs.

**Architecture:** API: a `push_tokens` table and two mutations; `notify()` enqueues a push job next to the email; the worker sends it to Expo's push API through a small `fetch` client and prunes dead tokens from tickets and receipts. App: a development build with expo-notifications behind a `PushDevice` abstraction; permission asked after the first booking or from Conta; tokens registered while signed in and unregistered on sign out; taps open `data.url`.

**Tech Stack:** Node 24, Fastify, GraphQL Yoga, TypeORM, BullMQ, Vitest; Expo SDK 58, expo-notifications, expo-dev-client, Jest + jest-expo + RNTL.

**Spec:** `docs/superpowers/specs/2026-11-10-v4-push-notifications-design.md`

## Global Constraints

- Push text in Portuguese, same wording as the app's Avisos for the event; email and stored notifications stay English.
- `data.url`: customer → `/agendamento/<appointmentId>`; barber → `/avisos`. `badge`: the recipient's unread count when the job runs.
- Expo push API: base `EXPO_PUSH_URL` (default `https://exp.host/--/api/v2/push`), `POST /send` up to 100 messages, `POST /getReceipts` up to 1000 ids; optional bearer `EXPO_ACCESS_TOKEN`; 429 and 5xx throw (BullMQ retries with backoff).
- Receipt check: a delayed job 15 minutes after send.
- Token format: `/^Expo(nent)?PushToken\[[^\]]+\]$/`, else `INVALID_PUSH_TOKEN`.
- App: never ask for permission at launch; no push on web.
- Coverage: API stays above 90% lines; the app gets a Jest coverage threshold.

## Review Focus

1. A phone that signs in as another user must stop getting the first user's pushes (upsert moves the token; sign-out unregisters).
2. A push job for a user with no tokens is a no-op, not an error that retries.
3. A notification tapped while the app was closed (cold start) still opens its URL once, not on every later start.
4. Expo answering 429 or 5xx retries; a malformed ticket list never deletes tokens it does not name.
5. Unregister on sign-out must not block sign-out when offline.

---

### Task 1: Push tokens in the API
Files: `src/modules/notifications/domain/push-token.ts` (+test), migration `…-push-tokens.ts`, `adapters/persistence/push-token.record.ts`, `typeorm-push-token-repository.ts`, `application/push-tokens.ts`, SDL + resolvers, `test/integration/notifications/push-tokens.test.ts`, `test/e2e/push.test.ts`.
Produces: `PushTokenRepository { save(t), remove(token, userId), forUser(userId): Promise<PushTokenRow[]>, removeTokens(tokens) }`; `registerPushToken(deps, userId, raw, platform)`; `unregisterPushToken(deps, userId, raw)`.
- [ ] Tests first (parse, upsert moves owner, cascade on user delete, GraphQL register/unregister/auth/validation); implement; `npm test`; commit.

### Task 2: Push copy and the push queue
Files: `application/push-messages.ts` (+test), `ports.ts` (`PushQueue`, `PushJob`), `handle-events.ts`, `reminders.ts`, `bullmq.ts` (`BullMqPushQueue`), `testing/fakes.ts`, container.
Produces: `PushJob = { userId, title, body, url }`; `pushFor(event, recipient)`.
- [ ] Tests first (each event × recipient copy and url; notify enqueues one push per notification; a push enqueue failure does not stop email); implement; commit.

### Task 3: Sending, tickets and receipts
Files: `adapters/push/expo-push-sender.ts`, `application/send-push.ts` (+test), `bullmq.ts` (push and receipt workers), `worker.ts`, `config.ts`, `test/integration/push-sender.test.ts`, `test/integration/queue.test.ts`.
Produces: `PushSender { send(messages): Promise<PushTicket[]>, receipts(ids): Promise<Record<string, PushReceipt>> }`; `sendPush(deps, job)`; `checkReceipts(deps, { tickets })`.
- [ ] Tests first (no tokens no-op; badge = unread; DeviceNotRegistered ticket deletes; receipts job scheduled with accepted ids; receipt DeviceNotRegistered deletes; sender chunks 101 into 100+1; 429 throws; bearer sent when configured; worker drains queue to a fake server); implement; commit.

### Task 4: The app registers its token
Files: `mobile/app.json`, `mobile/package.json`, `src/features/push/{api/push.ts,lib/push-device.tsx,hooks/use-push.ts}` (+tests), `features/auth/hooks/use-auth.ts` (sign-out unregister).
Produces: `PushDevice { supported, permission(), request(), token(), onReceive(cb), onResponse(cb), lastResponse(), clearLastResponse() }`; `usePushRegistration()`; `useEnablePush()`.
- [ ] Tests first; implement; `npm run check`; commit.

### Task 5: Asking, receiving and opening
Files: `features/push/components/{enable-push-card.tsx,push-listener.tsx,push-setting.tsx}` (+tests), `appointment-screen.tsx`, `account-screen.tsx`, `app/_layout.tsx`; coverage script and threshold.
- [ ] Tests first; implement; check; commit.

### Task 6: Native check, docs and review
- [ ] `eas init` (Arthur logged in), `npx expo run:ios`, `xcrun simctl push` a payload, screenshots; ADR 9, ADR 8, README, learnings; coverage numbers; final review; PR.
