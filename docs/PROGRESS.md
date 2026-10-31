# Progress (handoff)

Started 2026-10-31 12:09. Elapsed after M2: 59 min (on schedule, plan had M2 ending at 1:10).
M3 done (13:23, 1 h 14 min elapsed); M4 (web) is next.
Last commit before this file: `2fd8cdb`.

## M1: skeleton, DB, seed ✅ (31 min)

- npm workspaces: `apps/api` (NestJS 11), `apps/web` (Next 16), `packages/config`.
- Prisma 6.19.3, init migration applied to both Neon DBs (main and test).
- Seed counts (idempotent, 2nd run identical, 65.6 s): 208 routes, 402 directions, 3 450 stops
  (6 source stops have null coords), 11 779 route stops. Test DB: route 49 only.

## M2: network + simulation ✅ (14 min)

- Endpoints: `/routes`, `/routes/:id`, `/stops/nearby`, `/stops/:id`, `/stops/:id/arrivals`,
  `/vehicles`, SSE `/stream/vehicles` (2 s). The 7 routes without stops return `hasStops: false`.
- 108 unit tests. Domain coverage: statements 99.5%, branches 88.9%, functions 100%, lines 100%.
- Live check on Neon: 1 876 buses citywide (`truncated` above 800), first ETA 175 ms after warm-up.

## Key decisions

- Prisma 6, NestJS 11 (CommonJS), TypeScript 5.9.3: ADR-001/002/003.
- One root `.env`; `PRISMA_TARGET=test`, which refuses to run if the test URL is the main DB: ADR-005.
- Seed repairs AYNA defects (null coords, swapped lat/lon, lines that do not fit their stops): ADR-006.
- Speed = direction length / `durationMin` (10–30 km/h): ADR-007.
- Headway from demand, clamped to 4–20 min; 15 min when there is no data: ADR-007.
- Peak 07:30–09:30 and 17:30–19:30: headway ×0.7, speed ×0.7: ADR-007.
- Module boundaries through `public-api.ts`, enforced by ESLint: ADR-008.
- Commits: Conventional Commits, one logical change per commit (see CLAUDE.md).

## M3: crowding + dispatch + auth ✅ (~15 min)

- `POST /reports` (DTO validation, 3/min per `deviceId` via `@nestjs/throttler`) → `crowd.report.submitted`.
- Crowding: aggregator (10 min window, half-life 5 min, baseline = demand × hour profile),
  `/crowding/heatmap` (~250 m cells), `/crowding/routes`. Simulation's `ROUTE_CROWD_READER` now reads it.
- Dispatch: congestion rule (≥ 8 high, ≥ 60%, no PENDING) on every report; the DB partial unique index
  guards duplicates. Accept → `ReserveDispatch` → `dispatch.reserve.added` → `reserve-{id}` bus in the
  simulation (cache invalidated by the event). Dismiss, `/operator/overview`, `PUT /operator/sim-clock` 🔒.
- Auth: `POST /auth/login` (JWT + bcryptjs), `OperatorAuthGuard` (Bearer or `?token=`), operator seeded
  from `OPERATOR_EMAIL`/`OPERATOR_PASSWORD` (`db:seed`, or `npm run db:seed:operator -w @smart-transit/api`).
- Realtime: `/stream/operator` 🔒 (`?token=`): `overview` every 2 s + recommendation/reserve events.
- `npm run demo:surge -- --route 49` (AYNA route id 49 = bus number 64) → PENDING recommendation.
- 163 unit tests; domain coverage: statements 99.3%, branches 90.4%, functions 98.5%, lines 99.6%.
- Live check on Neon: surge → recommendation, accept → reserve bus on `/vehicles`, 2nd accept 409, 4th
  report from one device 429, no token 401, operator SSE delivers events.

## Key decisions (M3)

- `@nestjs/event-emitter` 3.0.1, `@nestjs/jwt` 11.0.2, `@nestjs/passport` 11.0.5: the v12 releases are
  ESM-only and break the CommonJS setup (ADR-002).
- Reports are stamped with the `SimClock` time, so a demo time shift keeps windows consistent.
- A reserve with no dominant direction in the reports goes in direction 1.
- Demo data from the live check (reports, one ACCEPTED recommendation, one active reserve) is still in the
  main DB; remove it before the real demo.

## Open items

- M5: the e2e tests must call `assertSeparateTestDatabase` (in `common/config/load-env.ts`) first.
- Root `README.md` is still UTF-16; rewrite it in M6.
- Cut order if M4 ends later than 3:00 elapsed: web Vitest → demo-clock slider → heatmap grid
  → operator SSE.

## Scripts

`npm run dev` · `npm test` · `npm run lint` · `npm run typecheck` · `npm run build`
`npm run db:migrate` · `npm run db:seed` · `npm run db:stats -w @smart-transit/api`
Test DB: `npm run prisma:migrate:test`, `db:seed:test`, `db:stats:test` (all with `-w @smart-transit/api`).
