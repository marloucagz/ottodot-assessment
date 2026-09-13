# Trial Class Booking

A parent-facing trial-class booking system that holds live seats correctly under concurrent demand. Two parents can submit for the last seat at the same instant; the database allows exactly one reservation, never a negative inventory, and the loser receives a clear `SLOT_UNAVAILABLE`.

**Time spent:** 4 hours 26 minutes.

Stack: Next.js 16 (App Router), Prisma 6, PostgreSQL (Supabase), Vitest.

---

## What I built

A full booking loop, not a mock of one:

- A **customer wizard** at `/trial-booking/book` (child → class → level → grade → subjects → review → simulated payment).
- An **engineering demo** at `/trial-booking/demo` that races two parents and asserts last-seat, expiry, payment, cancel, and high-concurrency outcomes.
- A **catalog and inventory model** in Postgres: learning method → level → grade → subject → USD price, plus slots with `capacity` / `available`, reservations, bookings, and payments.
- A **hold-then-pay** lifecycle: submit creates `PENDING_PAYMENT` + an `ACTIVE` reservation with a TTL; pay confirms the seat; expire or cancel releases it **once**.

The interesting part is not the form. It is that inventory is decided by a single conditional `UPDATE` inside a transaction, so correctness does not depend on who clicked first in the UI.

---

## How to run

### Prerequisites

- Node.js 20+
- npm
- A Supabase Postgres database (or any PostgreSQL 15+)

### 1. Install

```bash
npm install
```

`postinstall` runs `prisma generate --schema prisma`.

### 2. Environment

Copy `.env.example` to `.env` and fill in your project values. Do not commit `.env`.

```bash
cp .env.example .env
```

| Variable | Required | Purpose |
|---|---|---|
| `DIRECT_URL` | Yes (local) | Session-mode Postgres (`:5432`). Used by local Next.js, Prisma `$transaction`, and tests. |
| `DATABASE_URL` | Yes (prod) | Transaction pooler (`:6543`, `pgbouncer=true`) for serverless runtime. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key. |
| `RESERVATION_TTL_SECONDS` | No | Hold TTL in seconds. Defaults to `30` if unset. |
| `CRON_SECRET` | For expire/reconcile jobs | Bearer token for `/api/internal/*`. |
| `PAYMENT_WEBHOOK_SECRET` | For webhook simulate | Header `x-webhook-secret`. |
| `TEST_DATABASE_URL` | No | Dedicated test DB. Falls back to `DIRECT_URL` / `DATABASE_URL`. |
| `DEMO_ENABLED` / `DEMO_SECRET` | Production demo only | Demo seed/reset endpoints are open in development. |

In development the Prisma client prefers `DIRECT_URL`. Interactive transactions and last-seat `updateMany` concurrency need session mode, not the Supabase transaction pooler.

### 3. Migrate

Prisma schema is the whole `prisma/` directory (generator in `prisma/schema.prisma`, models in `prisma/models/`).

```bash
npx prisma migrate deploy --schema prisma
npm run prisma:generate
```

For local iteration with a migration prompt:

