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

## Commands

- `npm run dev` · `npm test` · `npm run test:e2e` · `npm run lint` · `npm run typecheck` · `npm run build`
- `npm run db:migrate` · `npm run db:seed` (Prisma CLI finds root `.env` via `apps/api/prisma.config.ts`)
