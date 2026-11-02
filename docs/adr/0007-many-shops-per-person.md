# 7. Many shops per person, never two places at once

Date: 2026-11-02. Status: accepted.

## Context

v1 allowed one shop per owner and one active barber profile per person. Arthur asked for V2: barbers who accept invites from several shops, owners with several shops, and a switcher in the dashboard.

## Decision

- Ownership and profiles stay as they were; only the counts change. A person has one barber profile per shop they work in, each with its own services, prices, hours, days off, bio and photo.
- Every barber or owner operation names the profile or shop it acts on (`barberId`, `shopId`). The API checks it belongs to the signed-in user and answers `NOT_A_BARBER` or `NOT_SHOP_OWNER` the same way for someone else's id and for an unknown one.
- A person cannot be booked in two places at once. Appointments keep `barber_user_id` (a copy, like the service snapshot); availability subtracts the person's bookings at all their shops; and an exclusion constraint on `(barber_user_id, period)` for booked appointments is the final guard under concurrency.
- Hours and days off stay per profile: blocking a day at one shop does not block it at another.
- The dashboard keeps the active shop in the browser, not on the server.

## Alternatives

- **A "current shop" on the user, server side.** Two tabs on two shops would fight over it, and every request would depend on hidden state.
- **Shared hours and services across a person's shops.** Simpler data, but a barber charges and works differently in each place.
- **Checking the cross-shop overlap only in code.** Two bookings at two shops pass the check at the same moment; only the database sees both writes.

## Consequences

- Breaking GraphQL changes, made in one PR with the dashboard (the only client). A future external client would get optional arguments and `@deprecated` fields instead.
- One more column and one more gist index on `appointments`.
- The dashboard's query keys carry the profile or shop id, and screens remount on a switch.
