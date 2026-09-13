# AI usage

I used AI as a code engine, not as the architect. Cursor generated most of the typing in this repo. ChatGPT was the sounding board for sample booking flows, last-seat and expiry edge cases, and a hold-then-pay schema that could survive concurrent writes. The inventory rule, the reservation as the hold, and the read-only quote stayed human decisions.

## Tools

**Cursor** for in-repo generation: the booking wizard, APIs, Prisma models, Vitest tests, and the demo harness.

**ChatGPT** for design work outside the editor: comparable booking solutions, race and webhook edge cases, and a database shape that could refuse a second last-seat winner without relying on the UI.

## What I used AI for

Boilerplate, UI scaffolding, and first drafts of routes and models. I treated the model as a machine that produces high-quality code and myself as the driver: it fills in the repetition; I keep the architecture honest. Quote does not mutate inventory. Payment is simulated, but the state machine is real.

## Where it helped me move faster

The booking wizard, the demo page, and the repeated Prisma/API patterns. Generation cut the typing there, which is where I actually needed the hours: the compare-and-swap `UPDATE`, the TTL hold, and the transitions that must succeed only once.

## Where I rejected AI output

Assumed context. When Cursor or ChatGPT filled in a schema field, a product rule, or “you already decided X,” I stopped it and asked whether that assumption was valid. The UI is allowed to be stale. The database is not.

## What I would change next time

The split still feels right. Next time I would lock the inventory rule, hold TTL, and race cases in ChatGPT before Cursor generates large slices of UI and API, so fewer assumed-context corrections happen mid-stream.

## How I verified the implementation

Against Postgres, not against generated code.

- Vitest integration tests in `tests/integration/booking-concurrency.test.ts` and `tests/integration/quote-and-user.test.ts` (last seat, quantity, expire-once, pay-versus-expire, high concurrency), using `TEST_DATABASE_URL` or `DIRECT_URL`.
- The engineering demo at `/trial-booking/demo`: two parents racing the last seat, expiry, payment, cancel, and a high-concurrency run.
- A manual pass through the wizard: submit, hold, simulated pay.
