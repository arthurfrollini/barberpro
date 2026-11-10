# BarberPro V4, push notifications: design

Date: 2026-11-10. Status: Arthur set the scope ("push notifications"), agreed to move the app from Expo Go to a development build, and has a free Expo account (no Apple Developer or Firebase account). Everything else is Claude's call, for him to review on the PR.

## Why

The app hears about a change only while it is open: Avisos polls every minute and refetches when the app returns to the foreground. A customer whose barber cancels tomorrow's cut finds out by email, or when they next open the app. Push closes that gap: the notification reaches the phone with the app closed, and tapping it opens the appointment.

Success: a barber cancels from the dashboard; a few seconds later the customer's phone shows "Agendamento cancelado", and tapping it opens that appointment in the app. The unread count on the app icon matches the Avisos tab.

## Decisions Arthur made

- Push notifications are the scope of this version. The app's dev setup stays outside Docker Compose (Metro and the simulator do not mix well with containers); the README makes the second command clearer.
- The app moves from Expo Go to a development build (`expo-dev-client`), which remote push requires.
- Credentials: a free Expo account for the EAS project id. No Apple Developer account (no APNs key) and no Firebase project (no FCM key) for now.

## What that means for proof

Without APNs and FCM keys, Expo's push service accepts a message but cannot deliver it to a real phone (`InvalidCredentials`). So:

- The whole server path is tested against a fake of Expo's push API: tokens, messages, chunking, tickets, receipts, dead tokens.
- The app's registration, permission flow and tap handling are tested in Jest, and checked on the iOS simulator with `xcrun simctl push`, which delivers a notification payload to the app without APNs.
- Real delivery needs the keys only: adding them in EAS (`eas credentials`) changes no code.

## Calls made by Claude

### API

- **Tokens per device, not per user.** A `push_tokens` table: the Expo push token (primary key), the user, the platform (`IOS`, `ANDROID`), created and last-registered times. A user may have several phones; a phone that signs in as someone else moves its token to them (upsert by token), so one phone never gets two people's notifications. Deleting a user cascades.
- **GraphQL**: `registerPushToken(token, platform): Boolean!` and `unregisterPushToken(token): Boolean!`, both for the signed-in user. Unregister removes the token only if it is theirs. A token that is not `ExponentPushToken[...]` or `ExpoPushToken[...]` is `INVALID_PUSH_TOKEN`.
- **Every in-app notification also goes out as a push** to the recipient's devices, through a new BullMQ queue the worker drains, like email: the request that caused it never waits on Expo. Bookings, cancellations, reschedules and reminders, for customers and barbers alike.
- **Push text is Portuguese.** Email and the stored notification stay English (their existing choice); both clients speak Portuguese, and a push is read in the phone's notification list, where the app cannot translate it. The words match what Avisos shows for the same event.
- **Payload**: title, body, `data.url` (the customer's `/agendamento/<id>`; a barber's `/avisos`, since the app shows appointments only from the customer's side), and `badge` set to the user's unread count at send time, so the icon matches the tab.
- **Sender**: our own small client for Expo's push API over `fetch` (no SDK dependency): chunks of 100 messages, one retry policy (BullMQ backoff on 429 and 5xx), an optional `EXPO_ACCESS_TOKEN` for Expo's enhanced security, and `EXPO_PUSH_URL` so tests point it at a fake server.
- **Dead tokens**: a ticket with `DeviceNotRegistered` deletes the token at once. Tickets that were accepted get a receipt check 15 minutes later (a delayed job, as Expo recommends); a receipt with `DeviceNotRegistered` deletes the token. Other errors are logged.

### App

- **expo-notifications + expo-dev-client.** `npx expo run:ios` builds and installs the dev client on the simulator; `npm start` then serves the JavaScript to it. Native folders stay generated and ignored (CNG).
- **Asking at the right moment**: never at launch. The first time a booking succeeds, its "Agendado" screen offers "Ativar avisos no celular", explaining what for. Conta has the same switch, with a link to the phone's settings when permission was denied.
- **Registration**: when signed in and permission is granted, the app gets the Expo push token (Android notification channel first) and registers it; again on each start, which refreshes `last registered`. Signing out unregisters it first, best effort, so the next person to use the phone does not get the last one's notifications.
- **Receiving**: in the foreground, the banner shows and Avisos and Agendamentos refetch. Tapping a notification, from any state (cold start included), opens its `data.url`, then refetches. A device abstraction (`PushDevice`) wraps expo-notifications so screens and hooks are tested without native modules, as `LocationSource` does for location.
- **Web**: no push (the web build is a test target). The Conta row does not show there.

## Tests and coverage

- API unit: token parsing, the push copy for each event and recipient, sending (tokens, badge, dead tokens), receipts.
- API integration: the token repository against Postgres (upsert moves owner, cascade), the Expo sender against a fake HTTP server (chunking, tickets, receipts, HTTP errors), the worker draining the push queue through Redis to the fake server.
- API e2e: register and unregister over GraphQL, auth and validation errors.
- App: registration (permission states, token errors, sign-out unregister), the "Ativar avisos" card and the Conta row, tap handling (warm and cold start), foreground refetch.
- Coverage: the API keeps its line coverage above 90%; the app gets a `test:coverage` script and a Jest threshold so coverage cannot quietly drop.

## Delivery

One PR, on top of the V3 branch while PR #11 is open. Docs: ADR 9 (push), ADR 8 updated (development build instead of Expo Go), README (running the app with the dev build), and a Portuguese study note on push.

## Non-goals

Delivery to real phones (needs APNs and FCM keys), per-type notification settings, quiet hours, rich notifications (images, actions), web push, store builds.

## Anti-goals

Asking for permission on launch, a push without an in-app notification behind it, or a token that keeps receiving after its user signed out on that phone.
