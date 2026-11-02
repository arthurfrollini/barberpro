# 4. The database is the final guard against double booking

Date: 2026-10-30. Status: accepted and implemented (phase 3).

## Context

The domain checks that a time is free before booking, but two customers can submit the same time at the same moment. Both checks pass, and both inserts would succeed.

## Decision

`appointments` gets two exclusion constraints, one per barber and one per customer:

```sql
EXCLUDE USING gist (barber_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
  WHERE (status = 'booked')
```

A violation is translated into the domain error `SLOT_UNAVAILABLE`. An integration test fires two bookings for the same slot in parallel and expects exactly one to succeed.

## Consequences

- The rule holds even under concurrency, without locks in application code.
- Canceled appointments do not block the slot, because of the `WHERE` clause.
