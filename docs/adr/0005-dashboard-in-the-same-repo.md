# 5. Dashboard in the same repository, as a Vite SPA

Date: 2026-10-31. Status: accepted.

## Context

The barber and owner dashboard is the API's first client. It needs the API's GraphQL schema to type its operations, and a change to the schema can break it. It has no public pages to index: everything sits behind sign-in.

## Decision

The dashboard lives in `web/`, with its own `package.json`, lockfile and tooling. GraphQL Code Generator reads the API's SDL files (`../src/**/*.graphql`) directly. It is a single-page app built with Vite; no server rendering.

## Consequences

- A PR that changes the schema runs the dashboard's codegen, typecheck and tests in the same CI run, so a breaking change shows up before merge.
- No workspace tooling (npm workspaces, Turborepo): two independent packages are enough for two apps, and each keeps the versions it needs.
- With no server of its own, the dashboard is static files. In development Vite proxies `/graphql`, `/uploads` and `/files` to the API, so the browser sees one origin and the API needs no CORS; a deploy would do the same with a reverse proxy.
- The mobile app for customers will live elsewhere or in its own folder; it does not change this choice. (It went to `mobile/`, in [ADR 8](0008-customer-app-with-expo.md).)
