import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';

/** Walks up from `startDir` to the npm workspaces root (package.json with "workspaces"). */
export function findWorkspaceRoot(startDir: string = __dirname): string | undefined {
  let dir = path.resolve(startDir);
  for (;;) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { workspaces?: unknown };
      if (pkg.workspaces) return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/**
 * Loads `<repo root>/.env` into process.env without overriding variables that are already set
 * (so real environment variables, e.g. in Docker, win). Missing file is not an error.
 */
export function loadRootEnv(startDir?: string): void {
  const root = findWorkspaceRoot(startDir);
  if (!root) return;
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return;
  const parsed = parseEnv(fs.readFileSync(envPath, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined && value !== undefined) process.env[key] = value;
  }
}

/** `PRISMA_TARGET=test` points DATABASE_URL at DATABASE_URL_TEST (migrate/seed/e2e against the test DB). */
export function selectDatabaseUrl(target: string | undefined = process.env.PRISMA_TARGET): void {
  if (target !== 'test') return;
  // Already switched in a parent process (e.g. prisma.config.ts → seed child): inherited env is fine.
  if (process.env[SWITCHED_MARKER] === 'test') return;
  assertSeparateTestDatabase(process.env.DATABASE_URL, process.env.DATABASE_URL_TEST);
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  process.env[SWITCHED_MARKER] = 'test';
}

const SWITCHED_MARKER = 'SMART_TRANSIT_DB_TARGET';

/** host:port/database — ignores credentials and query parameters. */
function databaseIdentity(url: string): string {
  const parsed = new URL(url);
  return `${parsed.host}${parsed.pathname}`.toLowerCase();
}

/**
 * Guard for anything destructive against the test DB (seed, e2e cleanup): the test URL must exist and
 * must not point at the same database as DATABASE_URL. The main database is never touched by tests.
 */
export function assertSeparateTestDatabase(
  mainUrl: string | undefined,
  testUrl: string | undefined,
): void {
  if (!testUrl)
    throw new Error('DATABASE_URL_TEST is not set in .env — refusing to use the test database');
  if (mainUrl && databaseIdentity(mainUrl) === databaseIdentity(testUrl)) {
    throw new Error(
      'DATABASE_URL_TEST points at the same database as DATABASE_URL — refusing to continue',
    );
  }
}
