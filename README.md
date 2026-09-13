# Trial Class Booking

Concurrency-safe trial-class booking for parents reserving live seats for their children. Inventory is acquired with a conditional PostgreSQL update so a last-seat race produces exactly one success.

Stack: Next.js 16 (App Router), Prisma 6, PostgreSQL (Supabase), Vitest.

## Prerequisites

- Node.js 20+
- npm
- A Supabase Postgres database (or any PostgreSQL 15+)

## Setup

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

## App map

| URL | Audience |
|---|---|
| `/trial-booking/seed` | Operator — seed / reset catalog |
| `/trial-booking/book` | Parent — booking wizard |
| `/trial-booking/payment/[bookingId]` | Parent — simulated payment |
| `/trial-booking/demo` | Reviewer — last-seat and other race scenarios |

## Scripts

```bash
npm run dev              # Next.js dev server
npm run build            # Production build
npm run start            # Serve production build
npm run lint
npm run typecheck
npm test                 # Vitest integration tests (needs Postgres)
npm run test:watch
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
npm run prisma:seed
```

Tests require a reachable Postgres URL (`TEST_DATABASE_URL`, else `DIRECT_URL`, else `DATABASE_URL`).

## Last-seat race (short)

`POST /api/bookings` acquires seats inside a transaction with:

```sql
UPDATE "TrialClassSlot"
SET available = available - :quantity
WHERE id = :slotId
  AND active = true
  AND "cancelledAt" IS NULL
  AND "startsAt" > :now
  AND available >= :quantity;
```

Success is `rowcount = 1`. The loser gets `409 SLOT_UNAVAILABLE`. Quote (`POST /api/bookings/quote`) does not change inventory. Holds expire via `POST /api/internal/jobs/expire-reservations` (Bearer `CRON_SECRET`).
