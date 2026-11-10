# 9. Push notifications through Expo's push service

Date: 2026-11-10. Status: accepted.

## Context

The customer app learned about a change only while open: Avisos polled every minute and refetched when the app came back to the foreground. A barber's cancellation could go unseen until the next time the customer opened the app. Pushes need a token per phone, a sender on the server, and Apple's and Google's delivery services behind it.

## Decision

- The app gets an Expo push token (`expo-notifications`) and registers it with `registerPushToken`. The API keeps one row per token in `push_tokens`; a phone that signs in as someone else moves to them. When a session ends (sign-out, or one that expired), the app unregisters the token without a session, since only that phone has it; offline, it keeps the token and unregisters it on the next start.
- Every in-app notification also queues a push. The worker sends it to Expo's push API with a small `fetch` client (no SDK), up to 100 messages per request, with the user's unread count as the badge. Expo forwards to APNs and FCM.
- Tokens Expo reports as gone (`DeviceNotRegistered`), in the ticket or in the receipt checked 15 minutes later, are deleted.
- Push text is Portuguese, unlike email and the stored notification: it is read in the phone's notification list, where the app cannot translate it.
- The app moves from Expo Go to a development build (`expo-dev-client`), which remote push requires.

## Consequences

- One sender for both platforms, and no APNs or FCM code on the server. Expo holds the credentials (`eas credentials`); adding them changes no code.
- Until those credentials exist (an Apple Developer account for APNs, a Firebase project for FCM), Expo accepts messages but cannot deliver them to a real phone. The server path is tested against a fake of Expo's API, and the app's handling of a push is checked on the iOS simulator with `xcrun simctl push`.
- Running the app needs `npx expo run:ios` (or `run:android`) once, to build and install the dev client; after that, `npm start` serves the JavaScript as before.
- Expo's servers sit between the API and the phones: a push carries the notification's text and a path in the app, nothing else.
