# 6. Dashboard session in localStorage

Date: 2026-10-31. Status: accepted.

## Context

The API returns the access token (15 minutes) and the refresh token (30 days, single use, reuse revokes the session) in the GraphQL response body. The dashboard has to keep them across reloads and tabs.

## Decision

The dashboard stores the session (access token, its expiry, refresh token) in `localStorage` under `barberpro.session`. Every tab reads the same entry. A refresh runs under a Web Lock (`navigator.locks`) and re-reads storage inside it, so when two tabs find the token expiring at once, one refreshes and the other picks up the result instead of reusing the old refresh token.

## Alternatives

- **httpOnly cookie for the refresh token**: scripts could not read it, so an XSS bug could not steal a long-lived token. It needs the API to set and read cookies, CSRF protection on the refresh mutation, and same-site deploys. Worth it before real users; not for v1.
- **Memory only**: safest against theft, but every reload signs the user out.
- **sessionStorage**: per tab, so each tab would need its own sign-in.

## Consequences

- An XSS bug in the dashboard could read the tokens. React's escaping, no `dangerouslySetInnerHTML` and no third-party scripts keep that surface small.
- Signing out in one tab signs out the others (they listen to `storage` events).
- Moving to a cookie later changes `web/src/shared/api/session.ts` and the API's auth adapter, nothing else.
