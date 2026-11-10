# 8. The customer app with Expo, in the same repository

Date: 2026-11-05. Status: accepted.

## Context

Customers book through the API, but only barbers and owners had a client. Customers book from their phones, so their app is a mobile one: it needs location, secure storage for the session, and the platform's look of lists, headers and alerts. Like the dashboard, it depends on the GraphQL schema.

## Decision

The customer app lives in `mobile/`, with its own `package.json`, built with Expo (SDK 58) and Expo Router. Codegen reads the API's SDL files, as the dashboard's does. The app first used only modules that ship in Expo Go, so it ran on a phone or simulator without a native build. Push notifications changed that in V4: remote push needs a development build ([ADR 9](0009-push-notifications-through-expo.md)).

The session sits in `expo-secure-store` (the iOS Keychain, the Android Keystore), read into memory once at start-up while the splash screen is up. On web, where SecureStore does not exist, it falls back to `localStorage`.

## Consequences

- A schema change runs the app's codegen, typecheck and tests in the same CI run, next to the dashboard's.
- Expo also builds the app for the web. The end-to-end tests drive that build with Playwright against the real API, which runs in CI without simulators. The web build is a test target, not a product.
- Hermes, React Native's engine, is not Node, where the unit tests run. The first run in Expo Go crashed on `Intl.RelativeTimeFormat`, which Hermes lacks; a test now keeps it out, and the screens were checked on the iOS simulator before merge.
- Push notifications came later, in V4 ([ADR 9](0009-push-notifications-through-expo.md)).
- Store builds (EAS) and publishing are left for later; the app config already carries a bundle identifier.
