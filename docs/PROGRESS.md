# Progress (handoff)

Started 2026-10-31 12:09. Elapsed after M2: 59 min (on schedule, plan had M2 ending at 1:10).
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

## M3 next: crowding + dispatch + auth

- `crowding`: `POST /reports` (rate limit 3/min per deviceId), CrowdAggregator (10 min window,
  half-life 5 min, baseline = demand × hour profile), `/crowding/heatmap` (~250 m cells),
  `/crowding/routes`.
- Bind the simulation port `ROUTE_CROWD_READER` (now `NoCrowdDataReader`) to crowding's query,
  via a `public-api.ts` export.
- `dispatch`: event `crowd.report.submitted` → CongestionRule (≥ 8 high reports and ≥ 60%, no
  PENDING) → Recommendation. Accept creates a ReserveDispatch and emits `dispatch.reserve.added`;
  call `PrismaReserveVehicleSource.invalidate()` on that event. Dismiss is also needed.
  Add `/operator/overview` and `/operator/recommendations`.
- `auth`: `POST /auth/login` (JWT, bcryptjs). Seed the operator from `OPERATOR_EMAIL` and
  `OPERATOR_PASSWORD`. Add `JWT_SECRET` to `env.schema.ts`.
- `PUT /operator/sim-clock` 🔒 (`AdjustableSimClock` exists in `common/sim-clock`).
- Realtime: `/stream/operator` 🔒 (`?token=`), reusing `periodicStream` and the event bus.
- `scripts/demo-surge.ts` (12 high reports on one route).
- Unit tests: CrowdAggregator, CongestionRule, SubmitCrowdReport, AcceptRecommendation.

Approved M3 packages: `@nestjs/event-emitter`, `@nestjs/jwt`, `@nestjs/passport`, `passport`,
`passport-jwt`, `@nestjs/throttler`, `bcryptjs`.

## Open items

- M5: the e2e tests must call `assertSeparateTestDatabase` (in `common/config/load-env.ts`) first.
- Root `README.md` is still UTF-16; rewrite it in M6.
- Cut order if M4 ends later than 3:00 elapsed: web Vitest → demo-clock slider → heatmap grid
  → operator SSE.

## Scripts

`npm run dev` · `npm test` · `npm run lint` · `npm run typecheck` · `npm run build`
`npm run db:migrate` · `npm run db:seed` · `npm run db:stats -w @smart-transit/api`
Test DB: `npm run prisma:migrate:test`, `db:seed:test`, `db:stats:test` (all with `-w @smart-transit/api`).