```bash
npm run prisma:migrate
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). `/` redirects to the seed page.

### 5. Seed demo data

Use either:

1. [http://localhost:3000/trial-booking/seed](http://localhost:3000/trial-booking/seed) → **Seed**
2. CLI: `npm run prisma:seed`

This creates two parents (`demo-parent-a@seed.local`, `demo-parent-b@seed.local`) and four trial slots (last seat, multi-child, happy path, expiration). Seed is guarded by a Postgres advisory lock.

| URL | Audience |
|---|---|
| `/trial-booking/seed` | Operator — seed / reset catalog |
| `/trial-booking/book` | Parent — booking wizard |
| `/trial-booking/payment/[bookingId]` | Parent — simulated payment |
| `/trial-booking/demo` | Reviewer — last-seat and other race scenarios |

```bash
npm test                 # Vitest integration tests (needs Postgres)
npm run prisma:studio
```

Tests require a reachable Postgres URL (`TEST_DATABASE_URL`, else `DIRECT_URL`, else `DATABASE_URL`).

---

## Assumptions

I treated this as a **concurrency problem first**, and an **application-layer problem second**.

If two requests read `available = 1` and then write, both can succeed. An in-memory lock would hide that on one Node process and fail the moment a second instance exists. The honest fix is at the database: one row, one conditional update, one winner.

Secondary assumptions I shipped with:

- A seat must be **held at submit**, not at payment. Otherwise two parents can both reach checkout for the last seat.
- The UI is allowed to be stale. The server is the source of truth.
- Currency is **USD only**; catalog edits after a booking must not rewrite history (snapshots on the student-booking lines).
- Payment is simulated. The state machine still has to survive duplicate webhooks and a pay-versus-expire race.

---

## Key architecture and backend decisions

**Inventory lives on the slot, holds live on the reservation.** `TrialClassSlot.available` exists so PostgreSQL can evaluate `available >= quantity` in one statement. `SlotReservation` is the audit of who holds those seats.

**Acquire is compare-and-swap, not read-then-write.** `POST /api/bookings` runs this inside a transaction that also writes the booking, reservation, and pending payment:

```sql
UPDATE "TrialClassSlot"
SET available = available - :quantity
WHERE id = :slotId
  AND active = true
  AND "cancelledAt" IS NULL
  AND "startsAt" > :now
  AND available >= :quantity;
```

Success is `rowcount = 1`. Zero rows maps to `SLOT_UNAVAILABLE` (or cancelled / already started). Rollback restores the seat if a later insert fails.

**Every dangerous transition uses the same rule.** Expire, confirm, and cancel all `UPDATE … WHERE status = ACTIVE`. If `rowcount ≠ 1`, another worker already won — inventory cannot be released twice, and payment cannot confirm an expired hold.

**Quote does not mutate inventory.** `POST /api/bookings/quote` prices the cart; only create decrements seats.

**Holds expire on a job**, not on a client timer: `POST /api/internal/jobs/expire-reservations` (Bearer `CRON_SECRET`). Local/dev uses session-mode `DIRECT_URL` because these writes need real interactive transactions.

---

## What I deliberately cut

With 4 hours 26 minutes, three things were left on the table on purpose:

- **UI polish.** The wizard and demo harness are readable and complete; they are not a designed product. Correctness of the last seat mattered more than visual craft.
- **Broader proof.** Integration tests cover the races I considered load-bearing (last seat, quantity-2, expire-once, pay-versus-expire, 20-way versus capacity 4). I did not build a long-running chaos suite or property-based generator around every catalog permutation.
- **Admin-configurable seeding.** Demo data is a fixed, lock-guarded dataset. There is no operator UI to invent arbitrary capacities, TTLs, or catalogs at runtime.

Those cuts kept the time on the failure mode the assessment actually asks about: two people, one seat, one winner.

---

## What I would monitor after release

I would not watch CPU first. I would watch **whether money and seats tell the same story**.

- A dashboard of **bookings created versus payments that actually settle** — pending holds, confirmed, expired, cancelled — so a stuck TTL job or a payment provider retry storm shows up as a shape, not a support ticket.
- **Inventory drift:** `available` versus `capacity − (ACTIVE + CONFIRMED quantity)`. The reconcile job already logs this; in production I would alert on it.
- **Race pressure in the wild:** `SLOT_UNAVAILABLE` rate on last-seat slots, time-to-expire, and pay-after-expire rejections. Those are the live versions of the demo scenarios.
- Periodic **stress on hot slots** (many waiters, small capacity) plus a habit of hunting new edge cases — webhook reordering, clock skew on TTL, capacity edits under load. The cases you have not named yet are the ones that ship.

---

## What I would do next

With more time I would spend it in this order:

1. **Harden the product surface** — a clearer parent workflow, better empty/error states, and a demo that still proves the race without looking like an engineering console.
2. **Keep breaking it.** A booking system that still fails in surprising ways is a system with room to grow. I would add more adversarial cases until the remaining failures are policy choices, not bugs: refunds, waitlists, capacity changes mid-hold, multi-slot carts.
3. **Operator tools** — configurable seed/scenarios, and the bookings-versus-payments view above, so the next incident is visible before a parent emails.

The last-seat primitive is in place. The next work is making the rest of the product as honest as that one `UPDATE`.
