# 1. GraphQL, with REST at the edges

Date: 2026-10-30. Status: accepted.

## Context

The API serves a web dashboard (barbers and owners) and a mobile app (customers). The two need different slices of the same data: the dashboard shows a day of appointments with customer and service details, while the app shows shops, barbers and free times. The 2021 version was REST, and the author's other projects already show REST.

## Decision

The API is GraphQL, served by GraphQL Yoga on `/graphql` inside Fastify. The schema is written as SDL files, one per module, and GraphQL Code Generator produces the resolver types. REST stays where GraphQL is the wrong tool: `GET /health` for probes, and file upload and download (phase 2), which are plain HTTP bodies.

## Consequences

- Each client asks for the fields it needs, and the SDL doubles as API documentation.
- Lists that reference other entities need DataLoader to avoid N+1 queries (phase 2).
- Errors use `extensions.code` instead of HTTP status codes.
