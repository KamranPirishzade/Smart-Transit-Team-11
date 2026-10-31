# smart-transit — rules for Claude Code

Monorepo (npm workspaces): `apps/api` (NestJS 11 + Prisma 6), `apps/web` (Next.js), `packages/*`.
Machine: Windows, no Docker. DB: Neon PostgreSQL, connection strings only in root `.env`.

## Backend layers (every module in `apps/api/src/modules/<name>/`)

- `domain/` — pure TypeScript. **No** imports from `@nestjs/*`, `@prisma/*`, or other modules. (ESLint enforces.)
- `application/` — use cases + ports (interfaces). Depends only on `domain` and its own ports.
- `infrastructure/` — Prisma repositories and other adapters implementing ports.
- `presentation/` — controllers, DTOs (Swagger decorators), SSE, event listeners. No business logic.
- `<name>.module.ts` — DI wiring: port token → adapter.
- Cross-module: writes/reactions via events (`common/events`); sync reads via a port in the consumer,
  bound in the module to a provider the other module exports. Never import another module's internals.

## Conventions

- Files kebab-case, classes PascalCase. Tests next to code: `*.spec.ts`; e2e in `apps/api/test`.
- Every use case and domain service has a unit test (in-memory fakes, no DB).
- UI text in Azerbaijani; code, identifiers and logs in English.
- Scripts must be cross-platform: Node/TS via `tsx`, `cross-env`, `rimraf`, `path.join`. No bash-isms.
- Exact versions (`--save-exact`). **Ask before adding a new dependency.**
- Database names are never hardcoded — read from `DATABASE_URL` / `DATABASE_URL_TEST`.

## Domain rules (source of truth for the modules)

- **Simulation:** vehicle position is a pure function `position(route, direction, vehicleIndex, now)`
  (headway, phase from a route-id hash, speed); nothing is stored per tick. Headway comes from BakuBus
  demand (default if missing). Peak 07:30–09:30 and 17:30–19:30: shorter headway, speed ×0.7.
  Reserve buses (`ReserveDispatch`) join their route as extra vehicles. `SimClock` port: real time
  by default, operator can set a demo time.
- **SSE:** every 2 s, filtered by `?routeId=` or `?bbox=` (max 800 vehicles). Operator stream takes
  `?token=`.
- **Crowd levels:** EMPTY 0 · MODERATE 1 · CROWDED 2 · FULL 3. Baseline = route demand × hour profile.
  Reports from the last 10 min override it (time-weighted, half-life 5 min). Heatmap: ~250 m cells.
- **Congestion rule:** last 10 min, same route: CROWDED+FULL reports ≥ 8 **and** ≥ 60% of all reports
  **and** no PENDING recommendation for that route. Statuses: PENDING → ACCEPTED | DISMISSED.
  Accept creates a `ReserveDispatch`.
- **Routes without stops** are returned with `hasStops: false`, so passengers cannot pick them.
- **Rate limit:** `POST /reports`, 3 per minute per `deviceId`.
- **Errors:** `{ statusCode, error, message, path, timestamp }`. Swagger at `/api/docs`, Bearer auth.
- **Honesty:** vehicle positions, ETAs and baseline crowding are simulated. Stops, routes, lines and
  demand are real (AYNA public map service, opendata.az).

## Commands

- `npm run dev` · `npm test` · `npm run test:e2e` · `npm run lint` · `npm run typecheck` · `npm run build`
- `npm run db:migrate` · `npm run db:seed` (Prisma CLI finds root `.env` via `apps/api/prisma.config.ts`)
