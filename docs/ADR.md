# Architecture Decision Records

Short records of decisions that are not obvious from the code. Newest last.

## ADR-001 — Prisma 6.x instead of Prisma 7+

**Status:** accepted (2026-10-31)

**Context.** The plan says "latest stable". Prisma 7 changes the setup: driver adapters
(`@prisma/adapter-pg` + `pg`) are required, the new `prisma-client` generator writes TypeScript
into the source tree and has its own module-format options, and `.env` is no longer loaded
automatically. This is a 4-hour prototype on a borrowed Windows machine. Any friction with NestJS
(CommonJS) or Jest would come straight out of feature time.

**Decision.** Pin Prisma **6.19.3** (`prisma` + `@prisma/client`, exact versions) with the classic
`prisma-client-js` generator. Use `apps/api/prisma.config.ts` (supported in 6.x) to set the schema
path, migrations and seed command, and to load the root `.env`.

**Consequences.** A mature, well-documented path with no adapter setup. Upgrading later means
switching the generator, adding the pg adapter and updating `PrismaService`. Repositories hide
Prisma behind ports, so domain and application code are unaffected.

## ADR-002 — NestJS 11.x (CommonJS) instead of NestJS 12

**Status:** accepted (2026-10-31)

**Context.** NestJS 12 is published as ESM only (`"type": "module"`). Jest supports ESM only
experimentally, and ts-jest/esbuild-based runners need extra setup to emit decorator metadata,
which Nest DI depends on.

**Decision.** Pin NestJS **11.2.8** (`@nestjs/cli` 11.0.24, `@nestjs/swagger` 11.4.7) and compile
the API as CommonJS.

**Consequences.** Standard Nest + Jest + supertest setup with no ESM workarounds. NestJS 11 is still
maintained. Moving to 12 later is a module-format change, not an architecture change.

## ADR-003 — TypeScript 5.9.3

**Status:** accepted (2026-10-31)

**Context.** TypeScript 7 (native compiler) is the latest release, but `ts-jest` requires
`typescript <7`, `typescript-eslint` requires `<6.1`, and `@nestjs/cli` 11 bundles 5.9.3.

**Decision.** Pin **5.9.3** across the monorepo, so one compiler version is used everywhere.

## ADR-004 — Neon PostgreSQL, no local Docker

**Status:** accepted (see PLAN.md §0.1)

The development machine has no Docker and no admin rights. Development and e2e tests use Neon
(cloud PostgreSQL). The main and test databases come only from `DATABASE_URL` and
`DATABASE_URL_TEST`, and no database name is hardcoded. Use the **direct** (non-pooler) connection
strings, because `prisma migrate` can stall behind PgBouncer. Dockerfiles and `docker-compose.yml`
are still provided and target the same code unchanged, but they are not tested on this machine.

## ADR-005 — One `.env` at the repo root

**Status:** accepted (2026-10-31)

All workspaces read `<repo root>/.env`. `src/common/config/load-env.ts` finds the npm workspaces
root and loads the file without overriding variables that are already set, so real environment
variables (Docker, CI) take precedence. The same loader runs in `main.ts`, `prisma.config.ts`
(migrate/seed/studio launched from `apps/api`) and `prisma/seed.ts`. `PRISMA_TARGET=test` switches
`DATABASE_URL` to `DATABASE_URL_TEST`, so the same scripts can migrate and seed the test DB.

## ADR-006 — Seed repairs AYNA data defects instead of trusting it

**Status:** accepted (2026-10-31)

The AYNA export has defects that would corrupt ETAs, so `prisma/seed/build-seed-plan.ts` repairs
them and logs a warning for each case:

- **6 stops have `null` coordinates.** They are skipped, so the DB holds 3 450 stops, not 3 456.
  Routes keep their remaining stops.
- **7 routes have no stops** (110, 137, 200, 446, 150A, 539, 556). They are stored without
  directions. The API flags them with `hasStops: false`, so passengers cannot pick a route that has
  no ETA.
- **Lines with lat/lon swapped** (521 dir 2) are detected and fixed. **Degenerate lines**
  (531 dir 2) are dropped.
- **Lines that do not fit their stops** (550, 555, 557 dir 1) are replaced by a polyline through the
  stops. A line does not fit when the median stop-to-line distance is over 300 m.
- **6 directions have no line at all.** Their polyline is also built from the stops.

Stop distances along each line are projected monotonically, so loop routes do not jump backwards.
Unit tests check every real direction against these rules.
