# 2. Hexagonal modules with tactical DDD where the rules are

Date: 2026-10-30. Status: accepted.

## Context

Most of the API is plain create, read and update. The scheduling part is not: a booking must fit the barber's hours, skip blocked days, never overlap another booking, and respect a two-hour window for changes. Those rules need tests that run without a database or a clock.

## Decision

Code is split into four modules (`identity`, `shops`, `scheduling`, `notifications`). Each has `domain/` (entities, value objects, errors), `application/` (use cases and the ports they need) and `adapters/` (GraphQL, TypeORM, security, mail). Domain and application code imports no framework, which ESLint enforces. TypeORM entities are separate `*Record` classes with mappers. Adapters are wired by hand in `src/container.ts`.

Aggregates and value objects are used where the rules are (the appointment and the barber's schedule). Simple entities stay simple. There is no strategic DDD (bounded contexts, context maps), CQRS or event sourcing.

## Consequences

- Use cases are tested with in-memory adapters and a fixed clock, in milliseconds.
- Each persisted entity costs a record class and a mapper. That is the price of keeping ORM concerns out of the domain.
- A new client (an MCP server, a CLI) would be another driving adapter calling the same use cases.
