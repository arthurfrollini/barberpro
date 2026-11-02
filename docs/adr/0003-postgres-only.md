# 3. PostgreSQL only

Date: 2026-10-30. Status: accepted.

## Context

The 2021 version kept notifications in MongoDB and everything else in PostgreSQL. The rewrite needs geographic queries (nearest shops), text search (shops by name) and a guarantee that two bookings never overlap.

## Decision

Everything lives in PostgreSQL 17: PostGIS for distance queries, `pg_trgm` for search, `btree_gist` for the overlap constraint, and a plain table for notifications. Redis is used only for the job queue and subscription pub/sub, never as a source of truth.

## Consequences

- One database to run, back up and migrate, and one transaction can cover a booking and its notification.
- Docker Compose uses the multi-arch `imresamu/postgis` image, since `postgis/postgis` has no arm64 build.
